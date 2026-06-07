/**
 * Worker — Polls PendingSignature table and processes jobs
 *
 * Uses setInterval to poll the queue table every 2 seconds.
 * Picks up PENDING jobs, moves them to PROCESSING, then:
 *   - Inserts into Signature table (upsert = silently ignores duplicates)
 *   - Marks job as COMPLETED
 *   - On error, marks as FAILED with retry logic
 *
 * Starts via instrumentation.ts on server startup.
 */

import { db } from "@/lib/db";

const POLL_INTERVAL_MS = 2_000; // 2 seconds
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startWorker() {
  if (pollTimer) return; // Already running

  console.log("[Worker] 🚀 Starting queue poller...");

  pollTimer = setInterval(async () => {
    try {
      await processBatch();
    } catch (err) {
      console.error("[Worker] Poll error:", err);
    }
  }, POLL_INTERVAL_MS);
}

export function stopWorker() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[Worker] Stopped.");
  }
}

async function processBatch() {
  // Pick up PENDING jobs (oldest first)
  const jobs = await db.pendingSignature.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  if (jobs.length === 0) return;

  // Mark them as PROCESSING to prevent other workers from picking them up
  const jobIds = jobs.map((j) => j.id);
  await db.pendingSignature.updateMany({
    where: { id: { in: jobIds }, status: "PENDING" },
    data: { status: "PROCESSING" },
  });

  // Process each job
  await Promise.allSettled(jobs.map((job) => processJob(job)));
}

async function processJob(job: {
  id: string;
  firstName: string;
  lastName: string;
  nationalCode: string;
  mobile: string;
  retryCount: number;
}) {
  try {
    // UPSERT: If nationalCode already exists, do nothing (silent ignore).
    // This is the most performant way — no SELECT needed, single query,
    // and the DB handles uniqueness via the @unique index.
    await db.signature.upsert({
      where: { nationalCode: job.nationalCode },
      update: {}, // No-op on duplicate — silently skip
      create: {
        firstName: job.firstName,
        lastName: job.lastName,
        nationalCode: job.nationalCode,
        mobile: job.mobile,
      },
    });

    // Mark as COMPLETED
    await db.pendingSignature.update({
      where: { id: job.id },
      data: { status: "COMPLETED", processedAt: new Date() },
    });
  } catch (error) {
    const retryCount = job.retryCount + 1;

    if (retryCount >= MAX_RETRIES) {
      // Max retries reached — mark as FAILED
      await db.pendingSignature.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          retryCount,
          errorMessage: error instanceof Error ? error.message : String(error),
          processedAt: new Date(),
        },
      });
      console.error(`[Worker] ✗ Job ${job.id} FAILED permanently:`, error);
    } else {
      // Retry — reset to PENDING
      await db.pendingSignature.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          retryCount,
        },
      });
      console.warn(`[Worker] ⚠ Job ${job.id} retry ${retryCount}/${MAX_RETRIES}`);
    }
  }
}
