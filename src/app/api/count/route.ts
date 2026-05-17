import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  try {
    // Check cache first
    const cached = cache.get<number>(CACHE_KEYS.TOTAL_SIGNATURES);
    if (cached !== null) {
      return NextResponse.json({ count: cached });
    }

    // Query database
    const result = await db.signature.count();

    // Store in cache with 10-second TTL
    cache.set(CACHE_KEYS.TOTAL_SIGNATURES, result, CACHE_TTL.SIGNATURE_COUNT);

    return NextResponse.json({ count: result });
  } catch (error) {
    console.error("Error fetching signature count:", error);
    return NextResponse.json(
      { message: "خطا در دریافت تعداد امضاها" },
      { status: 500 }
    );
  }
}
