import React from "react";
import { FoliageBranch } from "@/components/ui/BotanicalFlourish";
import { trustHighlights, TrustStatItem } from "@/data/siteData";
import { getTrustStatIcon } from "@/components/ui/TrustStatsStrip";

export interface TrustHighlightsSectionProps {
  items?: TrustStatItem[];
}

export default function TrustHighlightsSection({
  items = trustHighlights,
}: TrustHighlightsSectionProps = {}) {

  return (
    <section className="py-8 sm:py-12 bg-[#F9F7F1] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-[#EAF0E2] border border-[#D5E1CC] rounded-3xl lg:rounded-full py-7 px-6 sm:px-10 lg:px-14 shadow-xs">
          {/* Left Decorative Botanical Branch */}
          <div
            className="hidden xl:block absolute -left-8 top-1/2 -translate-y-1/2 pointer-events-none select-none text-[#6B8F5B] opacity-75 -rotate-12"
            aria-hidden="true"
          >
            <FoliageBranch className="w-16 h-12" />
          </div>

          {/* Right Decorative Botanical Branch */}
          <div
            className="hidden xl:block absolute -right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none text-[#6B8F5B] opacity-75 rotate-[168deg] scale-y-[-1]"
            aria-hidden="true"
          >
            <FoliageBranch className="w-16 h-12" />
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-4 lg:gap-0 lg:divide-x lg:divide-[#CBD7BE]">
            {items.map((item, idx) => {
              const Icon = getTrustStatIcon(item.icon);
              const isStar = item.icon === "star";

              return (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-start sm:justify-center gap-3.5 sm:gap-4 px-2 sm:px-4 lg:px-6"
                >
                  <div className="w-12 h-12 rounded-full bg-white/80 border border-[#CBD7BE]/70 flex items-center justify-center flex-shrink-0 text-[#154734] shadow-xs">
                    <Icon
                      className={`w-5 h-5 text-[#154734] stroke-[1.8] ${
                        isStar ? "fill-[#154734]" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <div className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#154734] leading-[1.1] tracking-tight">
                      {item.value}
                    </div>
                    <div className="text-xs sm:text-[13px] lg:text-[14px] text-[#626B63] font-medium leading-[1.3] mt-0.5">
                      {item.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

