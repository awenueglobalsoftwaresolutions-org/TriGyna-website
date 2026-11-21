"use client";

import React from "react";
import {
  LayoutDashboard,
  Kanban,
  Users,
  HeartHandshake,
  CheckSquare,
  Megaphone,
  BarChart2,
} from "lucide-react";
import { CrmTabType } from "./crmTypes";

interface CrmNavTabsProps {
  activeTab: CrmTabType;
  onTabChange: (tab: CrmTabType) => void;
}

const TABS: Array<{ id: CrmTabType; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "pipeline", label: "Lead Pipeline", icon: Kanban },
  { id: "all_leads", label: "All Leads", icon: Users },
  { id: "followups", label: "Follow-ups", icon: HeartHandshake },
  { id: "tasks", label: "Tasks & Activities", icon: CheckSquare },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "reports", label: "Reports", icon: BarChart2 },
];

export function CrmNavTabs({ activeTab, onTabChange }: CrmNavTabsProps) {
  return (
    <div className="bg-white border border-[#E5EAF0] rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-2xs">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-testid={`crm-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? "bg-[#E9F8F0] text-[#087A50] border border-[#087A50]/30 font-semibold shadow-2xs"
                : "text-[#64748B] hover:text-[#111827] hover:bg-[#F7F9FC] font-medium border border-transparent"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-[#087A50]" : "text-[#64748B]"}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
