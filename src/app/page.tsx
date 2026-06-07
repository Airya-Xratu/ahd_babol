'use client'

import { useState, useEffect, useRef } from "react";
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
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

/* ── In-app browser detection ── */
function detectInAppBrowser(): { is: boolean; name: string } {
  if (typeof navigator === "undefined") return { is: false, name: "" };
  const ua = navigator.userAgent || "";
  const uaLower = ua.toLowerCase();

  const browsers: [RegExp, string][] = [
    [/telegram/i, "تلگرام"],
    [/eita/i, "ایتا"],
    [/bale/i, "بله"],
    [/gap/i, "گپ"],
    [/instagram/i, "اینستاگرام"],
    [/fbav|fban|fb_iab/i, "فیسبوک"],
    [/messenger/i, "مسنجر"],
    [/whatsapp/i, "واتساپ"],
    [/viber/i, "وایبر"],
  ];

  for (const [regex, name] of browsers) {
    if (regex.test(ua) || regex.test(uaLower)) {
      return { is: true, name };
    }
  }

  return { is: false, name: "" };
}

/* ── Old browser detection ── */
function detectOldBrowser(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // Test 1: CSS custom properties support (IE11, old Android)
    if (!window.CSS || !CSS.supports) return true;

    // Test 2: oklch color support (Chrome < 111, Safari < 15.4, Firefox < 113)
    if (!CSS.supports("color", "oklch(1 0 0)")) return true;

    // Test 3: Flexbox gap support (old Safari, old Chrome)
    if (!CSS.supports("gap", "8px")) return true;

    // Test 4: CSS grid support
    if (!CSS.supports("display", "grid")) return true;

    return false;
  } catch {
    // If CSS.supports itself fails, it's definitely an old browser
    return true;
  }
}

export default function Home() {
  const [showContent, setShowContent] = useState(false);
  const [signatureCount, setSignatureCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  // In-app browser detection
  const inAppBrowserRef = useRef<{ is: boolean; name: string }>({ is: false, name: "" });
  const [inAppBrowser, setInAppBrowser] = useState<{ is: boolean; name: string }>({ is: false, name: "" });
  const [linkCopied, setLinkCopied] = useState(false);

  // Old browser detection
  const [isOldBrowser, setIsOldBrowser] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const SIGNATURE_DISPLAY_THRESHOLD = 5000;
  const showSignatureCount = signatureCount >= SIGNATURE_DISPLAY_THRESHOLD;

  // Detect browser capabilities on mount + start polling
  useEffect(() => {
    // In-app browser detection
    const detected = detectInAppBrowser();
    inAppBrowserRef.current = detected;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: must detect UA after hydration
    if (detected.is) setInAppBrowser(detected);

    // Old browser detection — add legacy class to html
    const oldBrowser = detectOldBrowser();
    if (oldBrowser) {
      setIsOldBrowser(true);
      document.documentElement.classList.add("legacy");
      console.log("[Compat] Old browser detected — degraded mode enabled");
    }

    // Fetch initial signature count
    const fetchInitialCount = async () => {
      try {
        const res = await fetch("/api/count");
        if (res.ok) {
          const data = await res.json();
          setSignatureCount(data.confirmed ?? data.count ?? 0);
        }
      } catch {
        // Silently fail
      }
    };
    fetchInitialCount();

    // Poll for count updates
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/count");
        if (res.ok) {
          const data = await res.json();
          setSignatureCount(data.confirmed ?? data.count ?? 0);
        }
      } catch {
        // Silently fail
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to form
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Copy link to clipboard for in-app browser users
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
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
        setTimeout(async () => {
          try {
            const res = await fetch("/api/count");
            if (res.ok) {
              const data = await res.json();
              setSignatureCount(data.confirmed ?? data.count ?? 0);
            }
          } catch {
            // Silently fail
          }
        }, 2000);
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

  /* ── OLD BROWSER: Simplified render without framer-motion ── */
  if (isOldBrowser) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          color: "#1a1a1a",
        }}
      >
        {/* Old Browser Warning */}
        {inAppBrowser.is && (
          <div
            style={{
              background: "#f59e0b",
              color: "#fff",
              padding: "12px 16px",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            <p>
              شما در مرورگر داخلی {inAppBrowser.name} هستید. لطفاً لینک را کپی کرده و در مرورگر خود باز کنید.
            </p>
            <div style={{ marginTop: "8px", display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                onClick={copyLink}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {linkCopied ? "✓ کپی شد!" : "📋 کپی لینک"}
              </button>
              <a
                href={typeof window !== "undefined" ? window.location.href : "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#fff",
                  color: "#92400e",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                🔗 باز کردن در مرورگر
              </a>
            </div>
          </div>
        )}

        {/* Landing Screen */}
        {!showContent && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('/background.png') center/cover no-repeat",
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "24px",
                padding: "16px",
                textAlign: "center",
                maxWidth: "600px",
              }}
            >
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 5vw, 3rem)",
                  fontWeight: "bold",
                  color: "#ffffff",
                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  margin: 0,
                }}
              >
                بیعت با ولی امر مسلمین
              </h1>

              <p
                style={{
                  fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
                  color: "rgba(255,255,255,0.85)",
                  margin: 0,
                  lineHeight: 1.8,
                }}
              >
                بیعت‌نامه مردم شهرستان بابل با امام‌المسلمین، حضرت آیت‌الله حاج سید مجتبی حسینی خامنه‌ای
              </p>

              <button
                onClick={() => setShowContent(true)}
                style={{
                  background: "linear-gradient(to left, #10b981, #0d9488)",
                  color: "#ffffff",
                  border: "none",
                  padding: "20px 40px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  borderRadius: "16px",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
                  WebkitAppearance: "none" as never,
                  appearance: "none",
                }}
              >
                ✍️ ورود و بیعت
              </button>

              {showSignatureCount && (
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
                  👥 تاکنون {(signatureCount ?? 0).toLocaleString("fa-IR")} نفر بیعت کرده‌اند
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {showContent && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ width: "100%", height: "200px", overflow: "hidden" }}>
              <img
                src="/header.png"
                alt="سربرگ بیعت‌نامه"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Gradient Bar */}
            <div
              style={{
                background: "linear-gradient(to left, #047857, #0f766e)",
                color: "#fff",
                padding: "12px 24px",
              }}
            >
              <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: "bold" }}>
                  {showSignatureCount
                    ? `تعداد بیعت‌ها: ${(signatureCount ?? 0).toLocaleString("fa-IR")}`
                    : "بیعت با ولی امر مسلمین"}
                </span>
              </div>
            </div>

            {/* Covenant Text */}
            <section style={{ maxWidth: "800px", margin: "0 auto", width: "100%", padding: "32px 16px" }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "16px",
                  padding: "24px",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ height: "28px", width: "5px", background: "#10b981", borderRadius: "4px", display: "inline-block" }} />
                  متن بیعت‌نامه
                </h2>
                <div style={{ color: "#666", lineHeight: 2, fontSize: "0.9375rem" }}>
                  <p style={{ textAlign: "center", color: "#1a1a1a", fontWeight: "bold", fontSize: "1.1rem", marginBottom: "20px" }}>
                    بسم‌الله‌الرحمن‌الرحیم
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔹 خدای علیم و حکیم را شاکریم که نعمت خود را بر ملت ایران و مظلومان عالم تمام نمود.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔹 شهادت قائد امت و عزیز ملت، شهید صائم و قائم و تالی قرآنِ دهم رمضان، حضرت شهید و شاهد، آیت‌الله العظمی امام حاج سید علی خامنه‌ای(قدس‌الله نفسه‌الزکیه)، قلوب همه ما را جریحه‌دار نمود.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔹 گویا دوباره همچون عهد رسول (ص)، همگی یتیم و بی‌پناه و بی‌کس شدیم. بیت‌الاحزان دل‌های ما، غمی را تجربه نمود از جنس غم ارتحال نبوی و شهادت علوی.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔹 اما در دل لیلةالقدر، مژده ظفر و پیروزی رسید و مرهمی بر دل‌ها شد. مژده آمد که:
                  </p>
                  <p style={{ textAlign: "center", color: "#1a1a1a", fontWeight: "bold", fontSize: "1.1rem", padding: "8px 0" }}>
                    &ldquo;بعد علی، مجتباست<br />وارث روح خداست&rdquo;
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔹 ای خلف خامنه‌ای عزیز، امام سید مجتبی خامنه‌ای!<br />
                    ما مردم دارالمؤمنین بابل، از بن دل و جان و با تمام وجود با شما بیعت می‌کنیم و پیمان می‌بندیم که:
                  </p>
                  <p style={{ textAlign: "center", color: "#1a1a1a", fontWeight: "bold", fontSize: "1.1rem", padding: "8px 0" }}>
                    &ldquo;خونی که در رگ ماست<br />هدیه به رهبر ماست&rdquo;
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔹 ای خون‌خواه رهبر شهید و ملت مظلوم و کودکان بی‌گناه!<br />
                    تا زمانی که شما امر بفرمایید، عمارگونه در میدان هستیم.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔅 ای خامنه‌ای عزیز، ما با حضرتعالی به‌عنوان وصیّ امام شهید (رحمة الله) و نایب امام زمان (عَجّلَ الله تَعٰالیٰ فَرَجَه) تجدید بیعت می‌کنیم و تا بذل جان در راه اجرای فرامین شما ایستاده‌ایم و فریاد بر‌می‌آوریم:
                  </p>
                  <p style={{ textAlign: "center", color: "#1a1a1a", fontWeight: "bold", fontSize: "1.1rem", padding: "8px 0" }}>
                    &ldquo;لبیک یا خامنه‌ای<br />لبیک یا حسین است&rdquo;
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    🔹 و همچون سید مقاومت، شهید سید حسن نصرالله، در چهله‌ی دوم بعثت امّت، که پیش‌گویی رهبر شهیدمان است، می‌گوییم:
                  </p>
                  <p style={{ textAlign: "center", color: "#1a1a1a", fontWeight: "bold", fontSize: "1.1rem", padding: "8px 0" }}>
                    &ldquo;ما تراکناک یابن‌الحسین&rdquo;
                  </p>
                  <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e5e5e5", textAlign: "center" }}>
                    <p style={{ color: "#1a1a1a", fontWeight: "bold" }}>
                      بعثت مردم شهرستان دارالمؤمنین بابل
                    </p>
                    <p style={{ color: "#808080" }}>بهار ۱۴۰۵</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Form Section */}
            <section ref={formRef} style={{ maxWidth: "800px", margin: "0 auto", width: "100%", padding: "0 16px 48px" }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: "16px",
                  padding: "24px",
                }}
              >
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "8px" }}>
                  ✍️ فرم بیعت
                </h2>
                <p style={{ color: "#808080", fontSize: "14px", marginBottom: "24px" }}>
                  اطلاعات خود را وارد کنید تا بیعت شما ثبت شود
                </p>

                {/* Status Messages */}
                {submitStatus === "success" && (
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "12px",
                      borderRadius: "12px",
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      color: "#047857",
                    }}
                  >
                    ✅ درخواست شما دریافت شد و در صف پردازش قرار گرفت.
                    <p style={{ fontSize: "12px", marginTop: "4px", color: "#059669" }}>بیعت شما پس از تأیید، به شمارنده اضافه خواهد شد.</p>
                  </div>
                )}
                {submitStatus === "error" && (
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "12px",
                      borderRadius: "12px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                    }}
                  >
                    ⚠️ {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Name Row */}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 200px", marginBottom: "16px" }}>
                      <label htmlFor="firstName-legacy" style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px", color: "#333" }}>
                        نام
                      </label>
                      <input
                        id="firstName-legacy"
                        type="text"
                        placeholder="مثلاً: علی"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: "" }));
                        }}
                        disabled={isSubmitting}
                        style={{
                          border: errors.firstName ? "2px solid #dc2626" : "2px solid #999",
                          background: "#fff",
                          color: "#000",
                          padding: "10px 12px",
                          fontSize: "16px",
                          width: "100%",
                          borderRadius: "8px",
                          boxSizing: "border-box",
                          textAlign: "right",
                        }}
                      />
                      {errors.firstName && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px" }}>{errors.firstName}</p>}
                    </div>
                    <div style={{ flex: "1 1 200px", marginBottom: "16px" }}>
                      <label htmlFor="lastName-legacy" style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px", color: "#333" }}>
                        نام خانوادگی
                      </label>
                      <input
                        id="lastName-legacy"
                        type="text"
                        placeholder="مثلاً: محمدی"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: "" }));
                        }}
                        disabled={isSubmitting}
                        style={{
                          border: errors.lastName ? "2px solid #dc2626" : "2px solid #999",
                          background: "#fff",
                          color: "#000",
                          padding: "10px 12px",
                          fontSize: "16px",
                          width: "100%",
                          borderRadius: "8px",
                          boxSizing: "border-box",
                          textAlign: "right",
                        }}
                      />
                      {errors.lastName && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px" }}>{errors.lastName}</p>}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div style={{ marginBottom: "24px" }}>
                    <label htmlFor="mobile-legacy" style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px", color: "#333" }}>
                      شماره موبایل
                    </label>
                    <input
                      id="mobile-legacy"
                      type="tel"
                      placeholder="۰۹xxxxxxxxx"
                      maxLength={11}
                      value={mobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setMobile(val);
                        if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: "" }));
                      }}
                      disabled={isSubmitting}
                      style={{
                        border: errors.mobile ? "2px solid #dc2626" : "2px solid #999",
                        background: "#fff",
                        color: "#000",
                        padding: "10px 12px",
                        fontSize: "16px",
                        width: "100%",
                        borderRadius: "8px",
                        boxSizing: "border-box",
                        textAlign: "right",
                        letterSpacing: "2px",
                      }}
                    />
                    {errors.mobile && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "2px" }}>{errors.mobile}</p>}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      background: isSubmitting ? "#999" : "linear-gradient(to left, #10b981, #0d9488)",
                      color: "#fff",
                      border: "none",
                      padding: "18px 32px",
                      fontSize: "18px",
                      fontWeight: "bold",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      width: "100%",
                      borderRadius: "12px",
                      WebkitAppearance: "none",
                      appearance: "none",
                    }}
                  >
                    {isSubmitting ? "⏳ در حال ارسال..." : "✍️ ثبت بیعت"}
                  </button>
                </form>
              </div>
            </section>

            {/* Footer */}
            <footer
              style={{
                marginTop: "auto",
                background: "#f5f5f5",
                borderTop: "1px solid #e5e5e5",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#808080", fontSize: "14px", margin: 0 }}>
                پلتفرم بیعت‌نامه بابل | تمامی حقوق محفوظ است
              </p>
            </footer>
          </div>
        )}
      </div>
    );
  }

  /* ── MODERN BROWSER: Full-featured render with framer-motion ── */
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      {/* ── In-App Browser Banner ── */}
      {inAppBrowser.is && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white px-4 py-3 shadow-lg" dir="rtl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium">
              شما در مرورگر داخلی {inAppBrowser.name} هستید. برای تجربه بهتر و ثبت بیعت، لطفاً لینک را کپی کرده و در مرورگر خود باز کنید:
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    کپی شد!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    کپی لینک
                  </>
                )}
              </button>
              <a
                href={typeof window !== "undefined" ? window.location.href : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white text-amber-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors hover:bg-amber-50"
              >
                <ExternalLink className="h-4 w-4" />
                باز کردن در مرورگر
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Landing Screen ── */}
      {/* Uses CSS animations (not framer-motion initial) so content is visible even when JS fails */}
      <AnimatePresence>
        {!showContent && (
          <motion.div
            className={`fixed inset-0 z-50 flex items-center justify-center ${inAppBrowser.is ? "top-12" : ""}`}
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

            {/* Content — CSS animations work without JavaScript */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-4">
              <h1 className="animate-landing-title text-3xl md:text-5xl font-bold text-white text-center drop-shadow-2xl">
                بیعت با ولی امر مسلمین
              </h1>

              <p className="animate-landing-subtitle text-lg md:text-xl text-white/80 text-center max-w-lg">
                بیعت‌نامه مردم شهرستان بابل با امام‌المسلمین، حضرت آیت‌الله حاج سید مجتبی حسینی خامنه‌ای
              </p>

              <div className="animate-landing-button">
                <Button
                  onClick={() => setShowContent(true)}
                  className="pulse-glow relative px-10 py-7 text-lg font-bold rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-2xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <PenLine className="ml-2 h-6 w-6" />
                  ورود و بیعت
                </Button>
              </div>

              {showSignatureCount && (
                <div className="animate-landing-count flex items-center gap-2 text-white/60 text-sm">
                  <Users className="h-4 w-4" />
                  <span>تاکنون {(signatureCount ?? 0).toLocaleString("fa-IR")} نفر بیعت کرده‌اند</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <motion.div
        className={`flex-1 flex flex-col ${showContent ? "" : "opacity-0 pointer-events-none fixed"}`}
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Header Image */}
        <header className="relative w-full h-48 md:h-64 overflow-hidden">
          <Image
            src="/header.png"
            alt="سربرگ بیعت‌نامه"
            fill
            className="object-cover"
            priority
          />
        </header>

        {/* Gradient Bar */}
        <div className="bg-gradient-to-l from-emerald-600 to-teal-700 text-white py-3 px-6">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {showSignatureCount ? (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">
                  تعداد بیعت‌ها: {(signatureCount ?? 0).toLocaleString("fa-IR")}
                </span>
              </div>
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

      {/* Noscript fallback — visible when JavaScript is disabled */}
      <noscript>
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
            direction: "rtl",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
              برای استفاده از این سایت، لطفاً جاوااسکریپت را فعال کنید
            </h2>
            <p style={{ opacity: 0.8 }}>
              لطفاً این صفحه را در مرورگر خود (کروم، فایرفاکس و...) باز کنید
            </p>
          </div>
        </div>
      </noscript>
    </div>
  );
}
