"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarResponse } from "./types";

interface FollowUpCalendarWidgetProps {
  calendarData: CalendarResponse | null;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}

export function FollowUpCalendarWidget({
  calendarData,
  selectedDate,
  onSelectDate,
}: FollowUpCalendarWidgetProps) {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = October

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Convert Sunday (0) to 6, Monday (1) to 0
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const calendarDays = [];

  // Trailing days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      dateStr,
    });
  }

  // Days of current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({
      day: d,
      isCurrentMonth: true,
      dateStr,
    });
  }

  // Next month leading days to complete 5 or 6 rows (multiple of 7)
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      dateStr,
    });
  }

  return (
    <div className="bg-white border border-[#E5EAF0] rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
            <CalendarIcon className="w-3.5 h-3.5 text-[#087A50]" />
            <span>Follow-up Calendar</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between py-2.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold text-[#111827] font-sans">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Day of week abbreviations */}
        <div className="grid grid-cols-7 text-center mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className="text-[10px] font-medium text-[#94A3B8]">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {calendarDays.map((cell, idx) => {
            const isSelected = selectedDate === cell.dateStr;
            const hasEvents = Boolean(calendarData?.days?.[cell.dateStr]?.total);

            return (
              <div key={idx} className="relative py-0.5 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onSelectDate(null);
                    } else {
                      onSelectDate(cell.dateStr);
                    }
                  }}
                  className={`w-6 h-6 text-xs flex items-center justify-center rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#087A50] text-white font-bold shadow-xs"
                      : cell.isCurrentMonth
                      ? "text-[#111827] hover:bg-emerald-50 hover:text-[#087A50] font-medium"
                      : "text-gray-300 hover:text-gray-400"
                  }`}
                >
                  {cell.day}
                </button>
                {hasEvents && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-[#087A50] mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
