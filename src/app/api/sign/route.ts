import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signatureSchema } from "@/lib/validators";

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

    // FAST PATH: Just insert into the queue table and return immediately.
    // No duplicate checks here — the worker handles that when processing.
    // This makes the API as fast as possible under high load.
    await db.pendingSignature.create({
      data: {
        firstName,
        lastName,
        nationalCode,
        mobile,
        status: "PENDING",
      },
    });

    // Return 202 Accepted — request is queued, worker will process it
    return NextResponse.json(
      { message: "درخواست شما در صف پردازش قرار گرفت", queued: true },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error queueing signature:", error);
    return NextResponse.json(
      { message: "خطایی در سرور رخ داده است. لطفاً دوباره تلاش کنید" },
      { status: 500 }
    );
  }
}
