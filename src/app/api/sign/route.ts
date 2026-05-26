import { NextResponse } from "next/server";
import { signatureQueue } from "@/lib/queue";
import { signatureSchema } from "@/lib/validators";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const result = signatureSchema.safeParse(body);
    if (!result.success) {
      const issues = result.error.issues;
      const firstError = issues[0];
      const fieldNames: Record<string, string> = {
        firstName: "نام",
        lastName: "نام خانوادگی",
        nationalCode: "کد ملی",
        mobile: "شماره موبایل",
      };
      const fieldName = fieldNames[firstError?.path?.[0]?.toString() ?? ""] || "فیلد";
      const message = firstError?.message
        ? `${fieldName}: ${firstError.message}`
        : "اطلاعات وارد شده معتبر نیست";
      return NextResponse.json(
        { message },
        { status: 400 }
      );
    }

    const { firstName, lastName, nationalCode, mobile } = result.data;

    // Try BullMQ queue first (fast path — Redis only, no DB write)
    try {
      await signatureQueue.add("sign", {
        firstName,
        lastName,
        nationalCode: nationalCode ?? null,
        mobile,
      });

      return NextResponse.json(
        { message: "درخواست شما در صف پردازش قرار گرفت", queued: true },
        { status: 202 }
      );
    } catch (queueError) {
      // Redis unavailable — FALLBACK: insert directly into PostgreSQL
      console.warn("[Sign] Redis unavailable, falling back to direct DB insert");

      try {
        await db.signature.create({
          data: {
            firstName,
            lastName,
            nationalCode: nationalCode ?? null,
            mobile,
          },
        });

        return NextResponse.json(
          { message: "درخواست شما ثبت شد", queued: false },
          { status: 202 }
        );
      } catch (dbError: unknown) {
        // Check for duplicate mobile (P2002)
        if (
          dbError &&
          typeof dbError === "object" &&
          "code" in dbError &&
          (dbError as { code: string }).code === "P2002"
        ) {
          // Duplicate — silently return success (don't reveal duplicates)
          return NextResponse.json(
            { message: "درخواست شما ثبت شد", queued: false },
            { status: 202 }
          );
        }
        throw dbError;
      }
    }
  } catch (error) {
    console.error("Error processing signature:", error);

    const errorMessage =
      error && typeof error === "object" && "code" in error &&
      (error as { code: string }).code === "ECONNREFUSED"
        ? "سرویس موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید"
        : "خطایی در سرور رخ داده است. لطفاً دوباره تلاش کنید";

    return NextResponse.json(
      { message: errorMessage },
      { status: 503 }
    );
  }
}
