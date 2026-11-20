"use client";

import React from "react";
import { CalendarEvent, CalendarStreamsState } from "./types";

interface WeekCalendarViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  activeStreams: CalendarStreamsState;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (dateStr: string) => void;
}

export function WeekCalendarView({
  currentDate,
  events,
  activeStreams,
  onSelectEvent,
  onSelectDate,
}: WeekCalendarViewProps) {
  // Compute start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay(); // 0 is Sun
  startOfWeek.setDate(startOfWeek.getDate() - day);

  const weekDays: Array<{ date: Date; dateStr: string; dayNum: number; dayName: string }> = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    weekDays.push({
      date: d,
      dateStr: d.toISOString().split("T")[0],
      dayNum: d.getDate(),
      dayName: dayNames[i],
    });
  }

  const hours = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"
  ];

  // Filter events by stream
  const filteredEvents = events.filter((e) => {
    if (e.category === "appointment" && !activeStreams.appointments) return false;
    if (e.category === "followup" && !activeStreams.followups) return false;
    if (e.category === "doctor_session" && !activeStreams.doctorSessions) return false;
    if (e.category === "staff_leave" && !activeStreams.staffLeaves) return false;
    if (e.category === "task" && !activeStreams.clinicalTasks) return false;
    if (e.category === "institutional" && !activeStreams.administrativeEvents) return false;
    return true;
  });

  const getChipStyles = (color: string) => {
    switch (color) {
      case "green":
        return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]/70";
      case "purple":
        return "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]/70";
      case "red":
        return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]/70";
      case "amber":
        return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]/70";
      case "blue":
      default:
        return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]/70";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
      {/* Week Header */}
      <div className="grid grid-cols-8 border-b border-[#E5EAF0] bg-[#FAFCFB]">
        <div className="p-3 text-center text-xs font-semibold text-[#64748B] border-r border-[#E5EAF0]">
          Time
        </div>
        {weekDays.map((wd, idx) => (
          <div
            key={wd.dateStr}
            onClick={() => onSelectDate(wd.dateStr)}
            className={`p-3 text-center cursor-pointer transition-colors ${
              idx === 0 || idx === 6 ? "text-[#DC2626]" : "text-[#111827]"
            }`}
          >
            <p className="text-xs font-semibold">{wd.dayName}</p>
            <p className="text-sm font-bold mt-0.5">{wd.dayNum}</p>
          </div>
        ))}
      </div>

      {/* Hourly Grid */}
      <div className="divide-y divide-[#E5EAF0] max-h-[600px] overflow-y-auto">
        {hours.map((hr) => (
          <div key={hr} className="grid grid-cols-8 min-h-[55px]">
            {/* Time Label */}
            <div className="p-2 text-center text-[11px] font-mono font-semibold text-[#64748B] border-r border-[#E5EAF0] bg-[#F8FAFC]/50">
              {hr}
            </div>

            {/* 7 Day slots */}
            {weekDays.map((wd) => {
              const matchingEvents = filteredEvents.filter(
                (ev) => ev.date === wd.dateStr && ev.startTime.startsWith(hr.slice(0, 2))
              );

              return (
                <div
                  key={`${wd.dateStr}-${hr}`}
                  className="p-1 border-r border-[#E5EAF0] hover:bg-[#F8FAFC]/50 transition-colors flex flex-col gap-1 overflow-hidden"
                >
                  {matchingEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={`text-left truncate rounded-md px-1.5 py-1 text-[10px] font-semibold border cursor-pointer ${getChipStyles(
                        ev.color
                      )}`}
                    >
                      {ev.startTime} · {ev.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
