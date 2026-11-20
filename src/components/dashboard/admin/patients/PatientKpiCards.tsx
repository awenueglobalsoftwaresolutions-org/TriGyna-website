"use client";

import React from "react";
import { Users, UserPlus, Calendar, ArrowUpRight } from "lucide-react";

export interface PatientKpiData {
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  womensHealth: {
    count: number;
    cohortTotal: number;
    percentage: number;
  };
  newRegistrations: {
    count: number;
    trendPercentage: number;
  };
  activeThisMonth: {
    count: number;
    withAppointments: number;
  };
}

interface PatientKpiCardsProps {
  kpis?: PatientKpiData;
  isLoading?: boolean;
}

export function PatientKpiCards({ kpis, isLoading = false }: PatientKpiCardsProps) {
  const total = kpis?.totalPatients ?? 0;
  const womensCount = kpis?.womensHealth?.count ?? 0;
  const womensPct = kpis?.womensHealth?.percentage ?? 0;
  const newRegCount = kpis?.newRegistrations?.count ?? 0;
  const newRegTrend = kpis?.newRegistrations?.trendPercentage ?? 0;
  const activeMonthCount = kpis?.activeThisMonth?.count ?? 0;
  const withApptsCount = kpis?.activeThisMonth?.withAppointments ?? 0;

  // Circular progress calculations for Card 2
  const circleRadius = 20;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (womensPct / 100) * circumference;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: Total Patients */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EAF5ED] text-[#087A50] flex items-center justify-center border border-[#D5E5DA]">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Total Patients</span>
          </div>

          <p className="text-3xl font-sans font-bold text-[#111827] tracking-tight font-mono pt-0.5">
            {isLoading ? "—" : total.toLocaleString()}
          </p>

          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] font-semibold text-[#087A50]">
              Active EMR Records
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12%</span>
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: Women's Health Intake */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              {/* Venus Female Symbol */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="9" r="5" />
                <line x1="12" y1="14" x2="12" y2="21" />
                <line x1="9" y1="18" x2="15" y2="18" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Women&apos;s Health Intake</span>
          </div>

          <p className="text-3xl font-sans font-bold text-[#111827] tracking-tight font-mono pt-0.5">
            {isLoading ? "—" : womensCount.toLocaleString()}
          </p>

          <p className="text-[11px] text-[#64748B] font-medium pt-0.5">
            {isLoading ? "—" : `${womensPct}% of cohort`}
          </p>
        </div>

        {/* SVG Circular Progress Ring */}
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r={circleRadius}
              className="text-[#E9EDF2]"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r={circleRadius}
              className="text-purple-600 transition-all duration-1000 ease-out"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <span className="absolute text-[11px] font-bold text-purple-700 font-mono">
            {isLoading ? "—" : `${womensPct}%`}
          </span>
        </div>
      </div>

      {/* CARD 3: New Registrations */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">New Registrations</span>
          </div>

          <p className="text-3xl font-sans font-bold text-[#111827] tracking-tight font-mono pt-0.5">
            {isLoading ? "—" : newRegCount.toLocaleString()}
          </p>

          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[11px] font-medium text-[#64748B]">
              This Month
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ArrowUpRight className="w-3 h-3" />
              <span>{newRegTrend >= 0 ? `+${newRegTrend}%` : `${newRegTrend}%`}</span>
            </span>
          </div>
        </div>
      </div>

      {/* CARD 4: Active This Month */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Active This Month</span>
          </div>

          <p className="text-3xl font-sans font-bold text-[#111827] tracking-tight font-mono pt-0.5">
            {isLoading ? "—" : (activeMonthCount || withApptsCount).toLocaleString()}
          </p>

          <p className="text-[11px] text-blue-600 font-semibold pt-0.5">
            With Appointments
          </p>
        </div>

        {/* Mini 4-Bar Sparkline SVG */}
        <div className="flex items-end gap-1.5 h-10 px-2 py-1 bg-blue-50/50 rounded-xl border border-blue-100/60 shrink-0">
          <span className="w-1.5 bg-blue-300 rounded-xs h-3.5"></span>
          <span className="w-1.5 bg-blue-400 rounded-xs h-5"></span>
          <span className="w-1.5 bg-blue-500 rounded-xs h-7"></span>
          <span className="w-1.5 bg-blue-600 rounded-xs h-8.5"></span>
        </div>
      </div>
    </div>
  );
}

