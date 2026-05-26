import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const iranYekan = localFont({
  src: [
    {
      path: "../../public/fonts/IRANYekanXFaNum-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/IRANYekanXFaNum-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-iran-yekan",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://covenant.liara.run"),
  title: "بیعت با ولی امر مسلمین",
  description:
    "بیعت‌نامه مردم شهرستان بابل با امام‌المسلمین، حضرت آیت‌الله حاج سید مجتبی حسینی خامنه‌ای",
  keywords: ["بیعت", "ولی امر", "خامنه‌ای", "بابل", "petition"],

  /* ── Open Graph (Facebook, Telegram, Eita, Bale, etc.) ── */
  openGraph: {
    title: "بیعت با ولی امر مسلمین",
    description:
      "بیعت‌نامه مردم شهرستان بابل با امام‌المسلمین، حضرت آیت‌الله حاج سید مجتبی حسینی خامنه‌ای",
    type: "website",
    locale: "fa_IR",
    siteName: "بیعت‌نامه بابل",
    images: [
      {
        url: "/og-image.png",
        width: 1344,
        height: 768,
        alt: "بیعت با ولی امر مسلمین",
      },
    ],
  },

  /* ── Twitter Card ── */
  twitter: {
    card: "summary_large_image",
    title: "بیعت با ولی امر مسلمین",
    description:
      "بیعت‌نامه مردم شهرستان بابل با امام‌المسلمین، حضرت آیت‌الله حاج سید مجتبی حسینی خامنه‌ای",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Viewport: ensure proper scaling + zoom in in-app browsers (overrides Next.js default) */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
      </head>
      <body
        className={`${iranYekan.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
