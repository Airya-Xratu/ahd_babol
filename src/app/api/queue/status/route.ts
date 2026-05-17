import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [pending, processing, completed, failed, confirmed] = await Promise.all([
      db.pendingSignature.count({ where: { status: "PENDING" } }),
      db.pendingSignature.count({ where: { status: "PROCESSING" } }),
      db.pendingSignature.count({ where: { status: "COMPLETED" } }),
      db.pendingSignature.count({ where: { status: "FAILED" } }),
      db.signature.count(),
    ]);

    return NextResponse.json({
      queue: {
        pending,
        processing,
        completed,
        failed,
      },
      confirmed,
      total: confirmed + pending + processing,
    });
  } catch (error) {
    console.error("Error fetching queue status:", error);
    return NextResponse.json(
      { message: "خطا در دریافت وضعیت صف" },
      { status: 500 }
    );
  }
}
