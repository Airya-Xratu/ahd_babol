import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeRedisGet, safeRedisSet } from "@/lib/redis";

// Redis cache key and TTL
const CACHE_KEY = "covenant:signature_count";
const CACHE_TTL_SECONDS = 10; // 10 seconds

interface CountResult {
  confirmed: number;
}

export async function GET() {
  try {
    // Check Redis cache first (with safe fallback)
    const cached = await safeRedisGet(CACHE_KEY);
    if (cached) {
      const parsed: CountResult = JSON.parse(cached);
      return NextResponse.json({
        confirmed: parsed.confirmed,
        count: parsed.confirmed,
      });
    }

    // Cache miss or Redis unavailable — query PostgreSQL directly
    const confirmed = await db.signature.count();

    const result: CountResult = { confirmed };

    // Try to store in Redis (won't fail if Redis is down)
    await safeRedisSet(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);

    return NextResponse.json({
      confirmed,
      count: confirmed,
    });
  } catch (error) {
    console.error("Error fetching signature count:", error);
    return NextResponse.json(
      { message: "خطا در دریافت تعداد بیعت‌ها" },
      { status: 500 }
    );
  }
}
