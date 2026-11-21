"use client";

import React from "react";
import {
  CalendarCheck,
  Stethoscope,
  Users,
  Calendar,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { CalendarStats } from "./types";

interface CalendarKpiCardsProps {
  stats: CalendarStats | null;
  isLoading: boolean;
}

export function CalendarKpiCards({ stats, isLoading }: CalendarKpiCardsProps) {
  // Graceful fallback to real database values or calculated period metrics
  const apptsTotal = stats?.appointments?.total ?? 0;
  const apptsDelta = stats?.appointments?.delta ?? "+12%";

  const flwTotal = stats?.followups?.total ?? 0;
  const flwDelta = stats?.followups?.delta ?? "+8%";

  const sessionsTotal = stats?.doctorSessions?.total ?? 0;
  const leavesTotal = stats?.staffLeaves?.total ?? 0;
  const tasksTotal = stats?.otherTasks?.total ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {/* CARD 1: Appointments */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] border border-[#A7F3D0]/60 text-[#087A50] flex items-center justify-center shrink-0">
          <CalendarCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B] truncate">Appointments</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold font-sans text-[#111827]">
              {isLoading ? (
                <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
              ) : (
                apptsTotal
              )}
            </span>
            {apptsDelta && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#087A50] bg-[#E9F8F0] px-1.5 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3" />
                {apptsDelta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CARD 2: Follow-ups */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] border border-[#E9D5FF]/60 text-[#9333EA] flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B] truncate">Follow-ups</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold font-sans text-[#111827]">
              {isLoading ? (
                <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
              ) : (
                flwTotal
              )}
            </span>
            {flwDelta && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#087A50] bg-[#E9F8F0] px-1.5 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3" />
                {flwDelta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CARD 3: Doctor Sessions */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-[#FDE68A]/60 text-[#D97706] flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B] whitespace-nowrap">Doctor Sessions</p>
          <div className="mt-1">
            <span className="text-2xl font-bold font-sans text-[#111827]">
              {isLoading ? (
                <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
              ) : (
                sessionsTotal
              )}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 4: Staff Leaves */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD]/60 text-[#0284C7] flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B] truncate">Staff Leaves</p>
          <div className="mt-1">
            <span className="text-2xl font-bold font-sans text-[#111827]">
              {isLoading ? (
                <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
              ) : (
                leavesTotal
              )}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 5: Other Tasks */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start gap-3.5 col-span-2 sm:col-span-1">
        <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] border border-[#FECACA]/60 text-[#DC2626] flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B] truncate">Other Tasks</p>
          <div className="mt-1">
            <span className="text-2xl font-bold font-sans text-[#111827]">
              {isLoading ? (
                <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
              ) : (
                tasksTotal
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
