import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/AIChatWidget";
import { DEALERSHIP } from "@/lib/dealership";
import { autoDealerSchema } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(DEALERSHIP.siteUrl),
  title: {
    default: "RydeTime Auto | Used Cars in Suffolk, VA — Serving Hampton Roads",
    template: "%s | RydeTime Auto",
  },
  description:
    "Honest used cars in Suffolk, VA. AI-powered search, no-pressure process, and financing for every credit situation. Serving Virginia Beach, Chesapeake, Norfolk, Portsmouth, and all of Hampton Roads.",
  openGraph: {
    siteName: DEALERSHIP.name,
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* AutoDealer JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(autoDealerSchema()) }}
        />
        {/*
          Analytics placeholders — wire up via env vars before launch:

          Google Analytics 4 (NEXT_PUBLIC_GA4_ID):
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`} strategy="afterInteractive" />

          Meta Pixel (NEXT_PUBLIC_META_PIXEL_ID):
          fbq('init', process.env.NEXT_PUBLIC_META_PIXEL_ID); fbq('track', 'PageView');

          Google Ads conversion (NEXT_PUBLIC_GOOGLE_ADS_ID):
          gtag('config', process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);
        */}
      </head>
      <body className="min-h-screen bg-background font-sans text-text-primary antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <AIChatWidget />
      </body>
    </html>
  );
}
