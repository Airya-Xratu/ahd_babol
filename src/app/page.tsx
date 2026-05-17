'use client'

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PenLine,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function Home() {
  const [showContent, setShowContent] = useState(false);
  const [signatureCount, setSignatureCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [mobile, setMobile] = useState("");

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch signature count
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/count");
      if (res.ok) {
        const data = await res.json();
        setSignatureCount(data.count);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Scroll to form
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName || firstName.length < 2 || firstName.length > 50) {
      newErrors.firstName = "نام باید بین ۲ تا ۵۰ کاراکتر باشد";
    }
    if (!lastName || lastName.length < 2 || lastName.length > 50) {
      newErrors.lastName = "نام خانوادگی باید بین ۲ تا ۵۰ کاراکتر باشد";
    }
    if (!/^\d{10}$/.test(nationalCode)) {
      newErrors.nationalCode = "کد ملی باید دقیقاً ۱۰ رقم باشد";
    }
    if (!/^09\d{9}$/.test(mobile)) {
      newErrors.mobile = "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          nationalCode,
          mobile,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitStatus("success");
        setFirstName("");
        setLastName("");
        setNationalCode("");
        setMobile("");
        setErrors({});
        setSignatureCount((prev) => prev + 1);
        // Refresh count from server
        fetchCount();
      } else {
        setSubmitStatus("error");
        setErrorMessage(data.message || "خطایی رخ داده است");
      }
    } catch {
      setSubmitStatus("error");
      setErrorMessage("خطا در ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      {/* Landing Screen */}
      <AnimatePresence>
        {!showContent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* Background Image */}
            <Image
              src="/background.jpg"
              alt="پس‌زمینه عهدنامه"
              fill
              className="object-cover"
              priority
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-4">
              <motion.h1
                className="text-3xl md:text-5xl font-bold text-white text-center drop-shadow-2xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                عهدنامه همبستگی ملی
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl text-white/80 text-center max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                صدای خود را با امضا بلند کنید
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <Button
                  onClick={() => setShowContent(true)}
                  className="relative px-10 py-7 text-lg font-bold rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-2xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    animation: "pulse-glow 2s ease-in-out infinite",
                  }}
                >
                  <PenLine className="ml-2 h-6 w-6" />
                  ورود و امضا
                </Button>
              </motion.div>

              <motion.div
                className="flex items-center gap-2 text-white/60 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
              >
                <Users className="h-4 w-4" />
                <span>تاکنون {signatureCount.toLocaleString("fa-IR")} نفر امضا کرده‌اند</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        className={`flex-1 flex flex-col ${showContent ? "" : "opacity-0 pointer-events-none fixed"}`}
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Header Image */}
        <header className="relative w-full h-48 md:h-72 overflow-hidden">
          <Image
            src="/header.jpg"
            alt="سربرگ عهدنامه"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg">
              عهدنامه همبستگی ملی
            </h1>
            <p className="text-white/70 mt-2 text-sm md:text-base">
              با امضای خود، تغییر را آغاز کنید
            </p>
          </div>
        </header>

        {/* Signature Count Bar */}
        <div className="bg-gradient-to-l from-emerald-600 to-teal-700 text-white py-3 px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-medium">
                تعداد امضاها: {signatureCount.toLocaleString("fa-IR")}
              </span>
            </div>
            <span className="text-emerald-100 text-sm">
              به‌روزرسانی خودکار هر ۱۰ ثانیه
            </span>
          </div>
        </div>

        {/* Covenant Text */}
        <section className="max-w-4xl mx-auto w-full px-4 md:px-8 py-8 md:py-12">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <span className="h-8 w-1.5 bg-emerald-500 rounded-full" />
              متن عهدنامه
            </h2>
            <div className="text-muted-foreground leading-8 text-sm md:text-base space-y-4">
              <p>
                ما امضاکنندگان این عهدنامه، با آگاهی کامل از مسئولیت‌های فردی و جمعی خود، اعلام می‌کنیم که به اصول بنیادین حقوق بشر، آزادی‌های مشروع و کرامت انسانی پایبندیم.
              </p>
              <p>
                ما معتقدیم که هر فرد حق دارد در فضایی آزاد و امن زندگی کند، از فرصت‌های برابر بهره‌مند شود و بدون ترس از تبعیض یا سرکوب، نظر خود را بیان نماید.
              </p>
              <p>
                ما تعهد می‌دهیم که برای تحقق عدالت اجتماعی، برابری حقوق و حفظ محیط زیست تلاش کنیم و از هیچ کوششی برای ساختن جامعه‌ای بهتر و انسانی‌تر فروگذار نکنیم.
              </p>
              <p>
                با امضای این عهدنامه، صدای خود را به صدای هزاران نفر دیگر می‌پیوندیم و اعلام می‌کنیم که تغییر از ما آغاز می‌شود.
              </p>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section
          ref={formRef}
          className="max-w-4xl mx-auto w-full px-4 md:px-8 pb-12"
        >
          <div className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
              <PenLine className="h-6 w-6 text-emerald-500" />
              فرم امضا
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              اطلاعات خود را وارد کنید تا امضای شما ثبت شود
            </p>

            {/* Status Messages */}
            {submitStatus === "success" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>امضای شما با موفقیت ثبت شد. از مشارکت شما سپاسگزاریم!</span>
              </motion.div>
            )}

            {submitStatus === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">نام</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="مثلاً: علی"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName) {
                        setErrors((prev) => ({ ...prev, firstName: "" }));
                      }
                    }}
                    className={`text-right ${errors.firstName ? "border-destructive focus-visible:border-destructive" : ""}`}
                    disabled={isSubmitting}
                  />
                  {errors.firstName && (
                    <p className="text-destructive text-xs">{errors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">نام خانوادگی</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="مثلاً: محمدی"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errors.lastName) {
                        setErrors((prev) => ({ ...prev, lastName: "" }));
                      }
                    }}
                    className={`text-right ${errors.lastName ? "border-destructive focus-visible:border-destructive" : ""}`}
                    disabled={isSubmitting}
                  />
                  {errors.lastName && (
                    <p className="text-destructive text-xs">{errors.lastName}</p>
                  )}
                </div>

                {/* National Code */}
                <div className="space-y-2">
                  <Label htmlFor="nationalCode">کد ملی</Label>
                  <Input
                    id="nationalCode"
                    type="text"
                    inputMode="numeric"
                    placeholder="۱۰ رقم"
                    maxLength={10}
                    value={nationalCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNationalCode(val);
                      if (errors.nationalCode) {
                        setErrors((prev) => ({ ...prev, nationalCode: "" }));
                      }
                    }}
                    className={`text-right tracking-widest ${errors.nationalCode ? "border-destructive focus-visible:border-destructive" : ""}`}
                    disabled={isSubmitting}
                  />
                  {errors.nationalCode && (
                    <p className="text-destructive text-xs">{errors.nationalCode}</p>
                  )}
                </div>

                {/* Mobile */}
                <div className="space-y-2">
                  <Label htmlFor="mobile">شماره موبایل</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    inputMode="tel"
                    placeholder="۰۹xxxxxxxxx"
                    maxLength={11}
                    value={mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setMobile(val);
                      if (errors.mobile) {
                        setErrors((prev) => ({ ...prev, mobile: "" }));
                      }
                    }}
                    className={`text-right tracking-widest ${errors.mobile ? "border-destructive focus-visible:border-destructive" : ""}`}
                    disabled={isSubmitting}
                  />
                  {errors.mobile && (
                    <p className="text-destructive text-xs">{errors.mobile}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <PenLine className="ml-2 h-5 w-5" />
                    امضای عهدنامه
                  </>
                )}
              </Button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto bg-muted/50 border-t border-border py-6 text-center">
          <p className="text-muted-foreground text-sm">
            پلتفرم امضای عهدنامه | تمامی حقوق محفوظ است
          </p>
        </footer>
      </motion.div>

      {/* Floating Scroll Button */}
      <AnimatePresence>
        {showContent && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={scrollToForm}
            className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-bl from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
            aria-label="رفتن به فرم امضا"
          >
            <PenLine className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Pulse glow animation style */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), 0 0 80px rgba(16, 185, 129, 0.2);
          }
        }
      `}</style>
    </div>
  );
}
