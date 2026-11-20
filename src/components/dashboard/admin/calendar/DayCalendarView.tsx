"use client";

import React from "react";
import { CalendarEvent, CalendarStreamsState } from "./types";

interface DayCalendarViewProps {
  selectedDateStr: string;
  events: CalendarEvent[];
  activeStreams: CalendarStreamsState;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function DayCalendarView({
  selectedDateStr,
  events,
  activeStreams,
  onSelectEvent,
}: DayCalendarViewProps) {
  const hours = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"
  ];

  const dayEvents = events.filter((e) => {
    if (e.date !== selectedDateStr) return false;
    if (e.category === "appointment" && !activeStreams.appointments) return false;
    if (e.category === "followup" && !activeStreams.followups) return false;
    if (e.category === "doctor_session" && !activeStreams.doctorSessions) return false;
    if (e.category === "staff_leave" && !activeStreams.staffLeaves) return false;
    if (e.category === "task" && !activeStreams.clinicalTasks) return false;
    if (e.category === "institutional" && !activeStreams.administrativeEvents) return false;
    return true;
  });

  const getBorderColor = (category: string) => {
    switch (category) {
      case "followup":
        return "border-[#16A34A] bg-[#F0FDF4]/50";
      case "doctor_session":
        return "border-[#9333EA] bg-[#FAF5FF]/50";
      case "staff_leave":
        return "border-[#DC2626] bg-[#FEF2F2]/50";
      case "task":
        return "border-[#D97706] bg-[#FFFBEB]/50";
      case "appointment":
      default:
        return "border-[#2563EB] bg-[#EFF6FF]/50";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
      {/* Day Header */}
      <div className="p-4 sm:p-5 border-b border-[#E5EAF0] bg-[#FAFCFB] flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#111827]">
            Schedule for {selectedDateStr}
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            {dayEvents.length} operational events active on this day
          </p>
        </div>
      </div>

      {/* Hourly Timeline */}
      <div className="divide-y divide-[#E5EAF0] max-h-[600px] overflow-y-auto">
        {hours.map((hr) => {
          const matching = dayEvents.filter((ev) => ev.startTime.startsWith(hr.slice(0, 2)));

          return (
            <div key={hr} className="grid grid-cols-12 min-h-[65px] hover:bg-[#F8FAFC]/40 transition-colors">
              <div className="col-span-3 sm:col-span-2 p-3 text-center border-r border-[#E5EAF0] bg-[#F8FAFC]/50 flex items-center justify-center">
                <span className="text-xs font-mono font-semibold text-[#64748B]">{hr}</span>
              </div>

              <div className="col-span-9 sm:col-span-10 p-2 sm:p-3 space-y-2">
                {matching.length === 0 ? (
                  <span className="text-[11px] text-gray-300 italic">No scheduled activities</span>
                ) : (
                  matching.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={`border-l-4 rounded-xl p-3 border shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${getBorderColor(
                        ev.category
                      )}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#111827]">{ev.title}</span>
                          <span className="text-[11px] font-mono text-[#64748B] font-semibold bg-white/80 px-2 py-0.5 rounded border border-[#E2E8F0]">
                            {ev.startTime} - {ev.endTime}
                          </span>
                        </div>
                        <p className="text-xs text-[#475569] mt-1">
                          {ev.description || ev.details}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-[#111827] border border-[#E2E8F0] shadow-2xs">
                          {ev.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
