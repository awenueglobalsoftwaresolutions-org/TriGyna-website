import React from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { siteConfig } from "@/data/siteData";

export default function HowItWorksSection() {
  return (
    <section className="py-16 sm:py-20 bg-white border-b border-[#E8E2D6]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="SIMPLE & TRANSPARENT PROCESS"
          title="How It Works"
          subtitle="Your journey to balanced health and vitality in three effortless steps."
          align="center"
          className="mb-12"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {siteConfig.howItWorks.map((step, idx) => (
            <div
              key={idx}
              className="bg-[#F9F7F1] rounded-2xl p-6 sm:p-8 border border-[#E8E2D6] relative hover:shadow-md transition-shadow"
            >
              <div className="font-serif text-4xl sm:text-5xl font-bold text-[#A7C089]/40 mb-3">
                {step.step}
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#154734] mb-2.5">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#626B63] leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
