"use client";

import React from "react";
import { Users, Target, BarChart3, UserCheck, ArrowUp, ArrowDown } from "lucide-react";
import { SalesOverviewKpis } from "./salesTeamTypes";

interface SalesTeamKpisProps {
  kpis: SalesOverviewKpis | null;
  loading?: boolean;
}

export const SalesTeamKpis: React.FC<SalesTeamKpisProps> = ({ kpis, loading = false }) => {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs animate-pulse flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-gray-100 rounded w-24" />
              <div className="h-6 bg-gray-200 rounded w-16" />
              <div className="h-2.5 bg-gray-100 rounded w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Active Sales Reps",
      value: kpis.activeReps.value,
      changeText: kpis.activeReps.changeText,
      trend: kpis.activeReps.trend,
      icon: Users,
      iconBg: "bg-[#E9F8F0]",
      iconColor: "text-[#087A50]",
      borderColor: "border-[#16A36A]/10",
    },
    {
      title: "Team Conversion Rate",
      value: kpis.teamConversionRate.value,
      changeText: kpis.teamConversionRate.changeText,
      trend: kpis.teamConversionRate.trend,
      icon: Target,
      iconBg: "bg-[#FAF5FF]",
      iconColor: "text-[#9333EA]",
      borderColor: "border-[#9333EA]/10",
    },
    {
      title: "Total Leads (Team)",
      value: kpis.totalLeads.value,
      changeText: kpis.totalLeads.changeText,
      trend: kpis.totalLeads.trend,
      icon: BarChart3,
      iconBg: "bg-[#EFF6FF]",
      iconColor: "text-[#2563EB]",
      borderColor: "border-[#2563EB]/10",
    },
    {
      title: "Converted Leads",
      value: kpis.convertedLeads.value,
      changeText: kpis.convertedLeads.changeText,
      trend: kpis.convertedLeads.trend,
      icon: UserCheck,
      iconBg: "bg-[#E9F8F0]",
      iconColor: "text-[#087A50]",
      borderColor: "border-[#16A36A]/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isUp = card.trend === "up";

        return (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs hover:shadow-sm transition-all flex items-center gap-4"
          >
            {/* Left: Icon square */}
            <div
              className={`w-12 h-12 rounded-xl ${card.iconBg} ${card.iconColor} border ${card.borderColor} flex items-center justify-center shrink-0`}
            >
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>

            {/* Right: Text content */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#64748B] truncate">{card.title}</p>
              <div className="text-2xl font-bold text-[#111827] mt-0.5 tracking-tight">
                {card.value}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {isUp ? (
                  <ArrowUp className="w-3.5 h-3.5 text-[#16A36A] stroke-[2.5]" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-[#DC2626] stroke-[2.5]" />
                )}
                <span className="text-[11px] font-semibold text-[#16A36A]">
                  {card.changeText}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
