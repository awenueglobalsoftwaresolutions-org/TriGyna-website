"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Loader2,
  RefreshCw,
  X,
  Stethoscope,
  Briefcase,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface CalendarEvent {
  id: string;
  rawId: string;
  title: string;
  eventType: "appointment" | "followup" | "leave" | "task";
  date: string;
  endDate?: string;
  time: string;
  status: string;
  doctorName?: string;
  patientName?: string;
  staffName?: string;
  assignedStaff?: string;
  details: string;
  color: string;
}

export function CalendarTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const firstDay = new Date(year, month - 1, 1).toISOString();
      const lastDay = new Date(year, month + 2, 0).toISOString();

      const params = new URLSearchParams();
      params.append("startDate", firstDay);
      params.append("endDate", lastDay);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const res = await api.get<{ events: CalendarEvent[] }>(`/calendar/events?${params.toString()}`);
      if (res.data?.events) {
        setEvents(res.data.events);
      }
    } catch {
      showNotification("Failed to load master calendar events", true);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, typeFilter, showNotification]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const firstDay = new Date(year, month - 1, 1).toISOString();
        const lastDay = new Date(year, month + 2, 0).toISOString();

        const params = new URLSearchParams();
        params.append("startDate", firstDay);
        params.append("endDate", lastDay);
        if (typeFilter !== "all") params.append("type", typeFilter);

        const res = await api.get<{ events: CalendarEvent[] }>(`/calendar/events?${params.toString()}`);
        if (isMounted && res.data?.events) {
          setEvents(res.data.events);
        }
      } catch {
        if (isMounted) showNotification("Failed to load master calendar events", true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [year, month, typeFilter, showNotification]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days for the current month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
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
    const curDate = new Date(year, month, d);
    calendarDays.push({
      dateStr: curDate.toISOString().split("T")[0],
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete 35 or 42 grid
  const remaining = 35 - calendarDays.length;
  if (remaining > 0) {
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      calendarDays.push({
        dateStr: nextDate.toISOString().split("T")[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const getEventBadgeClass = (color: string) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "purple":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "amber":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "red":
        return "bg-red-50 text-red-800 border-red-200";
      default:
        return "bg-blue-50 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Controls */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734]/10 text-[#154734] flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#18231D]">Master Institutional Calendar</h2>
              <p className="text-xs text-[#68756D] mt-0.5">
                Unified scheduling: doctor appointments, care follow-ups, staff leaves, and clinical tasks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handleToday}
              className="px-3.5 py-1.5 border border-[#E2E9E3] text-xs font-semibold text-[#154734] hover:bg-[#F7F9F7] rounded-xl cursor-pointer transition-colors"
            >
              Today
            </button>
            <div className="flex items-center border border-[#E2E9E3] rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-gray-100 text-gray-600 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold font-serif text-[#18231D] select-none">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-gray-100 text-gray-600 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-[#E2E9E3]">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#68756D]" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none font-medium"
            >
              <option value="all">All Calendar Streams</option>
              <option value="appointment">Doctor Appointments</option>
              <option value="followup">Care Follow-ups</option>
              <option value="leave">Staff Leaves</option>
              <option value="task">Staff Tasks</option>
            </select>

            <span className="text-[11px] text-[#68756D] font-mono ml-2">
              {events.length} active events
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "month" ? "agenda" : "month")}
              className="px-3.5 py-1.5 border border-[#E2E9E3] rounded-xl text-xs font-semibold text-[#154734] hover:bg-[#F7F9F7] cursor-pointer transition-colors"
            >
              {viewMode === "month" ? "Agenda View" : "Month Grid"}
            </button>
            <button
              onClick={loadEvents}
              disabled={isLoading}
              className="p-1.5 border border-[#E2E9E3] rounded-xl hover:bg-gray-50 text-[#154734] cursor-pointer transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* View: Month Grid */}
      {viewMode === "month" && (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4 sm:p-6 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-[#68756D] flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
              <span>Synchronizing institutional calendar streams...</span>
            </div>
          ) : (
            <div>
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-[#E2E9E3] pb-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-[#68756D]">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 auto-rows-fr border-l border-t border-[#E2E9E3]">
                {calendarDays.map((cd, index) => {
                  const dayEvents = events.filter((e) => e.date === cd.dateStr);
                  const isToday = cd.dateStr === todayStr;

                  return (
                    <div
                      key={index}
                      className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 border-r border-b border-[#E2E9E3] flex flex-col justify-between transition-colors ${
                        !cd.isCurrentMonth
                          ? "bg-gray-50/50 text-gray-400"
                          : isToday
                          ? "bg-emerald-50/20"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? "bg-[#154734] text-white shadow-xs"
                              : cd.isCurrentMonth
                              ? "text-[#18231D]"
                              : "text-gray-400"
                          }`}
                        >
                          {cd.dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-gray-400 font-mono font-bold sm:hidden">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((evt) => (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer hover:opacity-85 transition-opacity ${getEventBadgeClass(
                              evt.color
                            )}`}
                            title={evt.title}
                          >
                            <span className="font-bold mr-1">{evt.time}</span>
                            <span>{evt.title}</span>
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-[#68756D] font-bold block pl-1">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View: Agenda List */}
      {viewMode === "agenda" && (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#18231D] font-serif">Month Agenda Stream</h3>
          {events.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#68756D]">No events scheduled this period.</div>
          ) : (
            <div className="divide-y divide-[#E2E9E3]">
              {events
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((evt) => (
                  <div
                    key={evt.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#154734]">{evt.date}</span>
                        <span className="text-gray-400 font-mono">({evt.time})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getEventBadgeClass(
                            evt.color
                          )}`}
                        >
                          {evt.eventType}
                        </span>
                      </div>
                      <h4 className="font-semibold text-[#18231D] mt-1">{evt.title}</h4>
                      <p className="text-[11px] text-[#68756D] mt-0.5">{evt.details}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      className="text-xs text-[#154734] font-semibold hover:underline self-end sm:self-auto cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: EVENT DETAILS */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedEvent(null)} />
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E9E3]">
              <div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getEventBadgeClass(
                    selectedEvent.color
                  )}`}
                >
                  {selectedEvent.eventType}
                </span>
                <h3 className="text-base font-serif font-bold text-[#18231D] mt-1.5">{selectedEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl space-y-1.5">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#68756D]">Date:</span>
                  <span className="font-bold text-[#18231D]">{selectedEvent.date}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#68756D]">Time:</span>
                  <span className="font-bold text-[#154734]">{selectedEvent.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#68756D]">Status:</span>
                  <span className="font-semibold capitalize text-[#18231D]">{selectedEvent.status}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[#18231D] mb-1">Operational Event Details</h4>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[#18231D] leading-relaxed">
                  {selectedEvent.details}
                </div>
              </div>

              {selectedEvent.patientName && (
                <div className="flex items-center gap-2 text-[#68756D]">
                  <User className="w-3.5 h-3.5 text-[#154734]" />
                  <span>Patient: <strong className="text-[#18231D]">{selectedEvent.patientName}</strong></span>
                </div>
              )}

              {selectedEvent.doctorName && (
                <div className="flex items-center gap-2 text-[#68756D]">
                  <Stethoscope className="w-3.5 h-3.5 text-[#154734]" />
                  <span>Consultant: <strong className="text-[#18231D]">{selectedEvent.doctorName}</strong></span>
                </div>
              )}

              {selectedEvent.staffName && (
                <div className="flex items-center gap-2 text-[#68756D]">
                  <Briefcase className="w-3.5 h-3.5 text-[#154734]" />
                  <span>Staff Member: <strong className="text-[#18231D]">{selectedEvent.staffName}</strong></span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer shadow-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
