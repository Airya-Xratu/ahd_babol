import { NextResponse } from "next/server";
import { signatureQueue } from "@/lib/queue";
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

    // FAST PATH: Add job to BullMQ queue (Redis only — no DB write)
    // This is even faster than the old DB insert since Redis is in-memory
    await signatureQueue.add("sign", {
      firstName,
      lastName,
      nationalCode,
      mobile,
    });

    // Return 202 Accepted — request is queued, worker will process it
    return NextResponse.json(
      { message: "درخواست شما در صف پردازش قرار گرفت", queued: true },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error queueing signature:", error);

    // If Redis is unavailable, return a specific error
    const errorMessage =
      error && typeof error === "object" && "code" in error &&
      (error as { code: string }).code === "ECONNREFUSED"
        ? "سرویس صف موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید"
        : "خطایی در سرور رخ داده است. لطفاً دوباره تلاش کنید";

    return NextResponse.json(
      { message: errorMessage },
      { status: 503 }
    );
  }
}
