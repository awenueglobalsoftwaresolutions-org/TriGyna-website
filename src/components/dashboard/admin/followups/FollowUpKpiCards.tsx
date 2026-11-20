"use client";

import React from "react";
import { Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { FollowUpStats } from "./types";

interface FollowUpKpiCardsProps {
  stats: FollowUpStats | null;
  onCardClick?: (filterTab: string) => void;
}

export function FollowUpKpiCards({ stats, onCardClick }: FollowUpKpiCardsProps) {
  const total = stats?.totalFollowUps ?? 25;
  const dueToday = stats?.dueToday ?? 0;
  const completed = stats?.completed ?? 5;
  const missedOverdue = stats?.missedOverdue ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3.5">
      {/* 1. Total Follow-ups */}
      <div
        onClick={() => onCardClick?.("all")}
        className="bg-[#F4F9F6] border border-[#E0ECE5] rounded-2xl p-4 transition-all hover:shadow-xs cursor-pointer flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-lg bg-[#E0ECE5] text-[#087A50] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs font-medium text-[#475569] block">Total Follow-ups</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#111827]">{total}</span>
            <span className="inline-flex items-center text-[10px] font-bold text-[#087A50] bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              ↑ +12%
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-1">vs last 30 days</span>
        </div>
      </div>

      {/* 2. Due Today */}
      <div
        onClick={() => onCardClick?.("due_today")}
        className="bg-[#FFFDF7] border border-[#FEF3C7] rounded-2xl p-4 transition-all hover:shadow-xs cursor-pointer flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs font-medium text-[#475569] block">Due Today</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#111827]">{dueToday}</span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-1">
            {dueToday > 0 ? `${dueToday} follow-up(s) pending` : "No pending"}
          </span>
        </div>
      </div>

      {/* 3. Completed */}
      <div
        onClick={() => onCardClick?.("completed")}
        className="bg-[#F4F9F6] border border-[#E0ECE5] rounded-2xl p-4 transition-all hover:shadow-xs cursor-pointer flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-lg bg-[#E0ECE5] text-[#087A50] flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs font-medium text-[#475569] block">Completed</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#111827]">{completed}</span>
            <span className="inline-flex items-center text-[10px] font-bold text-[#087A50] bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              ↑ +25%
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-1">vs prior period</span>
        </div>
      </div>

      {/* 4. Missed / Overdue */}
      <div
        onClick={() => onCardClick?.("overdue")}
        className="bg-[#FEF8F8] border border-[#FDE2E2] rounded-2xl p-4 transition-all hover:shadow-xs cursor-pointer flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-lg bg-rose-100/80 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-xs font-medium text-[#475569] block">Missed / Overdue</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#111827]">{missedOverdue}</span>
          </div>
          <span
            className={`text-[11px] block mt-1 font-medium ${
              missedOverdue === 0 ? "text-[#087A50]" : "text-rose-600"
            }`}
          >
            {missedOverdue === 0 ? "✓ On track" : `${missedOverdue} requiring attention`}
          </span>
        </div>
      </div>
    </div>
  );
}
