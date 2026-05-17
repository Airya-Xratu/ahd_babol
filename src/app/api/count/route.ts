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

    // Count confirmed signatures + pending ones (they are queued and will be processed)
    const [confirmed, pending] = await Promise.all([
      db.signature.count(),
      db.pendingSignature.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      }),
    ]);

    const total = confirmed + pending;

    // Store in cache with 10-second TTL
    cache.set(CACHE_KEYS.TOTAL_SIGNATURES, total, CACHE_TTL.SIGNATURE_COUNT);

    return NextResponse.json({
      count: total,
      confirmed,
      pending,
    });
  } catch (error) {
    console.error("Error fetching signature count:", error);
    return NextResponse.json(
      { message: "خطا در دریافت تعداد امضاها" },
      { status: 500 }
    );
  }
}
