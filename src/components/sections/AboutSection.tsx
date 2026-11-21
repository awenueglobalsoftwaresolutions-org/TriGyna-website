"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Leaf, HeartPulse, Users, ShieldCheck } from "lucide-react";
import TrustStatsStrip from "@/components/ui/TrustStatsStrip";

export interface AboutSectionProps {
  showStats?: boolean;
}

export default function AboutSection({ showStats = false }: AboutSectionProps = {}) {
  const benefits = [
    {
      title: "Holistic Care",
      desc: "Care for your body, mind and lifestyle together.",
      icon: Leaf,
    },
    {
      title: "Personalised Treatment",
      desc: "Plans designed around your unique health needs.",
      icon: HeartPulse,
    },
    {
      title: "Expert Guidance",
      desc: "Compassionate support from experienced professionals.",
      icon: Users,
    },
    {
      title: "Safe & Confidential",
      desc: "A comfortable and private environment for your care.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section
      id="about"
      className="relative py-14 sm:py-20 lg:py-24 xl:py-28 bg-[#F9F7F1] border-b border-[#E8E2D6] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[48%_52%] xl:grid-cols-[47%_53%] gap-10 lg:gap-8 xl:gap-14 items-center">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Narrative Copy, Benefits & CTAs               */}
          {/* ========================================================= */}
          <div className="w-full space-y-6 sm:space-y-7">
            {/* Eyebrow Label with Muted Gold Accent Line */}
            <div className="inline-flex items-center gap-3">
              <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#154734]">
                ABOUT TRIGYNA
              </span>
            </div>

            {/* Main Heading: User Requested "Beyond Healthcare, Towards Better Living." */}
            <h2 className="font-serif text-3xl xs:text-4xl sm:text-[44px] md:text-5xl lg:text-[48px] xl:text-[56px] 2xl:text-[62px] font-bold text-[#154734] leading-[1.12] tracking-[-0.015em]">
              A More Personal <br /> Kind of Care.
            </h2>

            {/* Supporting Paragraph */}
            <p className="text-base sm:text-[17px] text-[#626B63] leading-[1.65] max-w-xl">
              At TriGyna, we believe better health begins with understanding
              you. Through personalised care, holistic wellness, and
              compassionate guidance, we support women and men in making
              informed choices for a healthier, more balanced life.{" "}
            </p>

            {/* Four Care Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 xl:gap-x-7 gap-y-5 sm:gap-y-6 pt-1 sm:pt-2">
              {benefits.map((benefit, idx) => {
                const Icon = benefit.icon;
                return (
                  <div key={idx} className="flex items-start gap-3.5 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#EBF0E6] flex items-center justify-center shrink-0 text-[#154734]">
                      <Icon
                        className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                        strokeWidth={1.8}
                      />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-[17px] sm:text-[18px] text-[#154734] leading-snug">
                        {benefit.title}
                      </h3>
                      <p className="text-[13px] sm:text-[13.5px] text-[#626B63] leading-[1.45] mt-1">
                        {benefit.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-5 pt-2 sm:pt-4">
              <Link
                href="/about"
                className="h-12 sm:h-[50px] px-7 sm:px-8 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-sm sm:text-[15px] font-semibold transition-all inline-flex items-center justify-center gap-2.5 active:scale-98 group shadow-sm hover:shadow"
              >
                <span>Explore Our Story</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/doctor"
                className="h-12 sm:h-[50px] px-7 sm:px-8 rounded-full border border-[#154734] bg-transparent hover:bg-[#154734] text-[#154734] hover:text-white text-sm sm:text-[15px] font-semibold transition-all inline-flex items-center justify-center active:scale-98"
              >
                <span>Meet Our Team</span>
              </Link>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Composite Artwork Collage & Backdrop         */}
          {/* ========================================================= */}
          <div className="w-full flex justify-center lg:justify-end mt-4 lg:mt-0">
            <div className="relative w-full max-w-[560px] sm:max-w-[600px] lg:max-w-none xl:max-w-[630px] 2xl:max-w-[670px] aspect-[1374/1145]">
              {/* Organic Sage Backdrop & Delicate Gold Accent Arc */}
              <div
                className="absolute inset-0 pointer-events-none select-none z-0"
                aria-hidden="true"
              >
                {/* Soft Sage Organic Curved Backdrop */}
                <div className="absolute right-[1%] top-[5%] w-[72%] h-[90%] bg-[#EAF0E5]/80 rounded-[46%_54%_48%_52%/52%_46%_54%_48%]" />

                {/* Gold Accent Arc along Top-Right Perimeter */}
              </div>

              {/* Transparent PNG Collage */}
              <div className="relative w-full h-full z-10">
                <Image
                  src="/images/about/about-artwork.webp"
                  alt="TriGyna Healthcare — Reception and Doctors"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, (max-width: 1280px) 540px, 670px"
                  className="object-contain drop-shadow-[0_10px_25px_rgba(21,71,52,0.04)]"
                  priority={false}
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Trust Statistics Strip */}
      {showStats && (
        <div className="mt-12 sm:mt-16">
          <TrustStatsStrip />
        </div>
      )}
    </section>
  );
}
