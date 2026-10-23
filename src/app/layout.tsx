import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { EnquiryModalProvider } from "@/components/context/EnquiryModalContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trigyna.com"),
  title: "TriGyna — Women | Health | Wellness",
  description:
    "Better Health for a Brighter Tomorrow. Personalised healthcare consultation and holistic wellness care for men and women — online and in-clinic.",
  keywords: [
    "TriGyna",
    "women health",
    "wellness clinic",
    "homoeopathy",
    "PCOD PCOS treatment",
    "skin and hair care",
    "diet and nutrition",
    "general medicine consultation",
    "Dr. Harshali Sutar",
  ],
  authors: [{ name: "TriGyna Healthcare" }],
  openGraph: {
    title: "TriGyna — Women | Health | Wellness",
    description:
      "Personalised consultation and holistic healthcare for men and women — online and in-clinic.",
    url: "https://trigyna.com",
    siteName: "TriGyna Healthcare",
    images: [
      {
        url: "/images/hero/hero-couple.webp",
        width: 1200,
        height: 630,
        alt: "TriGyna Healthcare & Wellness",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TriGyna — Women | Health | Wellness",
    description:
      "Personalised consultation and holistic healthcare for men and women — online and in-clinic.",
    images: ["/images/hero/hero-couple.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "TriGyna",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#F9F7F1] text-[#17221D] selection:bg-[#A7C089] selection:text-[#0E3828]">
        <EnquiryModalProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </EnquiryModalProvider>
      </body>
    </html>
  );
}
