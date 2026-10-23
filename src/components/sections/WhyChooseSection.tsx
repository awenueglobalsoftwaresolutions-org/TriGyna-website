"use client";

import React from "react";
import Image from "next/image";
import {
  UsersRound,
  HeartPulse,
  ShieldCheck,
  Leaf,
  ArrowRight,
} from "lucide-react";
import { useEnquiryModal } from "@/components/context/EnquiryModalContext";
import TrustStatsStrip from "@/components/ui/TrustStatsStrip";

export default function WhyChooseSection() {
  const { openEnquiryModal } = useEnquiryModal();

  const benefitCards = [
    {
      title: "Expert Care Team",
      desc: "Experienced and qualified professionals dedicated to your well-being.",
      icon: UsersRound,
    },
    {
      title: "Personalised Approach",
      desc: "Care plans tailored to your unique needs and health goals.",
      icon: HeartPulse,
    },
    {
      title: "Comprehensive Support",
      desc: "From preventive care to advanced treatment, we're with you at every step.",
      icon: ShieldCheck,
    },
    {
      title: "Holistic Wellness",
      desc: "A balanced approach combining medical care, nutrition and lifestyle guidance.",
      icon: Leaf,
    },
  ];

  return (
    <section
      id="why-choose"
      className="relative bg-[#FBF9F2] pt-14 sm:pt-20 lg:pt-24 pb-0 overflow-hidden border-b border-[#E8E2D6]"
    >
      {/* Decorative Botanical Leaf Accents in Corners */}
      {/* Bottom Left Leaf Foliage */}
      <div
        className="absolute bottom-16 sm:bottom-20 left-0 w-32 sm:w-48 lg:w-64 pointer-events-none select-none z-0 opacity-75 transition-opacity"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 280 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M-20 200 C30 170, 70 120, 60 70 C50 15, 10 -10, -30 10 C-60 50, -50 130, -20 200 Z"
            fill="#A7C089"
            fillOpacity="0.4"
          />
          <path
            d="M-10 220 C45 180, 95 150, 115 100 C125 55, 90 20, 55 35 C20 70, 0 150, -10 220 Z"
            fill="#6B8F5B"
            fillOpacity="0.3"
          />
          <path
            d="M-30 240 C20 220, 60 210, 85 175 C105 140, 80 110, 45 125 C10 150, -15 200, -30 240 Z"
            fill="#8BAE68"
            fillOpacity="0.45"
          />
        </svg>
      </div>

      {/* Bottom Right Leaf Foliage */}
      <div
        className="absolute bottom-20 right-0 w-36 sm:w-56 lg:w-72 pointer-events-none select-none z-0 opacity-75 transition-opacity"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 300 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M320 220 C270 190, 230 145, 240 90 C250 35, 290 10, 330 25 C360 70, 350 150, 320 220 Z"
            fill="#A7C089"
            fillOpacity="0.4"
          />
          <path
            d="M310 240 C255 200, 200 170, 180 115 C170 70, 205 35, 240 50 C280 85, 300 165, 310 240 Z"
            fill="#6B8F5B"
            fillOpacity="0.3"
          />
          <path
            d="M330 260 C280 240, 235 230, 210 195 C190 160, 215 130, 250 145 C285 170, 315 220, 330 260 Z"
            fill="#8BAE68"
            fillOpacity="0.45"
          />
        </svg>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
          {/* Left Column: Content, Cards & CTA */}
          <div className="lg:col-span-7 flex flex-col order-1">
            {/* 1. Eyebrow Label */}
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#6B8F5B]">
                WHY CHOOSE TRIGYNA
              </span>
            </div>

            {/* 2. Main Heading */}
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-bold text-[#104B39] leading-[1.12] tracking-tight mb-4 sm:mb-5">
              Your Health, <br />
              Our Priority
            </h2>

            {/* 3. Supporting Paragraph */}
            <p className="font-sans text-[15px] sm:text-base lg:text-[17px] text-[#626B68] leading-[1.65] max-w-xl mb-7 sm:mb-8">
              At TriGyna, we combine expert care, personalised guidance and
              holistic wellness to support women and men at every stage of life.
              Your well-being is at the heart of everything we do.
            </p>

            {/* 4. Four Benefit Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 lg:gap-4.5 mb-8">
              {benefitCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-[20px] p-4 sm:p-5 border border-[#E8E2D6]/80 shadow-[0_2px_12px_rgba(16,75,57,0.03)] hover:shadow-[0_8px_24px_rgba(16,75,57,0.08)] hover:border-[#A7C089]/70 transition-all duration-300 flex items-start gap-3.5 sm:gap-4 group h-full"
                  >
                    {/* Sage Circular Icon Container */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#E9EFD9] flex items-center justify-center flex-shrink-0 text-[#104B39] shadow-xs group-hover:scale-105 transition-transform duration-300 mt-0.5">
                      <Icon className="w-5 h-5 text-[#104B39] stroke-[1.8]" />
                    </div>

                    {/* Card Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-base sm:text-[17px] text-[#104B39] leading-snug">
                        {card.title}
                      </h3>
                      <p className="font-sans text-xs sm:text-[13px] text-[#626B68] leading-[1.5] mt-1">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5. Consultation CTA */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => openEnquiryModal()}
                className="h-[52px] sm:h-[54px] px-8 rounded-full bg-[#104B39] hover:bg-[#0B3D2E] text-white text-[15px] font-semibold shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-3 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#104B39] focus:ring-offset-2 cursor-pointer group w-full sm:w-auto"
                aria-label="Book a consultation with TriGyna"
              >
                <span>Book a Consultation</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Right Column: Doctor Cutout & Organic Soft Sage Backdrop */}
          <div className="lg:col-span-5 flex justify-center items-end order-2 mt-6 lg:mt-0">
            <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] aspect-[0.92/1] sm:aspect-[0.95/1] flex items-end justify-center">
              {/* Organic Soft Sage Curved Backdrop (Architecturally Framed) */}
              <div
                className="absolute inset-x-0 top-2 sm:top-0 bottom-0 bg-gradient-to-br from-[#EBF2E1] via-[#E2ECDA] to-[#D5E2C7] rounded-tl-[160px] sm:rounded-tl-[220px] lg:rounded-tl-[260px] rounded-tr-[50px] sm:rounded-tr-[80px] rounded-bl-[40px] rounded-br-[70px] overflow-hidden"
                aria-hidden="true"
              >
                {/* Soft Radial Ambient Lighting */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.7),transparent_75%)]" />

                {/* Elegant Decorative Gold Wave Lines along lower boundary */}
                <svg
                  className="absolute bottom-0 right-0 w-full h-auto opacity-75"
                  viewBox="0 0 400 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M-20 135 C100 85, 220 155, 420 75"
                    stroke="#C8A45D"
                    strokeWidth="1.75"
                    strokeOpacity="0.8"
                  />
                  <path
                    d="M-10 155 C120 105, 250 165, 430 95"
                    stroke="#A7C089"
                    strokeWidth="1.25"
                    strokeOpacity="0.65"
                  />
                </svg>
              </div>

              {/* Transparent Doctor Cutout Asset */}
              <div className="relative w-full h-full z-10 flex items-end justify-center">
                <Image
                  src="/images/doctors/dr-harshali-cutout.webp"
                  alt="Female healthcare professional at TriGyna with stethoscope and lab coat"
                  fill
                  className="object-contain object-bottom drop-shadow-[0_14px_32px_rgba(16,75,57,0.14)]"
                  sizes="(max-width: 640px) 340px, (max-width: 1024px) 460px, 560px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Bottom Trust Statistics Strip (Single Source of Truth from siteData) */}
      <TrustStatsStrip className="mt-14 sm:mt-18 lg:mt-24" />
    </section>
  );
}
