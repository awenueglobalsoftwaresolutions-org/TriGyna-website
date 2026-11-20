"use client";

import React from "react";
import { Stethoscope, ShieldCheck, Pill, Calendar, Loader2 } from "lucide-react";

export interface ClinicalKpiData {
  totalConsultations: number;
  finalizedRecords: number;
  finalizationRate: number;
  inProgressRecords?: number;
  activeTreatmentPlans: number;
  followUpsDue: number;
  followUpsDueToday?: number;
  periodGrowthPct?: string;
  treatmentPlanGrowthPct?: string;
  followUpGrowthPct?: string;
}

interface ClinicalKpiCardsProps {
  stats: ClinicalKpiData | null;
  isLoading: boolean;
  onCardClick?: (type: "total" | "finalized" | "treatment_plans" | "followups") => void;
}

export function ClinicalKpiCards({ stats, isLoading, onCardClick }: ClinicalKpiCardsProps) {
  const total = stats?.totalConsultations ?? 0;
  const finalized = stats?.finalizedRecords ?? 0;
  const rate = stats?.finalizationRate ?? (total > 0 ? Math.round((finalized / total) * 100) : 0);
  const treatmentPlans = stats?.activeTreatmentPlans ?? 0;
  const followUps = stats?.followUpsDue ?? 0;

  // SVG Circular Progress Calculation for Finalized Rate
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, rate)) / 100) * circumference;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1 — Total Consultations */}
      <div
        onClick={() => onCardClick?.("total")}
        className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0 border border-[#D1F2E0] group-hover:scale-105 transition-transform">
            <Stethoscope className="w-5 h-5 text-[#087A50]" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] flex items-center gap-1 font-mono">
            {stats?.periodGrowthPct || "↑ +12%"}
          </span>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-[#64748B]">Total Consultations</span>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold font-sans text-[#111827] tracking-tight">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-gray-100 animate-pulse rounded" />
              ) : (
                total.toLocaleString("en-IN")
              )}
            </p>
            {/* Sparkline trend */}
            <svg className="w-20 h-8 text-[#087A50]" viewBox="0 0 100 40" fill="none" stroke="currentColor">
              <path
                d="M5 32 Q 25 30, 45 22 T 85 8 L 95 6"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M5 32 Q 25 30, 45 22 T 85 8 L 95 6 L 95 38 L 5 38 Z"
                fill="currentColor"
                fillOpacity="0.08"
              />
            </svg>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">vs. previous period</p>
        </div>
      </div>

      {/* CARD 2 — Finalized Records */}
      <div
        onClick={() => onCardClick?.("finalized")}
        className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>

          {/* Radial Circular Progress Ring */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 54 54">
              <circle
                cx="27"
                cy="27"
                r={radius}
                stroke="#E2E8F0"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="27"
                cy="27"
                r={radius}
                stroke="#2563EB"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-blue-700 font-mono">
              {rate}%
            </span>
          </div>
        </div>

        <div className="mt-2">
          <span className="text-xs font-medium text-[#64748B]">Finalized Records</span>
          <p className="text-2xl font-bold font-sans text-[#111827] mt-1 tracking-tight">
            {isLoading ? (
              <span className="inline-block w-16 h-7 bg-gray-100 animate-pulse rounded" />
            ) : (
              finalized.toLocaleString("en-IN")
            )}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">Locked &amp; Immutable</p>
        </div>
      </div>

      {/* CARD 3 — Active Treatment Plans */}
      <div
        onClick={() => onCardClick?.("treatment_plans")}
        className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
            <Pill className="w-5 h-5 text-amber-600" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] flex items-center gap-1 font-mono">
            {stats?.treatmentPlanGrowthPct || "↑ +8%"}
          </span>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-[#64748B]">Active Treatment Plans</span>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold font-sans text-[#111827] tracking-tight">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-gray-100 animate-pulse rounded" />
              ) : (
                treatmentPlans.toLocaleString("en-IN")
              )}
            </p>
            {/* Mini Amber Bar Chart */}
            <div className="flex items-end gap-1 h-7">
              <div className="w-1.5 bg-amber-200 rounded-xs h-3" />
              <div className="w-1.5 bg-amber-300 rounded-xs h-4.5" />
              <div className="w-1.5 bg-amber-400 rounded-xs h-6" />
              <div className="w-1.5 bg-amber-500 rounded-xs h-5" />
              <div className="w-1.5 bg-amber-600 rounded-xs h-7" />
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Ongoing care plans</p>
        </div>
      </div>

      {/* CARD 4 — Follow-ups Due */}
      <div
        onClick={() => onCardClick?.("followups")}
        className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] flex items-center gap-1 font-mono">
            {stats?.followUpGrowthPct || "↑ +18%"}
          </span>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-[#64748B]">Follow-ups Due</span>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl font-bold font-sans text-[#111827] tracking-tight">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-gray-100 animate-pulse rounded" />
              ) : (
                followUps.toLocaleString("en-IN")
              )}
            </p>
            {/* Mini Purple Bar Chart */}
            <div className="flex items-end gap-1 h-7">
              <div className="w-1.5 bg-purple-200 rounded-xs h-3" />
              <div className="w-1.5 bg-purple-300 rounded-xs h-5" />
              <div className="w-1.5 bg-purple-400 rounded-xs h-4" />
              <div className="w-1.5 bg-purple-500 rounded-xs h-6.5" />
              <div className="w-1.5 bg-purple-600 rounded-xs h-7" />
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">In next 7 days</p>
        </div>
      </div>
    </div>
  );
}

