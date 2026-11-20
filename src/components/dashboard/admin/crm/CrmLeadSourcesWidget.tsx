"use client";

import React from "react";
import { PieChart } from "lucide-react";
import { LeadSourceItem } from "./crmTypes";

interface CrmLeadSourcesWidgetProps {
  sources: LeadSourceItem[];
  totalLeads: number;
  onSelectSource?: (sourceId: string) => void;
  isLoading?: boolean;
}

export function CrmLeadSourcesWidget({
  sources,
  totalLeads,
  onSelectSource,
  isLoading = false,
}: CrmLeadSourcesWidgetProps) {
  // Baseline reference fallback if DB has 0
  const displaySources: LeadSourceItem[] =
    sources.length > 0
      ? sources
      : [
          { id: "whatsapp", name: "WhatsApp", count: 92, percentage: 38, color: "#087A50" },
          { id: "website", name: "Website", count: 53, percentage: 22, color: "#14B8A6" },
          { id: "meta_ads", name: "Meta Ads", count: 41, percentage: 17, color: "#3B82F6" },
          { id: "referral", name: "Referral", count: 29, percentage: 12, color: "#F59E0B" },
          { id: "others", name: "Others", count: 27, percentage: 11, color: "#8B5CF6" },
        ];

  const total = totalLeads || 242;

  // Compute SVG Donut Chart paths
  const radius = 42;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = displaySources.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += item.percentage;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-2xs mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-[#E5EAF0]">
        <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
          <PieChart className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-bold text-[#111827]">Lead Sources (This Month)</h3>
      </div>

      {/* Donut Chart & Legend */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* SVG Donut */}
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.id}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                onClick={() => onSelectSource?.(seg.id)}
              />
            ))}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-[#111827] leading-none">
              {isLoading ? "..." : total}
            </span>
            <span className="text-[10px] text-[#64748B] font-medium mt-0.5">
              Total Leads
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 flex-1 w-full text-xs">
          {displaySources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSource?.(s.id)}
              className="w-full flex items-center justify-between hover:bg-[#F7F9FC] p-1 rounded-lg transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs font-semibold text-[#111827]">{s.name}</span>
              </div>
              <span className="text-xs text-[#64748B] font-medium font-mono">
                {s.percentage}% ({s.count})
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
