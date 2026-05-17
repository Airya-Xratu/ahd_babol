import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signatureSchema } from "@/lib/validators";
import { cache, CACHE_KEYS } from "@/lib/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const result = signatureSchema.safeParse(body);
    if (!result.success) {
      // Zod v4 uses .issues instead of .errors
      const issues = result.error.issues;
      const firstError = issues[0];
      // Map Zod error paths to Persian field names
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

    // Insert into database, handle duplicate nationalCode
    try {
      await db.signature.create({
        data: {
          firstName,
          lastName,
          nationalCode,
          mobile,
        },
      });

      // Invalidate cache after successful insert
      cache.delete(CACHE_KEYS.TOTAL_SIGNATURES);

      return NextResponse.json(
        { message: "امضای شما با موفقیت ثبت شد" },
        { status: 201 }
      );
    } catch (dbError: unknown) {
      // Check for unique constraint violation (duplicate nationalCode)
      if (
        dbError &&
        typeof dbError === "object" &&
        "code" in dbError &&
        (dbError as { code: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { message: "این کد ملی قبلاً ثبت شده است" },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error processing signature:", error);
    return NextResponse.json(
      { message: "خطایی در سرور رخ داده است. لطفاً دوباره تلاش کنید" },
      { status: 500 }
    );
  }
}
