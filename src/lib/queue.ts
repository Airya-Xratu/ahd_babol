import { Queue } from "bullmq";
import { redis } from "./redis";

// Queue name constant
export const QUEUE_NAME = "signatures";

// BullMQ queue instance — used by API routes to add jobs
export const signatureQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for debugging
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
    },
  },
});
