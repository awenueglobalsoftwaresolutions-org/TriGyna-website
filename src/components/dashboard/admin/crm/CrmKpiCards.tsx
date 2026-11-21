"use client";

import React from "react";
import { Users, Target, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { CrmKpis } from "./crmTypes";

interface CrmKpiCardsProps {
  kpis: CrmKpis | null;
  isLoading?: boolean;
  onSelectKpi?: (kpiKey: string) => void;
}

export function CrmKpiCards({ kpis, isLoading = false, onSelectKpi }: CrmKpiCardsProps) {
  const totalLeads = kpis?.totalLeads ?? 242;
  const newLeads = kpis?.newLeads ?? 90;
  const followUpsDue = kpis?.followUpsDue ?? 29;
  const highPriorityFollowUps = kpis?.highPriorityFollowUps ?? 13;
  const consultationsBooked = kpis?.consultationsBooked ?? 2;
  const convertedLeads = kpis?.convertedLeads ?? 76;
  const conversionRate = kpis?.conversionRate ?? 31;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Total Leads */}
      <button
        type="button"
        onClick={() => onSelectKpi?.("total")}
        className="bg-white p-4 rounded-2xl border border-[#E5EAF0] hover:border-[#087A50]/50 shadow-2xs text-left transition-all hover:shadow-xs group cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50] shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#64748B]">Total Leads</p>
            <p className="text-2xl sm:text-[26px] font-bold text-[#111827] tracking-tight leading-none mt-1">
              {isLoading ? "..." : totalLeads}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[11px] font-medium text-[#087A50] whitespace-nowrap">
                ↗ {kpis?.totalLeadsGrowth || "+18% vs last month"}
              </span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="shrink-0 self-center hidden xl:block">
            <svg className="w-14 h-6 overflow-visible" viewBox="0 0 56 20" fill="none">
              <path
                d="M2 16L14 14L28 17L42 7L54 4"
                stroke="#087A50"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* 2. New Leads */}
      <button
        type="button"
        onClick={() => onSelectKpi?.("new")}
        className="bg-white p-4 rounded-2xl border border-[#E5EAF0] hover:border-[#8B5CF6]/50 shadow-2xs text-left transition-all hover:shadow-xs group cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F3E8FF] border border-[#E9D5FF] flex items-center justify-center text-[#8B5CF6] shrink-0 group-hover:scale-105 transition-transform">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#64748B]">New Leads</p>
            <p className="text-2xl sm:text-[26px] font-bold text-[#111827] tracking-tight leading-none mt-1">
              {isLoading ? "..." : newLeads}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[11px] font-medium text-[#8B5CF6] whitespace-nowrap">
                ↗ {kpis?.newLeadsGrowth || "+25% vs last month"}
              </span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="shrink-0 self-center hidden xl:block">
            <svg className="w-14 h-6 overflow-visible" viewBox="0 0 56 20" fill="none">
              <path
                d="M2 17L16 15L30 11L42 7L54 3"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* 3. Follow-ups Due */}
      <button
        type="button"
        onClick={() => onSelectKpi?.("followups")}
        className="bg-white p-4 rounded-2xl border border-[#E5EAF0] hover:border-[#F59E0B]/50 shadow-2xs text-left transition-all hover:shadow-xs group cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#64748B]">Follow-ups Due</p>
            <p className="text-2xl sm:text-[26px] font-bold text-[#111827] tracking-tight leading-none mt-1">
              {isLoading ? "..." : followUpsDue}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[11px] font-medium text-[#D97706] whitespace-nowrap">
                {highPriorityFollowUps} high priority
              </span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="shrink-0 self-center hidden xl:block">
            <svg className="w-14 h-6 overflow-visible" viewBox="0 0 56 20" fill="none">
              <path
                d="M2 14L16 16L30 11L44 8L54 6"
                stroke="#D97706"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* 4. Consultations Booked */}
      <button
        type="button"
        onClick={() => onSelectKpi?.("consultations")}
        className="bg-white p-4 rounded-2xl border border-[#E5EAF0] hover:border-[#3B82F6]/50 shadow-2xs text-left transition-all hover:shadow-xs group cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#3B82F6] shrink-0 group-hover:scale-105 transition-transform">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#64748B] whitespace-nowrap">Consultations Booked</p>
            <p className="text-2xl sm:text-[26px] font-bold text-[#111827] tracking-tight leading-none mt-1">
              {isLoading ? "..." : consultationsBooked}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[11px] font-medium text-[#3B82F6] whitespace-nowrap">
                ↗ {kpis?.consultationsGrowth || "+100% vs last month"}
              </span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="shrink-0 self-center hidden xl:block">
            <svg className="w-14 h-6 overflow-visible" viewBox="0 0 56 20" fill="none">
              <path
                d="M2 16L18 14L32 10L44 6L54 3"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* 5. Converted */}
      <button
        type="button"
        onClick={() => onSelectKpi?.("converted")}
        className="bg-white p-4 rounded-2xl border border-[#E5EAF0] hover:border-[#087A50]/50 shadow-2xs text-left transition-all hover:shadow-xs group cursor-pointer col-span-2 sm:col-span-1 relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50] shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#64748B]">Converted</p>
            <p className="text-2xl sm:text-[26px] font-bold text-[#111827] tracking-tight leading-none mt-1">
              {isLoading ? "..." : convertedLeads}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[11px] font-medium text-[#087A50] whitespace-nowrap">
                {conversionRate}% conversion rate
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
