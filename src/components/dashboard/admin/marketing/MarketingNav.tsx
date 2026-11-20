"use client";

import React from "react";
import {
  BarChart2,
  Layers,
  Users,
  Link2,
  Code2,
  TrendingUp,
  Settings,
} from "lucide-react";

export type MarketingTabKey =
  | "overview"
  | "campaigns"
  | "attribution"
  | "accounts"
  | "utm"
  | "performance"
  | "settings";

interface MarketingNavProps {
  activeTab: MarketingTabKey;
  onTabChange: (tab: MarketingTabKey) => void;
}

export function MarketingNav({ activeTab, onTabChange }: MarketingNavProps) {
  const tabs = [
    {
      id: "overview" as MarketingTabKey,
      label: "Overview",
      icon: BarChart2,
    },
    {
      id: "campaigns" as MarketingTabKey,
      label: "Campaigns",
      icon: Layers,
    },
    {
      id: "attribution" as MarketingTabKey,
      label: "Lead Attribution",
      icon: Users,
    },
    {
      id: "accounts" as MarketingTabKey,
      label: "Ad Accounts",
      icon: Link2,
    },
    {
      id: "utm" as MarketingTabKey,
      label: "UTM & Tracking",
      prefix: "</>",
    },
    {
      id: "performance" as MarketingTabKey,
      label: "Performance",
      icon: TrendingUp,
    },
    {
      id: "settings" as MarketingTabKey,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#E5EAF0]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isActive
                ? "bg-[#087A50] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#111827] hover:bg-black/5"
            }`}
          >
            {tab.prefix ? (
              <span className={`font-mono text-xs font-bold ${isActive ? "text-white" : "text-[#087A50]"}`}>
                {tab.prefix}
              </span>
            ) : IconComponent ? (
              <IconComponent className="w-4 h-4 shrink-0" />
            ) : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
