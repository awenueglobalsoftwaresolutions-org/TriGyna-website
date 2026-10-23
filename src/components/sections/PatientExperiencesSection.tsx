import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { testimonialsData } from "@/data/testimonialsData";
import SectionHeading from "@/components/ui/SectionHeading";

export default function PatientExperiencesSection() {
  return (
    <section className="py-16 sm:py-24 bg-[#F9F7F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="PATIENT EXPERIENCES"
          title="Real Stories, Real Confidence"
          align="center"
          className="mb-12"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonialsData.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D6] shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Avatar and Quote Icon */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#E8E2D6] flex-shrink-0 bg-[#EADFCF]">
                    <Image
                      src={item.avatar}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="font-serif text-4xl text-[#6B8F5B]/30 select-none">
                    “
                  </div>
                </div>

                {/* Quote Text */}
                <p className="text-sm sm:text-[15px] text-[#17221D] leading-relaxed italic mb-5">
                  &quot;{item.quote}&quot;
                </p>
              </div>

              {/* Attribution and Stars */}
              <div className="pt-4 border-t border-[#E8E2D6]/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#154734]">
                    — {item.name}
                  </span>
                  <span className="block text-[11px] text-[#7B817B]">
                    {item.service}
                  </span>
                </div>

                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-[#F59E0B]">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B]" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
