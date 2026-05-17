/**
 * Queue Worker — Background processor for the Covenant Signing Platform
 * 
 * This is the equivalent of a BullMQ worker. It:
 * 1. Polls the PendingSignature table for PENDING jobs
 * 2. Marks them as PROCESSING (prevents duplicate processing)
 * 3. Attempts to INSERT into the Signature (confirmed) table
 * 4. On success: marks COMPLETED
 * 5. On duplicate: marks FAILED with error message
 * 6. On other error: marks PENDING again for retry (up to 3 attempts)
 * 
 * Rate-limited batch processing protects the database from being overwhelmed.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
});

// ─── Configuration ───────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 500;       // How often to check for new jobs
const BATCH_SIZE = 50;              // Max jobs to process per batch
const PROCESSING_TIMEOUT_MS = 30000; // Jobs stuck in PROCESSING for >30s get retried
const MAX_RETRY_ATTEMPTS = 3;       // Max retries before marking as FAILED
const DELAY_BETWEEN_BATCHES_MS = 100; // Small delay between batches to let DB breathe
const PORT = 3003;                  // Port for health/status API

// ─── Stats ───────────────────────────────────────────────────────────────────
let stats = {
  processed: 0,
  succeeded: 0,
  failed: 0,
  duplicates: 0,
  startedAt: new Date(),
  lastProcessedAt: null as Date | null,
  currentBatchSize: 0,
};

// ─── Main Processing Loop ────────────────────────────────────────────────────
async function processBatch(): Promise<number> {
  // Step 1: Recover stuck PROCESSING jobs (timeout)
  await prisma.pendingSignature.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: new Date(Date.now() - PROCESSING_TIMEOUT_MS) },
    },
    data: { status: "PENDING" },
  });

  // Step 2: Fetch a batch of PENDING jobs
  const pendingJobs = await prisma.pendingSignature.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  if (pendingJobs.length === 0) return 0;

  stats.currentBatchSize = pendingJobs.length;

  // Step 3: Mark them as PROCESSING
  const jobIds = pendingJobs.map((j) => j.id);
  await prisma.pendingSignature.updateMany({
    where: { id: { in: jobIds } },
    data: { status: "PROCESSING" },
  });

  // Step 4: Process each job
  for (const job of pendingJobs) {
    try {
      // Try to insert into confirmed Signatures table
      await prisma.signature.create({
        data: {
          firstName: job.firstName,
          lastName: job.lastName,
          nationalCode: job.nationalCode,
          mobile: job.mobile,
        },
      });

      // Success — mark COMPLETED
      await prisma.pendingSignature.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });

      stats.succeeded++;
    } catch (dbError: unknown) {
      // Check for unique constraint violation (duplicate nationalCode)
      if (
        dbError &&
        typeof dbError === "object" &&
        "code" in dbError &&
        (dbError as { code: string }).code === "P2002"
      ) {
        // Duplicate — mark FAILED
        await prisma.pendingSignature.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMessage: "کد ملی تکراری — قبلاً ثبت شده",
            processedAt: new Date(),
          },
        });
        stats.duplicates++;
      } else {
        // Other error — retry or fail
        const currentRetryCount = job.retryCount;
        
        if (currentRetryCount < MAX_RETRY_ATTEMPTS) {
          // Retry — increment counter and set back to PENDING
          await prisma.pendingSignature.update({
            where: { id: job.id },
            data: {
              status: "PENDING",
              retryCount: currentRetryCount + 1,
            },
          });
          console.error(`[Worker] Retry ${currentRetryCount + 1}/${MAX_RETRY_ATTEMPTS} for job ${job.id}`);
        } else {
          // Max retries — mark FAILED
          await prisma.pendingSignature.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              errorMessage: `خطا پس از ${MAX_RETRY_ATTEMPTS} تلاش`,
              processedAt: new Date(),
            },
          });
          stats.failed++;
        }
      }
    }

    stats.processed++;
    stats.lastProcessedAt = new Date();
  }

  return pendingJobs.length;
}

// ─── Worker Loop ─────────────────────────────────────────────────────────────
async function startWorker() {
  console.log(`[Worker] Starting queue worker...`);
  console.log(`[Worker] Config: batch=${BATCH_SIZE}, poll=${POLL_INTERVAL_MS}ms, timeout=${PROCESSING_TIMEOUT_MS}ms`);

  while (true) {
    try {
      const processedCount = await processBatch();
      
      if (processedCount > 0) {
        console.log(`[Worker] Processed batch: ${processedCount} jobs | Total: ${stats.processed} (✓${stats.succeeded} ✗${stats.failed} dup:${stats.duplicates})`);
      }

      // If we processed a full batch, there might be more — process immediately with small delay
      if (processedCount >= BATCH_SIZE) {
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      } else {
        // No full batch — wait for the poll interval
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error("[Worker] Fatal error in processing loop:", error);
      await sleep(5000); // Wait longer on error before retrying
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Health/Status API ───────────────────────────────────────────────────────
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", uptime: Date.now() - stats.startedAt.getTime() });
    }

    if (url.pathname === "/stats") {
      const queueStats = await prisma.pendingSignature.groupBy({
        by: ["status"],
        _count: true,
      });

      const queueMap: Record<string, number> = {};
      for (const item of queueStats) {
        queueMap[item.status] = item._count;
      }

      const confirmedCount = await prisma.signature.count();

      return Response.json({
        worker: stats,
        queue: {
          pending: queueMap["PENDING"] || 0,
          processing: queueMap["PROCESSING"] || 0,
          completed: queueMap["COMPLETED"] || 0,
          failed: queueMap["FAILED"] || 0,
        },
        confirmed: confirmedCount,
        config: {
          batchSize: BATCH_SIZE,
          pollIntervalMs: POLL_INTERVAL_MS,
          processingTimeoutMs: PROCESSING_TIMEOUT_MS,
          maxRetries: MAX_RETRY_ATTEMPTS,
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`[Worker] Status API running on port ${PORT}`);

// Start the worker loop
startWorker();
