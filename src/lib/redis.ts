import Redis from "ioredis";

// Singleton Redis client — shared across API routes and worker
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Track Redis connection status
let redisConnected = false;

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
    retryStrategy(times) {
      // Retry with increasing delay, max 5 seconds between retries
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    lazyConnect: true, // Don't connect immediately — connect on first command
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Graceful error handling — suppress connection errors when Redis is unavailable
redis.on("error", () => {
  // Suppress noisy error logs — Redis may not be available in all environments
});

redis.on("connect", () => {
  redisConnected = true;
});

redis.on("ready", () => {
  redisConnected = true;
});

redis.on("close", () => {
  redisConnected = false;
});

// Helper to check if Redis is available
export function isRedisReady(): boolean {
  return redisConnected && redis.status === "ready";
}

// Safe Redis get with fallback
export async function safeRedisGet(key: string): Promise<string | null> {
  try {
    if (!isRedisReady()) return null;
    return await redis.get(key);
  } catch {
    return null;
  }
}

// Safe Redis set with fallback
export async function safeRedisSet(key: string, value: string, ...args: unknown[]): Promise<boolean> {
  try {
    if (!isRedisReady()) return false;
    // Handle EX argument properly
    if (args.length >= 2 && args[0] === "EX") {
      await redis.set(key, value, "EX", args[1] as number);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}
