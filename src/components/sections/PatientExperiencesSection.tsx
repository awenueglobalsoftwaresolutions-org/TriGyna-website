import React from "react";
import Image from "next/image";
import { Star, CheckCircle2, Quote } from "lucide-react";
import { testimonialsData } from "@/data/testimonialsData";
import { BotanicalLeaf } from "@/components/ui/BotanicalFlourish";
import { GoogleIcon } from "@/components/ui/BrandIcons";

export default function PatientExperiencesSection() {
  return (
    <section className="py-16 sm:py-24 bg-[#F9F7F1] relative overflow-hidden border-b border-[#E8E2D6]/40">
      {/* Subtle ambient lighting */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-[radial-gradient(ellipse_at_top,_rgba(234,223,207,0.45),_transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Premium Clean Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#154734]/5 border border-[#154734]/10 mb-4">
            <BotanicalLeaf className="w-3.5 h-3.5 text-[#6B8F5B]" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#154734]">
              PATIENT EXPERIENCES
            </span>
            <BotanicalLeaf className="w-3.5 h-3.5 text-[#6B8F5B]" />
          </div>

          {/* Main Title */}
          <h2 className="font-serif text-3xl sm:text-4xl md:text-[44px] text-[#154734] leading-[1.2] font-medium tracking-tight">
            Real Stories, Real Confidence
          </h2>

          {/* Reassuring Subtitle */}
          <p className="mt-3.5 text-sm sm:text-base text-[#626B63] max-w-xl mx-auto leading-relaxed">
            Genuine experiences from women who found holistic healing, hormonal balance, and personalized care at TriGyna.
          </p>

          {/* Ultra-Clean & Clear Trust Badge */}
          <div className="mt-6 sm:mt-7 flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 sm:gap-3 bg-white/95 backdrop-blur-xs px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-[#E2DBD0] shadow-[0_2px_12px_rgba(21,71,52,0.05)] hover:shadow-[0_4px_16px_rgba(21,71,52,0.08)] hover:border-[#6B8F5B]/30 transition-all duration-300">
              <GoogleIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-[15px] text-[#154734] tracking-tight">
                  5.0
                </span>
                <div className="flex items-center gap-0.5 text-[#F59E0B]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
              </div>
              <span className="w-1 h-1 rounded-full bg-[#B8B1A2]" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium text-[#465048] tracking-tight">
                Verified Google Reviews
              </span>
            </div>
          </div>
        </div>

        {/* Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonialsData.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D6] shadow-[0_2px_12px_rgba(21,71,52,0.03)] hover:shadow-[0_8px_24px_rgba(21,71,52,0.07)] hover:border-[#6B8F5B]/40 transition-all duration-300 flex flex-col justify-between relative"
            >
              <div>
                {/* Header: Profile Image + Patient Details + Google Review Mark */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    {/* Profile Image (Avatar) */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white ring-1 ring-[#E8E2D6] flex-shrink-0 bg-[#EADFCF]">
                      <Image
                        src={item.avatar}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>

                    {/* Patient Details */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-base sm:text-[17px] text-[#154734] leading-snug">
                          {item.name}
                        </h3>
                        <span title="Verified Patient" className="inline-flex items-center text-[#22C55E]">
                          <CheckCircle2
                            className="w-4 h-4 fill-[#22C55E]/15 shrink-0"
                            aria-label="Verified Patient"
                          />
                        </span>
                      </div>
                      <span className="block text-xs font-medium text-[#7B817B] mt-0.5">
                        {item.service}
                      </span>
                      {/* Star Rating */}
                      <div className="flex items-center gap-1 text-[#F59E0B] mt-1.5">
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Google Icon Badge */}
                  <div
                    className="w-8 h-8 rounded-full bg-[#F9F7F1] border border-[#E8E2D6] flex items-center justify-center flex-shrink-0 group-hover:border-[#6B8F5B]/30 transition-colors"
                    title="Google Verified Review"
                  >
                    <GoogleIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Subtle Decorative Quote Icon */}
                <Quote className="w-5 h-5 text-[#6B8F5B]/30 mb-2 shrink-0" aria-hidden="true" />

                {/* Quote Text */}
                <p className="text-sm sm:text-[15px] text-[#243029] leading-relaxed">
                  {item.quote}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

