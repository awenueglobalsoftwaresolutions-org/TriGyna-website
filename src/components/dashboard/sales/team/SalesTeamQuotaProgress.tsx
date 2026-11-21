"use client";

import React from "react";
import { Target, CheckCircle2, Clock } from "lucide-react";
import { QuotaProgressData } from "./salesTeamTypes";

interface SalesTeamQuotaProgressProps {
  quota: QuotaProgressData | null;
  loading?: boolean;
}

export const SalesTeamQuotaProgress: React.FC<SalesTeamQuotaProgressProps> = ({
  quota,
  loading = false,
}) => {
  const targetLeads = quota?.targetLeads || 100;
  const achieved = quota?.achieved || 72;
  const remaining = quota?.remaining !== undefined ? quota.remaining : 28;
  const percentage = quota?.percentage !== undefined ? quota.percentage : 72;

  // Circular progress calculations
  const size = 130;
  const strokeWidth = 11;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[#087A50]">
          <Target className="w-4 h-4 stroke-[2.5]" />
        </div>
        <h2 className="text-sm font-bold text-[#111827]">Monthly Quota Progress</h2>
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center animate-pulse">
          <div className="w-24 h-24 rounded-full border-4 border-gray-100" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center my-auto">
          {/* Circular Progress Ring */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg width={size} height={size} className="transform -rotate-90">
                {/* Background track */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth={strokeWidth}
                />
                {/* Progress arc */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke="#087A50"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-[#111827] tracking-tight leading-none">
                  {percentage}%
                </span>
                <span className="text-[11px] font-medium text-[#64748B] mt-1">
                  {achieved} / {targetLeads}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Stack */}
          <div className="sm:col-span-7 space-y-2.5">
            {/* Target Leads */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/70 border border-gray-100/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200/70 flex items-center justify-center text-[#64748B]">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-[#64748B]">Target Leads</span>
              </div>
              <span className="text-sm font-bold text-[#111827]">{targetLeads}</span>
            </div>

            {/* Achieved */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#E9F8F0]/40 border border-[#16A36A]/20">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#E9F8F0] flex items-center justify-center text-[#087A50]">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-semibold text-[#087A50]">Achieved</span>
              </div>
              <span className="text-sm font-bold text-[#111827]">{achieved}</span>
            </div>

            {/* Remaining */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/40 border border-rose-200/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-rose-100/70 flex items-center justify-center text-[#DC2626]">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-semibold text-[#DC2626]">Remaining</span>
              </div>
              <span className="text-sm font-bold text-[#111827]">{remaining}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
