/**
 * BullMQ Worker — Background processor for the Covenant Signing Platform
 *
 * Flow:
 *   API → BullMQ Queue (Redis) → This Worker → PostgreSQL (Signature table)
 *
 * Run:  npx tsx worker.ts
 */

import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

// ─── Configuration ───────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DATABASE_URL = process.env.DATABASE_URL;
const QUEUE_NAME = "signatures";
const CONCURRENCY = 50; // Max concurrent jobs processed

if (!DATABASE_URL) {
  console.error("[Worker] FATAL: DATABASE_URL environment variable is not set");
  process.exit(1);
}

// ─── Prisma Client ───────────────────────────────────────────────────────────
const prisma = new PrismaClient({
  log: ["error"],
});

// ─── Redis Connection (dedicated for the worker) ─────────────────────────────
const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Required by BullMQ
});

redisConnection.on("error", (err) => {
  console.error("[Worker] Redis connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("[Worker] Connected to Redis");
});

// ─── Job Processor ───────────────────────────────────────────────────────────
interface SignatureJobData {
  firstName: string;
  lastName: string;
  nationalCode?: string | null;
  mobile: string;
}

async function processSignatureJob(job: Job<SignatureJobData>): Promise<void> {
  const { firstName, lastName, nationalCode, mobile } = job.data;

  try {
    // Insert into confirmed Signature table
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

    // Other errors — throw to trigger BullMQ retry
    console.error(`[Worker] ✗ Job ${job.id} — Error:`, dbError);
    throw dbError;
  }
}

// ─── Create Worker ───────────────────────────────────────────────────────────
const worker = new Worker<SignatureJobData>(QUEUE_NAME, processSignatureJob, {
  connection: redisConnection,
  concurrency: CONCURRENCY,
});

// ─── Worker Events ───────────────────────────────────────────────────────────
worker.on("failed", (job, err) => {
  console.error(`[Worker] ✗ Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err.message);
});

worker.on("stalled", (jobId) => {
  console.warn(`[Worker] ⚠ Job ${jobId} stalled — will be retried`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n[Worker] Received ${signal}, shutting down gracefully...`);

  await worker.close();
  await prisma.$disconnect();
  redisConnection.disconnect();

  console.log("[Worker] Shutdown complete");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ─── Ready ───────────────────────────────────────────────────────────────────
console.log(`[Worker] 🚀 Worker ready — listening to queue "${QUEUE_NAME}" (concurrency: ${CONCURRENCY})`);
console.log(`[Worker] Redis: ${REDIS_URL}`);
console.log(`[Worker] Database: ${DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}`);
