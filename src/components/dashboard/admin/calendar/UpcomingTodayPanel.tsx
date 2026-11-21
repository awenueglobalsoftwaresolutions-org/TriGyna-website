"use client";

import React from "react";
import { Clock, User, ArrowRight } from "lucide-react";
import { CalendarEvent } from "./types";

interface UpcomingTodayPanelProps {
  events: CalendarEvent[];
  selectedDateStr: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onViewFullAgenda: () => void;
}

export function UpcomingTodayPanel({
  events,
  selectedDateStr,
  onSelectEvent,
  onViewFullAgenda,
}: UpcomingTodayPanelProps) {
  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  const getBorderColor = (category: string) => {
    switch (category) {
      case "followup":
        return "border-[#16A34A]";
      case "doctor_session":
        return "border-[#9333EA]";
      case "staff_leave":
        return "border-[#DC2626]";
      case "task":
        return "border-[#D97706]";
      case "appointment":
      default:
        return "border-[#2563EB]";
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "followup":
        return "Follow-up";
      case "doctor_session":
        return "Doctor Session";
      case "staff_leave":
        return "Staff Leave";
      case "task":
        return "Clinical Task";
      case "appointment":
      default:
        return "Appointment";
    }
  };

  const getParticipantSubtitle = (e: CalendarEvent) => {
    if (e.category === "appointment" || e.category === "followup") {
      const code = e.referenceCode || "REF";
      const name = e.patient?.fullName || e.title;
      return `${code} · ${name}`;
    }
    if (e.category === "doctor_session") {
      return e.doctor?.name || e.title;
    }
    if (e.category === "staff_leave") {
      return e.staff?.name || e.title;
    }
    if (e.category === "task") {
      return `${e.referenceCode || "TSK"} · ${e.title}`;
    }
    return e.title;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#64748B]" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#111827]">Upcoming Today</h2>
              <span className="text-[10px] text-[#64748B] block font-mono">{selectedDateStr}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#087A50] bg-[#E9F8F0] px-2 py-0.5 rounded-full font-mono">
            {events.length}
          </span>
        </div>

        {/* Timeline Entries */}
        <div className="mt-3.5 space-y-3">
          {sortedEvents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-[#64748B]">No upcoming activities for this date.</p>
            </div>
          ) : (
            sortedEvents.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className={`border-l-[3px] pl-3 py-1 hover:bg-[#F8FAFC] rounded-r-xl transition-all cursor-pointer flex items-center justify-between group ${getBorderColor(
                  ev.category
                )}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#64748B] font-mono">
                      {ev.startTime}
                    </span>
                    <span className="text-xs font-bold text-[#111827]">
                      {getCategoryTitle(ev.category)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-[#475569] mt-0.5 truncate max-w-[200px]">
                    {getParticipantSubtitle(ev)}
                  </p>
                </div>

                <div className="w-6 h-6 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-2 border-t border-[#E5EAF0]">
        <button
          onClick={onViewFullAgenda}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#087A50] hover:text-[#075B3D] transition-colors py-1 cursor-pointer group"
        >
          <span>View Full Agenda</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
