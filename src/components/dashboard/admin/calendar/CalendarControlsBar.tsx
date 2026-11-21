"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  Calendar,
  Clock,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
} from "lucide-react";
import { CalendarViewMode } from "./types";

interface CalendarControlsBarProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDateSelect: (d: Date) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenFilterDrawer: () => void;
  hasActiveFilters: boolean;
}

export function CalendarControlsBar({
  viewMode,
  onViewModeChange,
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDateSelect,
  onRefresh,
  isLoading,
  onOpenFilterDrawer,
  hasActiveFilters,
}: CalendarControlsBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleSelectMonth = (mIndex: number) => {
    const nextDate = new Date(year, mIndex, 1);
    onDateSelect(nextDate);
    setDropdownOpen(false);
  };

  const handleSelectYear = (nextYear: number) => {
    const nextDate = new Date(nextYear, currentDate.getMonth(), 1);
    onDateSelect(nextDate);
    setDropdownOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 relative">
      {/* LEFT: View Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
        <button
          onClick={() => onViewModeChange("month")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            viewMode === "month"
              ? "bg-[#087A50] text-white shadow-2xs"
              : "text-[#64748B] hover:text-[#111827] hover:bg-white"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Month</span>
        </button>

        <button
          onClick={() => onViewModeChange("week")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            viewMode === "week"
              ? "bg-[#087A50] text-white shadow-2xs"
              : "text-[#64748B] hover:text-[#111827] hover:bg-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Week</span>
        </button>

        <button
          onClick={() => onViewModeChange("day")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            viewMode === "day"
              ? "bg-[#087A50] text-white shadow-2xs"
              : "text-[#64748B] hover:text-[#111827] hover:bg-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Day</span>
        </button>

        <button
          onClick={() => onViewModeChange("agenda")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            viewMode === "agenda"
              ? "bg-[#087A50] text-white shadow-2xs"
              : "text-[#64748B] hover:text-[#111827] hover:bg-white"
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Agenda</span>
        </button>
      </div>

      {/* CENTER: Month & Year Navigation */}
      <div className="flex items-center justify-center gap-2 relative">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 rounded-full border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#334155] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Previous Period"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Month Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#F8FAFC] rounded-xl cursor-pointer text-sm sm:text-base font-bold font-sans text-[#111827] select-none transition-colors"
          >
            <span>{`${monthName} ${year}`}</span>
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white border border-[#E5EAF0] rounded-2xl shadow-lg p-3 w-64">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5EAF0]">
                <button
                  onClick={() => handleSelectYear(year - 1)}
                  className="px-2 py-1 text-xs font-bold text-[#64748B] hover:text-[#111827] hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  {year - 1}
                </button>
                <span className="text-xs font-bold text-[#087A50] font-mono">{year}</span>
                <button
                  onClick={() => handleSelectYear(year + 1)}
                  className="px-2 py-1 text-xs font-bold text-[#64748B] hover:text-[#111827] hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  {year + 1}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {months.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => handleSelectMonth(idx)}
                    className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                      currentDate.getMonth() === idx
                        ? "bg-[#087A50] text-white font-bold"
                        : "text-[#334155] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onNextMonth}
          className="w-8 h-8 rounded-full border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#334155] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Next Period"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* RIGHT: Today & Auxiliary Tools */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onToday}
          className="px-4 py-1.5 border border-[#087A50]/30 hover:border-[#087A50] bg-white hover:bg-[#E9F8F0]/40 text-[#087A50] text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-2xs"
        >
          Today
        </button>

        <button
          onClick={onOpenFilterDrawer}
          className={`p-2 border rounded-xl transition-colors cursor-pointer ${
            hasActiveFilters
              ? "bg-[#E9F8F0] border-[#087A50] text-[#087A50]"
              : "border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#64748B]"
          }`}
          title="Search & Filters"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#087A50] rounded-xl transition-colors cursor-pointer shadow-2xs"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
