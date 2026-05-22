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
  const [mobile, setMobile] = useState("");

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const SIGNATURE_DISPLAY_THRESHOLD = 5000;
  const showSignatureCount = signatureCount >= SIGNATURE_DISPLAY_THRESHOLD;

  // Fetch signature count
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/count");
      if (res.ok) {
        const data = await res.json();
        setSignatureCount(data.confirmed ?? data.count ?? 0);
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
          mobile,
        }),
      });

      const data = await res.json();

      if (res.status === 202 || res.ok) {
        setSubmitStatus("success");
        setFirstName("");
        setLastName("");
        setMobile("");
        setErrors({});
        // Refresh count from server after a short delay (worker needs time)
        setTimeout(fetchCount, 2000);
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
              src="/background.png"
              alt="پس‌زمینه بیعت‌نامه"
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
                بیعت با ولی امر مسلمین
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl text-white/80 text-center max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                بیعت‌نامه مردم شهرستان بابل با امام‌المسلمین، حضرت آیت‌الله حاج سید مجتبی حسینی خامنه‌ای
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
                  ورود و بیعت
                </Button>
              </motion.div>

              {showSignatureCount && (
                <motion.div
                  className="flex items-center gap-2 text-white/60 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.6 }}
                >
                  <Users className="h-4 w-4" />
                  <span>تاکنون {(signatureCount ?? 0).toLocaleString("fa-IR")} نفر بیعت کرده‌اند</span>
                </motion.div>
              )}
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
        {/* Header Image — no text overlay, image has its own text */}
        <header className="relative w-full h-48 md:h-64 overflow-hidden">
          <Image
            src="/header.png"
            alt="سربرگ بیعت‌نامه"
            fill
            className="object-cover"
            priority
          />
        </header>

        {/* Gradient Bar — always visible; counts hidden when < 5k */}
        <div className="bg-gradient-to-l from-emerald-600 to-teal-700 text-white py-3 px-6">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {showSignatureCount ? (
              <>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">
                    تعداد بیعت‌ها: {(signatureCount ?? 0).toLocaleString("fa-IR")}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                <span className="font-medium">
                  بیعت با ولی امر مسلمین
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Covenant Text */}
        <section className="max-w-4xl mx-auto w-full px-4 md:px-8 py-8 md:py-12">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <span className="h-8 w-1.5 bg-emerald-500 rounded-full" />
              متن بیعت‌نامه
            </h2>
            <div className="text-muted-foreground leading-9 text-sm md:text-base space-y-3">
              <p className="text-center text-foreground font-medium text-base md:text-lg mb-6">
                بسم‌الله‌الرحمن‌الرحیم
              </p>
              <p>
                🔹 خدای علیم و حکیم را شاکریم که نعمت خود را بر ملت ایران و مظلومان عالم تمام نمود.
              </p>
              <p>
                🔹 شهادت قائد امت و عزیز ملت، شهید صائم و قائم و تالی قرآنِ دهم رمضان، حضرت شهید و شاهد، آیت‌الله العظمی امام حاج سید علی خامنه‌ای(قدس‌الله نفسه‌الزکیه)، قلوب همه ما را جریحه‌دار نمود.
              </p>
              <p>
                🔹 گویا دوباره همچون عهد رسول (ص)، همگی یتیم و بی‌پناه و بی‌کس شدیم.
                بیت‌الاحزان دل‌های ما، غمی را تجربه نمود از جنس غم ارتحال نبوی و شهادت علوی.
              </p>
              <p>
                🔹 اما در دل لیلةالقدر، مژده ظفر و پیروزی رسید و مرهمی بر دل‌ها شد. مژده آمد که:
              </p>
              <p className="text-center text-foreground font-bold text-base md:text-lg py-2">
                &ldquo;بعد علی، مجتباست<br />
                وارث روح خداست&rdquo;
              </p>
              <p>
                🔹 ای خلف خامنه‌ای عزیز، امام سید مجتبی خامنه‌ای!<br />
                ما مردم دارالمؤمنین بابل، از بن دل و جان و با تمام وجود با شما بیعت می‌کنیم و پیمان می‌بندیم که:
              </p>
              <p className="text-center text-foreground font-bold text-base md:text-lg py-2">
                &ldquo;خونی که در رگ ماست<br />
                هدیه به رهبر ماست&rdquo;
              </p>
              <p>
                🔹 ای خون‌خواه رهبر شهید و ملت مظلوم و کودکان بی‌گناه!<br />
                تا زمانی که شما امر بفرمایید، عمارگونه در میدان هستیم.
              </p>
              <p>
                🔅 ای خامنه‌ای عزیز، ما با حضرتعالی به‌عنوان وصیّ امام شهید (رحمة الله) و نایب امام زمان (عَجّلَ الله تَعٰالیٰ فَرَجَه) تجدید بیعت می‌کنیم و تا بذل جان در راه اجرای فرامین شما ایستاده‌ایم و فریاد بر‌می‌آوریم:
              </p>
              <p className="text-center text-foreground font-bold text-base md:text-lg py-2">
                &ldquo;لبیک یا خامنه‌ای<br />
                لبیک یا حسین است&rdquo;
              </p>
              <p>
                🔹 و همچون سید مقاومت، شهید سید حسن نصرالله، در چهله‌ی دوم بعثت امّت، که پیش‌گویی رهبر شهیدمان است، می‌گوییم:
              </p>
              <p className="text-center text-foreground font-bold text-base md:text-lg py-2">
                &ldquo;ما تراکناک یابن‌الحسین&rdquo;
              </p>
              <div className="mt-8 pt-4 border-t border-border text-center space-y-1">
                <p className="text-foreground font-medium">
                  بعثت مردم شهرستان دارالمؤمنین بابل
                </p>
                <p className="text-muted-foreground">
                  بهار ۱۴۰۵
                </p>
              </div>
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
              فرم بیعت
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              اطلاعات خود را وارد کنید تا بیعت شما ثبت شود
            </p>

            {/* Status Messages */}
            {submitStatus === "success" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  <span className="font-medium">درخواست شما دریافت شد و در صف پردازش قرار گرفت.</span>
                  <p className="text-xs mt-1 text-emerald-600">بیعت شما پس از تأیید، به شمارنده اضافه خواهد شد.</p>
                </div>
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
              </div>

              {/* Mobile — full width row */}
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    در حال ارسال...
                  </>
                ) : (
                  <>
                    <PenLine className="ml-2 h-5 w-5" />
                    ثبت بیعت
                  </>
                )}
              </Button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto bg-muted/50 border-t border-border py-6 text-center">
          <p className="text-muted-foreground text-sm">
            پلتفرم بیعت‌نامه بابل | تمامی حقوق محفوظ است
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
            aria-label="رفتن به فرم بیعت"
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
