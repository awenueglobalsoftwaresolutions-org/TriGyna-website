"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import { CalendarHeader } from "./calendar/CalendarHeader";
import { CalendarKpiCards } from "./calendar/CalendarKpiCards";
import { CalendarControlsBar } from "./calendar/CalendarControlsBar";
import { MonthCalendarGrid } from "./calendar/MonthCalendarGrid";
import { WeekCalendarView } from "./calendar/WeekCalendarView";
import { DayCalendarView } from "./calendar/DayCalendarView";
import { AgendaCalendarView } from "./calendar/AgendaCalendarView";
import { CalendarStreamsPanel } from "./calendar/CalendarStreamsPanel";
import { UpcomingTodayPanel } from "./calendar/UpcomingTodayPanel";
import { EventDetailDrawer } from "./calendar/EventDetailDrawer";
import { CreateEventModal } from "./calendar/CreateEventModal";
import { RescheduleModal } from "./calendar/RescheduleModal";
import { CancelEventModal } from "./calendar/CancelEventModal";
import { ExportModal } from "./calendar/ExportModal";
import { ImportModal } from "./calendar/ImportModal";
import { FilterDrawer } from "./calendar/FilterDrawer";
import {
  CalendarEvent,
  CalendarStats,
  CalendarStreamsState,
  CalendarFilterState,
  CalendarViewMode,
} from "./calendar/types";

interface CalendarTabProps {
  showNotification: (msg: string, isErr?: boolean) => void;
  onNavigateToTab?: (tabId: string) => void;
}

export function CalendarTab({ showNotification, onNavigateToTab }: CalendarTabProps) {
  // Current operational date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  // Data states
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [streamCounts, setStreamCounts] = useState({
    appointments: 0,
    followups: 0,
    doctorSessions: 0,
    staffLeaves: 0,
    clinicalTasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Active stream checkboxes in right panel
  const [activeStreams, setActiveStreams] = useState<CalendarStreamsState>({
    appointments: true,
    followups: true,
    doctorSessions: true,
    staffLeaves: true,
    clinicalTasks: true,
    administrativeEvents: true,
  });

  // Filter drawer state
  const [filters, setFilters] = useState<CalendarFilterState>({
    doctorId: "",
    staffId: "",
    patientId: "",
    status: "all",
    search: "",
  });

  // Interactive Drawers & Modals
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
  const [cancelEvent, setCancelEvent] = useState<CalendarEvent | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load unified calendar events from backend
  const loadCalendarData = useCallback(async () => {
    try {
      setIsLoading(true);
      const startStr = new Date(year, month, 1).toISOString().split("T")[0];
      const endStr = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const params = new URLSearchParams();
      params.append("startDate", startStr);
      params.append("endDate", endStr);
      if (filters.doctorId) params.append("doctorId", filters.doctorId);
      if (filters.staffId) params.append("staffId", filters.staffId);
      if (filters.patientId) params.append("patientId", filters.patientId);
      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);

      // Concurrent fetch of Events, Stats, and Agenda
      const [eventsRes, statsRes, agendaRes] = await Promise.all([
        api.get<{ events: CalendarEvent[]; summary?: Record<string, number> }>(`/calendar/events?${params.toString()}`),
        api.get<CalendarStats>(`/calendar/stats?year=${year}&month=${month}`),
        api.get<{ events: CalendarEvent[] }>(`/calendar/agenda?date=${selectedDateStr}`),
      ]);

      if (eventsRes.data?.events) {
        setEvents(eventsRes.data.events);
        if (eventsRes.data.summary) {
          setStreamCounts({
            appointments: eventsRes.data.summary.appointments || 0,
            followups: eventsRes.data.summary.followups || 0,
            doctorSessions: eventsRes.data.summary.doctorSessions || 0,
            staffLeaves: eventsRes.data.summary.staffLeaves || 0,
            clinicalTasks: eventsRes.data.summary.clinicalTasks || 0,
          });
        }
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (agendaRes.data?.events) {
        setAgendaEvents(agendaRes.data.events);
      }
    } catch {
      showNotification("Failed to load master calendar data", true);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, selectedDateStr, filters, showNotification]);

  useEffect(() => {
    let isMounted = true;
    const executeFetch = async () => {
      try {
        const startStr = new Date(year, month, 1).toISOString().split("T")[0];
        const endStr = new Date(year, month + 1, 0).toISOString().split("T")[0];

        const params = new URLSearchParams();
        params.append("startDate", startStr);
        params.append("endDate", endStr);
        if (filters.doctorId) params.append("doctorId", filters.doctorId);
        if (filters.staffId) params.append("staffId", filters.staffId);
        if (filters.patientId) params.append("patientId", filters.patientId);
        if (filters.status && filters.status !== "all") params.append("status", filters.status);
        if (filters.search) params.append("search", filters.search);

        const [eventsRes, statsRes, agendaRes] = await Promise.all([
          api.get<{ events: CalendarEvent[]; summary?: Record<string, number> }>(`/calendar/events?${params.toString()}`),
          api.get<CalendarStats>(`/calendar/stats?year=${year}&month=${month}`),
          api.get<{ events: CalendarEvent[] }>(`/calendar/agenda?date=${selectedDateStr}`),
        ]);

        if (isMounted) {
          if (eventsRes.data?.events) {
            setEvents(eventsRes.data.events);
            if (eventsRes.data.summary) {
              setStreamCounts({
                appointments: eventsRes.data.summary.appointments || 0,
                followups: eventsRes.data.summary.followups || 0,
                doctorSessions: eventsRes.data.summary.doctorSessions || 0,
                staffLeaves: eventsRes.data.summary.staffLeaves || 0,
                clinicalTasks: eventsRes.data.summary.clinicalTasks || 0,
              });
            }
          }
          if (statsRes.data) setStats(statsRes.data);
          if (agendaRes.data?.events) setAgendaEvents(agendaRes.data.events);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          showNotification("Failed to load master calendar data", true);
          setIsLoading(false);
        }
      }
    };

    executeFetch();

    return () => {
      isMounted = false;
    };
  }, [year, month, selectedDateStr, filters, showNotification]);

  // Navigation handlers
  const handlePrevMonth = () => {
    const next = new Date(year, month - 1, 1);
    setCurrentDate(next);
    setSelectedDateStr(next.toISOString().split("T")[0]);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setCurrentDate(next);
    setSelectedDateStr(next.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    const today = new Date(2026, 10, 1);
    setCurrentDate(today);
    setSelectedDateStr("2026-11-01");
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      setCurrentDate(d);
    }
  };

  // Stream toggle handlers
  const handleToggleStream = (key: keyof CalendarStreamsState) => {
    setActiveStreams((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAllStreams = () => {
    setActiveStreams({
      appointments: true,
      followups: true,
      doctorSessions: true,
      staffLeaves: true,
      clinicalTasks: true,
      administrativeEvents: true,
    });
  };

  const handleClearAllStreams = () => {
    setActiveStreams({
      appointments: false,
      followups: false,
      doctorSessions: false,
      staffLeaves: false,
      clinicalTasks: false,
      administrativeEvents: false,
    });
  };

  const hasActiveFilters = Boolean(
    filters.doctorId || filters.staffId || filters.patientId || filters.search || (filters.status && filters.status !== "all")
  );

  return (
    <div className="space-y-5 lg:space-y-6 dashboard-font-reset">
      {/* 1. MASTER INSTITUTIONAL CALENDAR HEADER */}
      <CalendarHeader
        onCreateEvent={() => setCreateModalOpen(true)}
        onImport={() => setImportModalOpen(true)}
        onExport={() => setExportModalOpen(true)}
      />

      {/* 2. DYNAMIC 5 KPI METRICS CARDS */}
      <CalendarKpiCards stats={stats} isLoading={isLoading} />

      {/* 3. CALENDAR CONTROLS & NAVIGATION BAR */}
      <CalendarControlsBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onDateSelect={(d) => {
          setCurrentDate(d);
          setSelectedDateStr(d.toISOString().split("T")[0]);
        }}
        onRefresh={loadCalendarData}
        isLoading={isLoading}
        onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 4. MAIN WORKSPACE (2-COLUMN REFERENCE LAYOUT) */}
      <div className="grid grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* LEFT COLUMN: PRIMARY CALENDAR VIEW (MONTH / WEEK / DAY / AGENDA) */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          {viewMode === "month" && (
            <MonthCalendarGrid
              currentDate={currentDate}
              selectedDateStr={selectedDateStr}
              events={events}
              activeStreams={activeStreams}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              onSelectDate={handleSelectDate}
            />
          )}

          {viewMode === "week" && (
            <WeekCalendarView
              currentDate={currentDate}
              events={events}
              activeStreams={activeStreams}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              onSelectDate={handleSelectDate}
            />
          )}

          {viewMode === "day" && (
            <DayCalendarView
              selectedDateStr={selectedDateStr}
              events={events}
              activeStreams={activeStreams}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          )}

          {viewMode === "agenda" && (
            <AgendaCalendarView
              events={events}
              activeStreams={activeStreams}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          )}
        </div>

        {/* RIGHT COLUMN: CALENDAR STREAMS & UPCOMING TODAY PANELS */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          {/* PANEL 1: CALENDAR STREAMS */}
          <CalendarStreamsPanel
            streams={activeStreams}
            onToggleStream={handleToggleStream}
            onSelectAll={handleSelectAllStreams}
            onClearAll={handleClearAllStreams}
            streamCounts={streamCounts}
          />

          {/* PANEL 2: UPCOMING TODAY AGENDAS */}
          <UpcomingTodayPanel
            events={agendaEvents.length > 0 ? agendaEvents : events.filter((e) => e.date === selectedDateStr)}
            selectedDateStr={selectedDateStr}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
            onViewFullAgenda={() => setViewMode("agenda")}
          />
        </div>
      </div>

      {/* EVENT DETAIL DRAWER (SLIDE-OVER ON RIGHT) */}
      <EventDetailDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onReschedule={(ev) => {
          setSelectedEvent(null);
          setRescheduleEvent(ev);
        }}
        onCancel={(ev) => {
          setSelectedEvent(null);
          setCancelEvent(ev);
        }}
        onNavigateToTab={onNavigateToTab}
      />

      {/* CREATE EVENT MULTI-STEP MODAL */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadCalendarData}
        showNotification={showNotification}
        defaultDate={selectedDateStr}
      />

      {/* RESCHEDULE EVENT MODAL */}
      <RescheduleModal
        event={rescheduleEvent}
        isOpen={Boolean(rescheduleEvent)}
        onClose={() => setRescheduleEvent(null)}
        onSuccess={loadCalendarData}
        showNotification={showNotification}
      />

      {/* CANCEL EVENT MODAL */}
      <CancelEventModal
        event={cancelEvent}
        isOpen={Boolean(cancelEvent)}
        onClose={() => setCancelEvent(null)}
        onSuccess={loadCalendarData}
        showNotification={showNotification}
      />

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        showNotification={showNotification}
        currentDate={currentDate}
      />

      {/* IMPORT MODAL */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={loadCalendarData}
        showNotification={showNotification}
      />

      {/* FILTER DRAWER */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onApplyFilters={(f) => {
          setFilters(f);
        }}
        onResetFilters={() => {
          setFilters({
            doctorId: "",
            staffId: "",
            patientId: "",
            status: "all",
            search: "",
          });
        }}
      />
    </div>
  );
}
