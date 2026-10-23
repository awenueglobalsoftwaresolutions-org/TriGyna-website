"use client";

import React from "react";
import Image from "next/image";
import { siteConfig, trustStats } from "@/data/siteData";
import { useEnquiryModal } from "@/components/context/EnquiryModalContext";
import { getTrustStatIcon } from "@/components/ui/TrustStatsStrip";
import {
  CalendarDays,
  ArrowRight,
  UserRound,
  Stethoscope,
  Leaf,
  HeartPulse,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";

export default function HeroSection() {
  const { openEnquiryModal } = useEnquiryModal();

  // 4 Healthcare Feature Cards matching Reference Image
  const featureCards = [
    {
      title: "Personalised",
      desc: "Care tailored to your needs",
      icon: UserRound,
    },
    {
      title: "Expert",
      desc: "Guidance from experienced doctors",
      icon: Stethoscope,
    },
    {
      title: "Holistic",
      desc: "Health, nutrition and lifestyle support",
      icon: Leaf,
    },
    {
      title: "Compassionate",
      desc: "A friendly and supportive experience",
      icon: HeartPulse,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#FBF9F2] border-b border-[#E8E2D6]">
      {/* ========================================================= */}
      {/* 1. MOBILE & TABLET HERO (lg:hidden) — MATCHES REFERENCE IMAGE */}
      {/* ========================================================= */}
      <div className="lg:hidden relative pt-6 xs:pt-8 pb-6">
        {/* Top Right Decorative Botanical Leaves Accent */}
        <div className="absolute top-0 right-0 w-32 xs:w-40 sm:w-52 h-44 xs:h-52 sm:h-64 pointer-events-none select-none overflow-hidden z-0">
          <svg
            viewBox="0 0 170 210"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-contain object-top-right transform translate-x-2 -translate-y-1 opacity-90"
          >
            {/* Branch Stem */}
            <path
              d="M180 -10 C160 45, 125 110, 105 185"
              stroke="#5A7A50"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.45"
            />
            {/* Botanical Leaf Shapes with organic hues */}
            <path
              d="M155 12 C132 8, 104 22, 98 44 C116 50, 144 34, 155 12 Z"
              fill="#5A7A50"
              opacity="0.9"
            />
            <path
              d="M168 45 C146 40, 118 60, 115 84 C134 88, 160 70, 168 45 Z"
              fill="#6B8F5B"
              opacity="0.9"
            />
            <path
              d="M136 72 C114 74, 88 98, 90 122 C110 122, 132 98, 136 72 Z"
              fill="#426639"
              opacity="0.85"
            />
            <path
              d="M150 110 C130 116, 108 142, 114 166 C131 162, 147 136, 150 110 Z"
              fill="#5A7A50"
              opacity="0.9"
            />
            <path
              d="M120 138 C104 146, 82 172, 88 194 C106 190, 122 162, 120 138 Z"
              fill="#7EA36C"
              opacity="0.8"
            />
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-10 px-4 xs:px-5 sm:px-8 max-w-[540px] mx-auto flex flex-col gap-4 xs:gap-4.5">
          {/* Eyebrow with Muted Gold Dash */}
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] xs:text-[11.5px] sm:text-[12.5px] font-bold tracking-[0.12em] xs:tracking-[0.14em] uppercase text-[#5A7A50] leading-none">
              HOLISTIC HEALTHCARE FOR EVERY STAGE OF LIFE
            </span>
          </div>

          {/* Main Heading */}
          <div>
            <h1 className="font-serif text-[38px] xs:text-[44px] sm:text-[52px] font-bold text-[#104B39] leading-[1.05] tracking-tight">
              <span className="block">Better Health</span>
              <span className="block">for a Brighter</span>
              <span className="block">Tomorrow</span>
            </h1>
          </div>

          {/* Description */}
          <p className="text-[14px] xs:text-[15px] sm:text-base text-[#626B68] leading-[1.58]">
            Personalised healthcare and holistic wellness for women and men,
            with expert guidance, preventive care, and personalised support to
            help you live a healthier, happier life.
          </p>

          {/* CTA Buttons — Stacked Vertically, Touch-Friendly 52px */}
          <div className="flex flex-col gap-3 w-full pt-1">
            {/* Primary Button: Enquire Now */}
            <button
              onClick={() => openEnquiryModal()}
              className="w-full h-[50px] xs:h-[52px] rounded-full bg-[#104B39] hover:bg-[#0B3D2E] active:scale-[0.99] text-white font-bold text-[15px] xs:text-base shadow-[0_8px_20px_-6px_rgba(16,75,57,0.35)] transition-all flex items-center justify-center gap-2.5 px-6 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#104B39]/30"
            >
              <CalendarDays className="w-5 h-5 text-white flex-shrink-0" />
              <span>Enquire Now</span>
              <ArrowRight className="w-4 h-4 text-white flex-shrink-0 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Secondary Button: Talk on WhatsApp */}
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[50px] xs:h-[52px] rounded-full bg-[#FBF9F2] hover:bg-white active:scale-[0.99] text-[#104B39] font-bold text-[15px] xs:text-base border-1.5 border-[#104B39] shadow-sm transition-all flex items-center justify-center gap-2.5 px-6 group focus:outline-none focus:ring-2 focus:ring-[#104B39]/20"
            >
              <WhatsAppIcon className="w-5 h-5 text-[#104B39] flex-shrink-0" />
              <span>Talk on WhatsApp</span>
              <ArrowRight className="w-4 h-4 text-[#104B39] flex-shrink-0 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          {/* 4 Minimal Healthcare Feature Cards in 2-Column Grid */}
          <div className="grid grid-cols-2 gap-2.5 xs:gap-3 w-full pt-2">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-[#EEF5EA] border border-[#DFE9DA] rounded-2xl p-2.5 xs:p-3 sm:p-3.5 flex flex-col justify-start transition-all hover:bg-[#E5EFE0] shadow-xs"
                >
                  <div className="flex items-center gap-2 xs:gap-2.5 mb-1.5">
                    <div className="w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-[#DFEBD8] text-[#104B39] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-[#104B39]" />
                    </div>
                    <h3 className="text-[13px] xs:text-[14px] font-bold text-[#104B39] leading-tight">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-[10.5px] xs:text-[11.5px] text-[#626B63] leading-[1.35]">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Hero Couple Image Container with Natural Rounded Top */}
          <div className="relative mt-4 xs:mt-6 w-full">
            <div className="relative w-full aspect-[4/3] xs:aspect-[16/11] sm:aspect-[16/10] overflow-hidden rounded-t-[32px] sm:rounded-t-[40px] shadow-sm">
              <Image
                src="/images/hero/hero-couple.webp"
                alt="TriGyna Healthcare — Smiling couple celebrating wellness"
                fill
                priority
                className="object-cover object-[72%_32%] sm:object-[70%_25%]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 576px"
              />
              {/* Soft bottom edge gradient */}
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
            </div>

            {/* Floating Trust Statistics Card matching Reference Design */}
            <div className="relative z-10 -mt-6 xs:-mt-8 mx-1 xs:mx-2 sm:mx-4 bg-white rounded-2xl xs:rounded-3xl shadow-[0_8px_30px_rgba(16,75,57,0.08)] border border-[#E8E2D6] py-3 xs:py-3.5 sm:py-4 px-2 xs:px-3 sm:px-6">
              <div className="grid grid-cols-3 divide-x divide-[#E8E2D6] text-center">
                {trustStats.slice(0, 3).map((stat, idx) => {
                  const Icon = getTrustStatIcon(stat.icon);
                  const isStar = stat.icon === "star";

                  return (
                    <div
                      key={stat.id || idx}
                      className={`flex flex-col xs:flex-row items-center justify-center gap-1 xs:gap-2 px-1 ${
                        idx > 0 ? "pl-1.5 xs:pl-2.5" : ""
                      }`}
                    >
                      <div className="w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-[#EBF3E6] flex items-center justify-center text-[#104B39] flex-shrink-0">
                        <Icon
                          className={`w-3.5 h-3.5 xs:w-4 xs:h-4 text-[#104B39] ${
                            isStar ? "fill-[#104B39]" : ""
                          }`}
                        />
                      </div>
                      <div className="text-center xs:text-left">
                        <div className="text-[14px] xs:text-[16px] sm:text-[18px] font-bold text-[#104B39] leading-none">
                          {stat.value}
                        </div>
                        <div className="text-[9px] xs:text-[10.5px] text-[#626B63] leading-[1.2] mt-0.5 max-w-[90px] xs:max-w-none">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. DESKTOP HERO (hidden lg:flex) — EXACT FIGMA 1600px DESIGN */}
      {/* ========================================================= */}
      <div className="hidden lg:flex relative w-full h-[720px] items-center">
        {/* Full-width Photography Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero/hero-couple.webp"
            alt="TriGyna Healthcare — Smiling couple celebrating holistic wellness"
            fill
            priority
            className="object-cover object-right select-none pointer-events-none"
            sizes="(max-width: 1600px) 100vw, 1600px"
          />

          {/* Exact Figma 90-degree linear gradient overlay for desktop readability */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, rgba(249, 247, 241, 0.94) 0%, rgba(249, 247, 241, 0.90) 34%, rgba(249, 247, 241, 0.42) 48%, rgba(249, 247, 241, 0) 64%, rgba(249, 247, 241, 0) 100%)",
            }}
          />
        </div>

        {/* Content Container matching 1600px canvas & responsive desktop padding */}
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 xl:px-[82px] relative z-10 w-full">
          <div className="max-w-[580px] xl:max-w-[620px] flex flex-col items-start text-left gap-5">
            {/* Eyebrow / Tagline — Clean, unboxed text without card or border */}
            <div>
              <span className="text-[13px] font-bold tracking-[0.14em] uppercase text-[#6B8F5B] leading-none">
                HOLISTIC HEALTHCARE FOR EVERY STAGE OF LIFE
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-[48px] xl:text-[68px] font-bold text-[#154734] leading-[1.04] tracking-tight">
              <span className="block">Better Health</span>
              <span className="block">for a Brighter</span>
              <span className="block">Tomorrow</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-[16px] xl:text-[19px] text-[#626B63] leading-[1.6]">
              Personalised healthcare and holistic wellness for women and men,
              with expert guidance, preventive care, and personalised support to
              help you live a healthier, happier life.
            </p>

            {/* Action Buttons — Row on Desktop */}
            <div className="flex flex-row items-center gap-4 xl:gap-5 pt-1">
              {/* Enquire Now CTA Button */}
              <button
                onClick={() => openEnquiryModal()}
                className="h-[50px] px-7 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-base font-bold shadow-[0px_8px_18px_-10px_rgba(21,71,52,0.35)] hover:shadow-[0px_10px_22px_-8px_rgba(21,71,52,0.45)] transition-all flex items-center gap-2.5 active:scale-[0.98] group cursor-pointer"
              >
                <CalendarDays className="w-[18px] h-[18px] text-white flex-shrink-0" />
                <span>Enquire Now</span>
                <ArrowRight className="w-[15px] h-[15px] text-white flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              {/* Talk on WhatsApp Secondary Button */}
              <a
                href={siteConfig.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-[50px] px-7 rounded-full bg-[#F9F7F1] hover:bg-white text-[#154734] text-base font-bold border border-[#E8E2D6] hover:border-[#D9C6A8] shadow-sm hover:shadow transition-all flex items-center gap-2.5 active:scale-[0.98] group"
              >
                <WhatsAppIcon className="w-[18px] h-[18px] text-[#154734] flex-shrink-0" />
                <span>Talk on WhatsApp</span>
                <ArrowRight className="w-[15px] h-[15px] text-[#154734] flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </div>

            {/* Hero Benefits Chips — Figma Pill Flow with Responsive Wrap */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {featureCards.map((chip) => {
                const Icon = chip.icon;
                return (
                  <div
                    key={chip.title}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#A7C089]/[0.22] hover:bg-[#A7C089]/[0.32] transition-colors cursor-default select-none shadow-[0_1px_2px_rgba(21,71,52,0.03)]"
                  >
                    <Icon className="w-4 h-4 text-[#6B8F5B] flex-shrink-0" />
                    <span className="text-[13px] xl:text-[14px] font-bold text-[#154734] leading-none whitespace-nowrap">
                      {chip.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
