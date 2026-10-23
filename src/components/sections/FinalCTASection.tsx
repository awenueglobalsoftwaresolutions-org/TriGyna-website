"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { siteConfig } from "@/data/siteData";
import { useEnquiryModal } from "@/components/context/EnquiryModalContext";
import { BotanicalLeaf } from "@/components/ui/BotanicalFlourish";

import Image from "next/image";

interface FinalCTASectionProps {
  variant?: "peach" | "forest";
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

export default function FinalCTASection({
  variant = "peach",
  eyebrow,
  title,
  subtitle,
  buttonText = "Book a Consultation",
}: FinalCTASectionProps) {
  const { openEnquiryModal } = useEnquiryModal();

  if (variant === "forest") {
    return (
      <section className="py-14 sm:py-20 bg-[#F9F7F1] border-b border-[#E8E2D6]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#154734] rounded-3xl sm:rounded-[36px] p-8 sm:p-12 lg:p-14 relative overflow-hidden text-white shadow-xl">
            {/* Decorative Plant Image Arch on Right Side */}
            <div className="hidden sm:block absolute -right-2 lg:right-6 -bottom-10 sm:-bottom-8 w-44 h-60 sm:w-56 sm:h-76 lg:w-68 lg:h-88 rounded-t-full rounded-b-2xl overflow-hidden opacity-85 pointer-events-none select-none z-0 border-4 border-white/15 shadow-2xl">
              <Image
                src="/images/about/approach-plant.jpg"
                alt="TriGyna Wellness"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#154734] via-[#154734]/25 to-transparent" />
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
              {/* Left: Eyebrow + Heading */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-[2px] bg-[#D9C6A8] rounded-full inline-block" />
                  <span className="text-xs sm:text-[13px] font-bold tracking-[0.2em] uppercase text-[#D9C6A8]">
                    {eyebrow || "LET'S TAKE THE NEXT STEP"}
                  </span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-[46px] font-medium text-white leading-tight">
                  {title || "Your Health Journey Starts Here"}
                </h2>
              </div>

              {/* Right: Text + Button */}
              <div className="lg:col-span-6 flex flex-col items-start space-y-5 lg:pr-32 xl:pr-40 z-10">
                <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-md">
                  {subtitle ||
                    "Book a consultation with our expert team and experience personalised, holistic care designed around you."}
                </p>
                <button
                  onClick={() => openEnquiryModal()}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white text-[#154734] hover:bg-[#F9F7F1] text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 group cursor-pointer"
                >
                  <span>{buttonText}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-[#F6E8DD]/60 py-16 sm:py-20 border-b border-[#E8E2D6]">
      {/* Decorative botanical flourishes */}
      <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-30 -ml-8 -mt-8">
        <BotanicalLeaf className="w-full h-full text-[#6B8F5B]" />
      </div>
      <div className="absolute bottom-0 right-0 w-36 h-36 pointer-events-none opacity-20 -mr-10 -mb-10 rotate-180">
        <BotanicalLeaf className="w-full h-full text-[#154734]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Left Text */}
          <div className="max-w-2xl space-y-2.5">
            <h2 className="font-serif text-3xl sm:text-4xl text-[#154734] font-medium leading-tight">
              {title || "Take the First Step Towards a Healthier You"}
            </h2>
            <p className="text-sm sm:text-base text-[#626B63] leading-relaxed">
              {subtitle ||
                "Have questions or want to know more about our services? Get in touch with us today. Our team is here to help you."}
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 flex-shrink-0">
            <button
              onClick={() => openEnquiryModal()}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#154734] hover:bg-[#0E3828] text-white text-sm sm:text-base font-medium shadow-sm hover:shadow-md transition-all active:scale-95 group"
            >
              <span>{buttonText || "Enquire Now"}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-[#F9F7F1] text-[#154734] text-sm sm:text-base font-medium border border-[#E8E2D6] shadow-sm transition-all active:scale-95"
            >
              <WhatsAppIcon className="w-4 h-4 text-[#22C55E]" />
              <span>Talk on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

