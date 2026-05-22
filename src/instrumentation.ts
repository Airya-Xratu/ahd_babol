/**
 * Next.js Instrumentation — Starts the BullMQ worker on server startup
 *
 * This file replaces the standalone worker.ts / worker.Dockerfile setup.
 * Instead of deploying a separate Docker app, the worker runs inside
 * the Next.js server process.
 *
 * Benefits:
 * - No separate Docker app needed on Liara (saves money + deployment complexity)
 * - Worker starts automatically when the web app starts
 * - Shares the same Redis and Prisma connections
 * - No Docker Hub image pulling issues
 *
 * Next.js calls this function once when the server starts in production.
 */

export async function register() {
  // Only run on the server (not during build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { Worker } = await import("bullmq");
    type Job<T> = import("bullmq").Job<T>;
    const Redis = (await import("ioredis")).default;
    const { PrismaClient } = await import("@/generated/prisma");

    const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
    const DATABASE_URL = process.env.DATABASE_URL;
    const QUEUE_NAME = "signatures";
    const CONCURRENCY = 50;

    if (!DATABASE_URL) {
      console.error("[Worker] FATAL: DATABASE_URL is not set — worker not started");
      return;
    }

    // Prisma Client
    const prisma = new PrismaClient({ log: ["error"] });

    // Dedicated Redis connection for the worker
    const redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisConnection.on("error", (err) => {
      console.error("[Worker] Redis error:", err.message);
    });

    redisConnection.on("connect", () => {
      console.log("[Worker] Connected to Redis");
    });

    // Job type — nationalCode is now optional (nullable)
    interface SignatureJobData {
      firstName: string;
      lastName: string;
      nationalCode?: string | null;
      mobile: string;
    }

    // Job processor
    async function processSignatureJob(job: Job<SignatureJobData>): Promise<void> {
      const { firstName, lastName, nationalCode, mobile } = job.data;

      try {
        await prisma.signature.create({
          data: {
            firstName,
            lastName,
            nationalCode: nationalCode ?? null,
            mobile,
          },
        });
        console.log(`[Worker] ✓ Job ${job.id} — ${firstName} ${lastName} (${mobile})`);
      } catch (dbError: unknown) {
        // Silently ignore duplicate mobile (P2002 = unique constraint violation)
        if (
          dbError &&
          typeof dbError === "object" &&
          "code" in dbError &&
          (dbError as { code: string }).code === "P2002"
        ) {
          console.log(`[Worker] ⚠ Job ${job.id} — Duplicate mobile: ${mobile}`);
          return;
        }
        console.error(`[Worker] ✗ Job ${job.id} — Error:`, dbError);
        throw dbError;
      }
    }

    // Create worker
    const worker = new Worker<SignatureJobData>(QUEUE_NAME, processSignatureJob, {
      connection: redisConnection,
      concurrency: CONCURRENCY,
    });

    worker.on("failed", (job, err) => {
      console.error(`[Worker] ✗ Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
    });

    worker.on("error", (err) => {
      console.error("[Worker] Worker error:", err.message);
    });

    worker.on("stalled", (jobId) => {
      console.warn(`[Worker] ⚠ Job ${jobId} stalled — will be retried`);
    });

    console.log(`[Worker] 🚀 Worker ready — listening to queue "${QUEUE_NAME}" (concurrency: ${CONCURRENCY})`);
    console.log(`[Worker] Redis: ${REDIS_URL}`);
    console.log(`[Worker] Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`);
  }
}
