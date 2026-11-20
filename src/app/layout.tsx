import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { EnquiryModalProvider } from "@/components/context/EnquiryModalContext";
import { AuthProvider } from "@/lib/auth/authContext";
import { siteConfig } from "@/data/siteData";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  alternates: {
    canonical: siteConfig.siteUrl,
  },
  title: "TriGyna — Women | Health | Wellness",
  description:
    "Better Health for a Brighter Tomorrow. Personalised healthcare consultation and holistic wellness care for men and women — 100% online video consultations.",
  keywords: [
    "TriGyna",
    "women health",
    "online video consultation",
    "homoeopathy online",
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
      "Personalised consultation and holistic healthcare for men and women — 100% online video consultations.",
    url: siteConfig.siteUrl,
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
      "Personalised consultation and holistic healthcare for men and women — 100% online video consultations.",
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalBusiness",
        "@id": `${siteConfig.siteUrl}/#organization`,
        name: "TriGyna Healthcare & Wellness",
        url: siteConfig.siteUrl,
        logo: `${siteConfig.siteUrl}/images/brand/logo.png`,
        telephone: siteConfig.phone,
        email: siteConfig.email,
        description:
          "Personalised consultation and holistic healthcare for men and women — 100% online video consultations.",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Prayagraj",
          addressRegion: "Uttar Pradesh",
          postalCode: "211012",
          addressCountry: "IN",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.siteUrl}/#website`,
        url: siteConfig.siteUrl,
        name: "TriGyna",
        publisher: {
          "@id": `${siteConfig.siteUrl}/#organization`,
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#F9F7F1] text-[#17221D] selection:bg-[#A7C089] selection:text-[#0E3828]">
        <AuthProvider>
          <EnquiryModalProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </EnquiryModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
