"use client";

import React, { useState } from "react";
import {
  CalendarEvent,
  CalendarStreamsState,
} from "./types";
import { X } from "lucide-react";

interface MonthCalendarGridProps {
  currentDate: Date;
  selectedDateStr: string;
  events: CalendarEvent[];
  activeStreams: CalendarStreamsState;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (dateStr: string) => void;
}

export function MonthCalendarGrid({
  currentDate,
  selectedDateStr,
  events,
  activeStreams,
  onSelectEvent,
  onSelectDate,
}: MonthCalendarGridProps) {
  const [overflowDate, setOverflowDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Target clinic Today date is November 1, 2026 or real current date
  const clinicTodayStr = "2026-11-01";

  // Filter events according to active streams
  const filteredEvents = events.filter((e) => {
    if (e.category === "appointment" && !activeStreams.appointments) return false;
    if (e.category === "followup" && !activeStreams.followups) return false;
    if (e.category === "doctor_session" && !activeStreams.doctorSessions) return false;
    if (e.category === "staff_leave" && !activeStreams.staffLeaves) return false;
    if (e.category === "task" && !activeStreams.clinicalTasks) return false;
    if (e.category === "institutional" && !activeStreams.administrativeEvents) return false;
    return true;
  });

  // Index events by date string
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach((ev) => {
    // Single day event
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);

    // If multi-day (e.g. staff leave)
    if (ev.endDate && ev.endDate !== ev.date) {
      const cur = new Date(ev.date);
      const end = new Date(ev.endDate);
      cur.setDate(cur.getDate() + 1);
      while (cur <= end) {
        const dStr = cur.toISOString().split("T")[0];
        if (!eventsByDate[dStr]) eventsByDate[dStr] = [];
        eventsByDate[dStr].push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    }
  });

  // Calculate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Trailing previous month days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, d);
    calendarDays.push({
      dateStr: prevDate.toISOString().split("T")[0],
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const cur = new Date(year, month, d);
    calendarDays.push({
      dateStr: cur.toISOString().split("T")[0],
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Leading next month days to complete 35 or 42 grid cells
  const totalCellsNeeded = calendarDays.length > 35 ? 42 : 35;
  const remainingDays = totalCellsNeeded - calendarDays.length;
  for (let d = 1; d <= remainingDays; d++) {
    const nextDate = new Date(year, month + 1, d);
    calendarDays.push({
      dateStr: nextDate.toISOString().split("T")[0],
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Helper for chip colors matching reference
  const getChipStyles = (color: string) => {
    switch (color) {
      case "green":
        return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]/70 hover:bg-[#D1FAE5]";
      case "purple":
        return "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]/70 hover:bg-[#F3E8FF]";
      case "red":
        return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]/70 hover:bg-[#FEE2E2]";
      case "amber":
        return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]/70 hover:bg-[#FEF3C7]";
      case "gray":
        return "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]";
      case "blue":
      default:
        return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]/70 hover:bg-[#DBEAFE]";
    }
  };

  // Truncate helper
  const formatBadgeText = (e: CalendarEvent, groupCount?: number) => {
    if (e.category === "appointment") {
      return `${e.startTime} Appt (${groupCount || 1})`;
    }
    if (e.category === "followup") {
      return `${e.startTime} Follow-up (${groupCount || 1})`;
    }
    if (e.category === "doctor_session") {
      return `${e.startTime} Session (${groupCount || 1})`;
    }
    if (e.category === "staff_leave") {
      return `Staff Leave (${groupCount || 1})`;
    }
    if (e.category === "task") {
      return `Clinical Tasks (${groupCount || 1})`;
    }
    return `${e.startTime} ${e.title}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
      {/* 7 Columns Weekday Header */}
      <div className="grid grid-cols-7 border-b border-[#E5EAF0] bg-[#FAFCFB]">
        <div className="py-2.5 sm:py-3 text-center text-xs sm:text-sm font-bold text-[#DC2626]">Sun</div>
        <div className="py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-[#475569]">Mon</div>
        <div className="py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-[#475569]">Tue</div>
        <div className="py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-[#475569]">Wed</div>
        <div className="py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-[#475569]">Thu</div>
        <div className="py-2.5 sm:py-3 text-center text-xs sm:text-sm font-semibold text-[#475569]">Fri</div>
        <div className="py-2.5 sm:py-3 text-center text-xs sm:text-sm font-bold text-[#DC2626]">Sat</div>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[#E5EAF0]">
        {calendarDays.map((cell, idx) => {
          const isSelected = cell.dateStr === selectedDateStr;
          const isToday = cell.dateStr === clinicTodayStr;
          const dayEvents = eventsByDate[cell.dateStr] || [];
          const visibleEvents = dayEvents.slice(0, 3);
          const hiddenCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={`${cell.dateStr}-${idx}`}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[96px] sm:min-h-[115px] lg:min-h-[125px] p-1.5 sm:p-2 transition-colors cursor-pointer relative flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? "bg-[#FAFAFA]/70 text-gray-300"
                  : isSelected
                  ? "bg-[#F0FDF4]/50"
                  : "bg-white hover:bg-[#F8FAFC]/60"
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                {isToday ? (
                  <span className="w-6 h-6 rounded-full bg-[#087A50] text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                    {cell.dayNum}
                  </span>
                ) : (
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      !cell.isCurrentMonth
                        ? "text-gray-300"
                        : isSelected
                        ? "text-[#087A50] font-bold"
                        : "text-[#111827]"
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                )}

                {dayEvents.length > 0 && cell.isCurrentMonth && (
                  <span className="text-[10px] text-[#94A3B8] font-mono sm:hidden">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Chips Stack */}
              <div className="mt-1 sm:mt-1.5 space-y-1 flex-1 overflow-hidden">
                {visibleEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    title={`${ev.title} (${ev.startTime})`}
                    className={`w-full text-left truncate rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium border transition-transform active:scale-98 cursor-pointer block ${getChipStyles(
                      ev.color
                    )}`}
                  >
                    {formatBadgeText(ev)}
                  </button>
                ))}

                {/* +N More Link */}
                {hiddenCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverflowDate(cell.dateStr);
                    }}
                    className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] hover:text-[#087A50] hover:underline cursor-pointer pt-0.5 block text-left"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow Modal / Day Popover */}
      {overflowDate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xl max-w-md w-full p-5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div>
                <h3 className="font-bold text-base text-[#111827]">
                  All Scheduled Events
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">{overflowDate}</p>
              </div>
              <button
                onClick={() => setOverflowDate(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-2 flex-1">
              {(eventsByDate[overflowDate] || []).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setOverflowDate(null);
                    onSelectEvent(ev);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer hover:shadow-2xs transition-all ${getChipStyles(
                    ev.color
                  )}`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{ev.title}</span>
                    <span className="font-mono">{ev.startTime}</span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-1 truncate">
                    {ev.description || ev.serviceName}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E5EAF0] text-right">
              <button
                onClick={() => setOverflowDate(null)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
