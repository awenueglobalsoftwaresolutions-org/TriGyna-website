import React from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { testimonialsData } from "@/data/testimonialsData";
import SectionHeading from "@/components/ui/SectionHeading";
import { GoogleIcon } from "@/components/ui/BrandIcons";

export default function PatientExperiencesSection() {
  return (
    <section className="py-16 sm:py-24 bg-[#F9F7F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="PATIENT EXPERIENCES"
          title="Real Stories, Real Confidence"
          align="center"
          className="mb-8"
        />

        {/* Google Reviews Trust Bar */}
        <div className="flex items-center justify-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#E8E2D6] shadow-xs text-xs sm:text-sm">
            <GoogleIcon className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold text-[#17221D]">5.0</span>
            <div className="flex items-center gap-0.5 text-[#F59E0B]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
              ))}
            </div>
            <span className="text-[#626B63] hidden sm:inline">• Verified Google Reviews</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonialsData.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D6] shadow-sm hover:shadow-md hover:border-[#6B8F5B]/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Header: Profile Image + Patient Name + Service + Rating + Google Icon */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    {/* Profile Image (Avatar) */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-[#E8E2D6] flex-shrink-0 bg-[#EADFCF]">
                      <Image
                        src={item.avatar}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>

                    {/* Patient Details (Beside Profile Image) */}
                    <div>
                      <h3 className="font-semibold text-base sm:text-[17px] text-[#154734] leading-snug">
                        {item.name}
                      </h3>
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

                  {/* Google Icon */}
                  <div
                    className="w-8 h-8 rounded-full bg-[#F9F7F1] border border-[#E8E2D6] flex items-center justify-center flex-shrink-0"
                    title="Google Review"
                  >
                    <GoogleIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Description Message / Quote */}
                <p className="text-sm sm:text-[15px] text-[#17221D] leading-relaxed italic pt-1">
                  &quot;{item.quote}&quot;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

