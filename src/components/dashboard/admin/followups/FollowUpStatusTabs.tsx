"use client";

import React from "react";
import {
  CalendarDays,
  Clock,
  CalendarCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { FollowUpStats } from "./types";

interface FollowUpStatusTabsProps {
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  stats: FollowUpStats | null;
}

export function FollowUpStatusTabs({
  activeTab,
  onTabChange,
  stats,
}: FollowUpStatusTabsProps) {
  const tabs = [
    {
      key: "all",
      label: "All Follow-ups",
      count: stats?.tabCounts?.all ?? 25,
      icon: CalendarDays,
    },
    {
      key: "due_today",
      label: "Due Today",
      count: stats?.tabCounts?.due_today ?? 0,
      icon: Clock,
    },
    {
      key: "upcoming",
      label: "Upcoming",
      count: stats?.tabCounts?.upcoming ?? 12,
      icon: CalendarCheck2,
    },
    {
      key: "overdue",
      label: "Overdue",
      count: stats?.tabCounts?.overdue ?? 0,
      icon: AlertTriangle,
    },
    {
      key: "completed",
      label: "Completed",
      count: stats?.tabCounts?.completed ?? 5,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? "bg-[#087A50] text-white shadow-xs"
                : "bg-white hover:bg-gray-50 text-[#64748B] hover:text-[#111827] border border-[#E5EAF0]"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#64748B]"}`} />
            <span>
              {tab.label} ({tab.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
