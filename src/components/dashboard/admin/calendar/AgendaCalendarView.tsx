"use client";

import React from "react";
import { CalendarEvent, CalendarStreamsState } from "./types";
import { Calendar, ArrowRight } from "lucide-react";

interface AgendaCalendarViewProps {
  events: CalendarEvent[];
  activeStreams: CalendarStreamsState;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function AgendaCalendarView({
  events,
  activeStreams,
  onSelectEvent,
}: AgendaCalendarViewProps) {
  // Filter events by active stream
  const filteredEvents = events.filter((e) => {
    if (e.category === "appointment" && !activeStreams.appointments) return false;
    if (e.category === "followup" && !activeStreams.followups) return false;
    if (e.category === "doctor_session" && !activeStreams.doctorSessions) return false;
    if (e.category === "staff_leave" && !activeStreams.staffLeaves) return false;
    if (e.category === "task" && !activeStreams.clinicalTasks) return false;
    if (e.category === "institutional" && !activeStreams.administrativeEvents) return false;
    return true;
  });

  // Group by date
  const grouped: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach((e) => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });

  const sortedDates = Object.keys(grouped).sort();

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "followup":
        return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
      case "doctor_session":
        return "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]";
      case "staff_leave":
        return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
      case "task":
        return "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
      case "appointment":
      default:
        return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs p-5 lg:p-6 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Comprehensive Institutional Agenda</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Chronological breakdown of {filteredEvents.length} scheduled events
          </p>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-medium text-[#64748B]">No events match the selected calendar streams.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const dateEvents = grouped[dateStr];
            const dateObj = new Date(dateStr);
            const formattedHeader = dateObj.toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <div key={dateStr} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#087A50]" />
                  <h3 className="text-sm font-bold text-[#111827]">{formattedHeader}</h3>
                  <span className="text-xs text-[#64748B] font-mono">({dateEvents.length})</span>
                </div>

                {/* Event items for this date */}
                <div className="grid gap-2.5">
                  {dateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className="border border-[#E5EAF0] rounded-xl p-3.5 hover:border-[#087A50]/50 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-center shrink-0 w-20 py-1 bg-[#F8FAFC] border border-[#E5EAF0] rounded-lg">
                          <p className="text-xs font-bold text-[#111827] font-mono">{ev.startTime}</p>
                          <p className="text-[10px] text-[#64748B] font-mono">{ev.endTime}</p>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded border capitalize ${getCategoryBadge(
                                ev.category
                              )}`}
                            >
                              {ev.category.replace("_", " ")}
                            </span>
                            <span className="text-xs font-bold text-[#111827]">{ev.title}</span>
                            {ev.referenceCode && (
                              <span className="text-[11px] font-mono text-[#64748B] bg-gray-100 px-1.5 py-0.5 rounded">
                                {ev.referenceCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">
                            {ev.description || ev.serviceName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]">
                          {ev.status}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#64748B]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
