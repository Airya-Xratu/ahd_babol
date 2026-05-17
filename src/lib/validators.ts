import { z } from "zod";

export const signatureSchema = z.object({
  firstName: z
    .string()
    .min(2, "نام باید حداقل ۲ کاراکتر باشد")
    .max(50, "نام نمی‌تواند بیشتر از ۵۰ کاراکتر باشد"),
  lastName: z
    .string()
    .min(2, "نام خانوادگی باید حداقل ۲ کاراکتر باشد")
    .max(50, "نام خانوادگی نمی‌تواند بیشتر از ۵۰ کاراکتر باشد"),
  nationalCode: z
    .string()
    .regex(/^\d{10}$/, "کد ملی باید دقیقاً ۱۰ رقم باشد"),
  mobile: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود"),
});

export type SignatureInput = z.infer<typeof signatureSchema>;
