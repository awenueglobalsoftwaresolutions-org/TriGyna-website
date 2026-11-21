"use client";

import React from "react";
import {
  Users,
  UserCheck,
  TrendingUp,
  Target,
  BarChart2,
  Clock,
} from "lucide-react";
import { SalesTeamNavTabKey } from "./salesTeamTypes";

interface SalesTeamNavTabsProps {
  activeTab: SalesTeamNavTabKey;
  onTabChange: (tab: SalesTeamNavTabKey) => void;
  membersCount?: number;
}

export const SalesTeamNavTabs: React.FC<SalesTeamNavTabsProps> = ({
  activeTab,
  onTabChange,
  membersCount,
}) => {
  const tabs: Array<{
    key: SalesTeamNavTabKey;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { key: "overview", label: "Overview", icon: Users },
    { key: "members", label: "Team Members", icon: UserCheck, badge: membersCount },
    { key: "performance", label: "Performance", icon: TrendingUp },
    { key: "targets", label: "Targets & Quotas", icon: Target },
    { key: "distribution", label: "Leads Distribution", icon: BarChart2 },
    { key: "activity", label: "Activity Log", icon: Clock },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#E5EAF0]/60">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? "bg-[#087A50] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#111827] hover:bg-gray-100/70"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#64748B]"}`} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && !isActive && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-[#64748B] font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
