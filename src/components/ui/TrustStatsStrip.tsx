import React from "react";
import {
  UsersRound,
  Clock,
  Calendar,
  Star,
  ShieldCheck,
  Heart,
  LucideIcon,
} from "lucide-react";
import { trustStats as defaultTrustStats, TrustStatItem } from "@/data/siteData";

export interface TrustStatsStripProps {
  stats?: TrustStatItem[];
  className?: string;
  containerClassName?: string;
}

export function getTrustStatIcon(iconType: string): LucideIcon {
  switch (iconType) {
    case "users":
      return UsersRound;
    case "clock":
      return Clock;
    case "calendar":
      return Calendar;
    case "star":
      return Star;
    case "shield":
      return ShieldCheck;
    case "heart":
      return Heart;
    default:
      return UsersRound;
  }
}

/**
 * TrustStatsStrip
 * Reusable, responsive trust metrics strip showing verified patient numbers,
 * years of experience, and clinical satisfaction.
 *
 * Single Source of Truth: edits in `src/data/siteData.ts` automatically reflect here.
 */
export default function TrustStatsStrip({
  stats = defaultTrustStats,
  className = "",
  containerClassName = "",
}: TrustStatsStripProps) {
  return (
    <div
      className={`bg-[#E9EFD9] border-t border-[#D6DFCA] py-6 sm:py-7 relative z-10 ${className}`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${containerClassName}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#CBD7BE]">
          {stats.map((stat, idx) => {
            const Icon = getTrustStatIcon(stat.icon);
            const isStar = stat.icon === "star";

            return (
              <div
                key={stat.id || idx}
                className="flex items-center justify-start sm:justify-center gap-3.5 sm:gap-4 px-2 sm:px-4 lg:px-8 py-3.5 sm:py-0 group"
              >
                {/* Circular Icon Container */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 border border-[#CBD7BE]/70 flex items-center justify-center flex-shrink-0 text-[#104B39] shadow-xs group-hover:scale-105 group-hover:shadow-sm transition-transform duration-200">
                  <Icon
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#104B39] stroke-[1.8] ${
                      isStar ? "fill-[#104B39]" : ""
                    }`}
                  />
                </div>

                {/* Metric Value & Label */}
                <div>
                  <div className="font-serif text-2xl xs:text-3xl sm:text-3xl lg:text-[34px] font-bold text-[#104B39] leading-tight tracking-tight">
                    {stat.value}
                  </div>
                  <div className="font-sans text-xs sm:text-[13px] lg:text-[14px] text-[#556056] font-medium leading-snug mt-0.5">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
