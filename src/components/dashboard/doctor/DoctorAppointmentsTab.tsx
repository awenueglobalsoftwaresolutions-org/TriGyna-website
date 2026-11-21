"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Search,
  Filter,
  Clock,
  User,
  Users,
  Stethoscope,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Phone,
  RefreshCw,
  Loader2,
  Video,
  ExternalLink,
  Link2,
  X,
  Copy,
  Check,
  Receipt,
  Eye,
  Printer,
  Play,
  UserX,
  Ban,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  List,
  Columns3,
  LayoutGrid,
  Download,
  Plus,
  FileText,
  ShieldCheck,
  Repeat,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";

export type AppointmentViewMode = "list" | "calendar" | "day" | "week" | "month";

export interface AppointmentItem {
  _id: string;
  appointmentCode: string;
  startTime: string;
  endTime?: string;
  appointmentDate: string;
  patientId: {
    _id: string;
    fullName: string;
    age?: number;
    gender?: string;
    patientCode: string;
    phone?: string;
    allergies?: string[];
    medicalHistory?: string;
  };
  serviceName: string;
  mode: string;
  status:
    | "scheduled"
    | "confirmed"
    | "checked_in"
    | "waiting"
    | "in_queue"
    | "awaiting"
    | "in_consultation"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "rescheduled"
    | "no_show";
  notes?: string;
  meetingProvider?: "google_meet" | "zoom" | "none";
  meetingLink?: string;
  meetingStatus?: "pending" | "ready" | "invalid" | "updated" | "expired";
  billing?: {
    invoiceId?: string;
    invoiceNumber?: string;
    status?: string;
    totalAmount?: number;
    paidAmount?: number;
    balanceAmount?: number;
    receiptId?: string;
    receiptNumber?: string;
  } | null;
  paymentStatus?: string;
  createdAt?: string;
}

export interface AppointmentSummaryData {
  kpis: {
    todayAppointments: number;
    todayAppointmentsDelta?: string;
    upcomingAppointments: number;
    upcomingAppointmentsDelta?: string;
    awaitingConsultation: number;
    awaitingDelta?: string;
    completedConsultations: number;
    completedDelta?: string;
    cancelled: number;
    cancelledDelta?: string;
    rescheduled: number;
    rescheduledDelta?: string;
  };
  quickFilters: {
    all: number;
    confirmed: number;
    awaiting: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
  };
}

interface DoctorAppointmentsTabProps {
  onOpenConsultation: (appointmentId: string, patientId: string) => void;
  onOpenPatientProfile: (patientId: string) => void;
}

// Helpers for soft avatar colors matching reference screenshot
function getAvatarStyle(name: string = "Patient") {
  const code = (name.charCodeAt(0) || 65) + (name.charCodeAt(name.length - 1) || 65);
  const palettes = [
    { bg: "bg-[#FFEDD5]", text: "text-[#EA580C]" }, // AM orange
    { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" }, // SK purple
    { bg: "bg-[#CCFBF1]", text: "text-[#0D9488]" }, // PR teal
    { bg: "bg-[#FCE7F3]", text: "text-[#DB2777]" }, // RS pink
    { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]" }, // NP blue
    { bg: "bg-[#FEF3C7]", text: "text-[#D97706]" }, // DG yellow
    { bg: "bg-[#E0E7FF]", text: "text-[#4F46E5]" }, // MS indigo
  ];
  return palettes[code % palettes.length];
}

function getInitials(name: string = "Patient"): string {
  if (!name) return "PT";
  const parts = name.trim().replace(/^Dr\.\s*/i, "").split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "Today";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getTodayDateString(): string {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function DoctorAppointmentsTab({
  onOpenConsultation,
  onOpenPatientProfile,
}: DoctorAppointmentsTabProps) {
  const initialDate = getTodayDateString();
  const [initYear, initMonth] = initialDate.split("-").map(Number);

  // View mode
  const [viewMode, setViewMode] = useState<AppointmentViewMode>("list");

  // Selected date (defaults to current date in IST)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Calendar month/year navigation state
  const [calendarYear, setCalendarYear] = useState<number>(initYear || 2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(initMonth || 11);
  const [dateDots, setDateDots] = useState<Record<string, number>>({});

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);

  // Appointments data
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalAppointments, setTotalAppointments] = useState<number>(0);

  // Summary & Quick Filter counts
  const [summaryData, setSummaryData] = useState<AppointmentSummaryData | null>(null);

  // Modals & Drawers State
  const [detailDrawerAppt, setDetailDrawerAppt] = useState<AppointmentItem | null>(null);
  const [meetingModalAppt, setMeetingModalAppt] = useState<AppointmentItem | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<"google_meet" | "zoom">("google_meet");
  const [meetingUrlInput, setMeetingUrlInput] = useState<string>("");
  const [savingMeeting, setSavingMeeting] = useState<boolean>(false);
  const [meetingMsg, setMeetingMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [addApptModalOpen, setAddApptModalOpen] = useState<boolean>(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Record Encounter Outcome Modal States
  const [outcomeModalAppt, setOutcomeModalAppt] = useState<AppointmentItem | null>(null);
  const [outcomeStatus, setOutcomeStatus] = useState<
    "completed" | "in_consultation" | "no_show" | "cancelled" | "rescheduled"
  >("completed");
  const [outcomeNotes, setOutcomeNotes] = useState<string>("");
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState<boolean>(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

  // Reschedule & Cancel Modal States
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<AppointmentItem | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>("");
  const [newRescheduleTime, setNewRescheduleTime] = useState<string>("10:00 AM");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  const [cancelModalAppt, setCancelModalAppt] = useState<AppointmentItem | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Add Appointment form state
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [newApptPatientId, setNewApptPatientId] = useState<string>("");
  const [newApptService, setNewApptService] = useState<string>("PCOD/PCOS Management");
  const [newApptDate, setNewApptDate] = useState<string>(selectedDate);
  const [newApptTime, setNewApptTime] = useState<string>("09:00 AM");
  const [newApptNotes, setNewApptNotes] = useState<string>("");
  const [isCreatingAppt, setIsCreatingAppt] = useState<boolean>(false);
  const [createApptError, setCreateApptError] = useState<string | null>(null);

  // Fetch Summary & KPI Counts
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get<AppointmentSummaryData>(
        `/api/v1/doctor/appointments/summary?date=${selectedDate}`
      );
      if (res.data) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.warn("Failed to load appointment summary", err);
    }
  }, [selectedDate]);

  // Fetch Calendar date counts for monthly view & dots
  const fetchCalendarSummary = useCallback(async () => {
    try {
      const res = await api.get<{ dateCounts: Record<string, number> }>(
        `/api/v1/doctor/appointments/calendar-summary?year=${calendarYear}&month=${calendarMonth}`
      );
      if (res.data?.dateCounts) {
        setDateDots(res.data.dateCounts);
      }
    } catch (err) {
      console.warn("Failed to load calendar summary dots", err);
    }
  }, [calendarYear, calendarMonth]);

  // Fetch Appointments List
  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedDate && viewMode === "list") {
        queryParams.set("date", selectedDate);
      }
      if (statusFilter && statusFilter !== "all") {
        queryParams.set("status", statusFilter);
      }
      if (search.trim()) {
        queryParams.set("search", search.trim());
      }
      queryParams.set("limit", "50");

      const res = await api.get<{
        appointments?: AppointmentItem[];
        total?: number;
        quickFilters?: AppointmentSummaryData["quickFilters"];
      }>(`/api/v1/doctor/appointments?${queryParams.toString()}`);

      const dataObj = res.data;
      const list = dataObj?.appointments || [];
      setAppointments(list);
      setTotalAppointments(dataObj?.total ?? list.length);

      if (dataObj?.quickFilters) {
        setSummaryData((prev) =>
          prev ? { ...prev, quickFilters: dataObj.quickFilters! } : prev
        );
      }
    } catch (err) {
      console.error("Failed to load appointments", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, statusFilter, search, viewMode]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchCalendarSummary();
  }, [fetchCalendarSummary]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load patients list for Add Appointment modal
  useEffect(() => {
    if (addApptModalOpen && patientsList.length === 0) {
      api.get<{ patients?: any[] }>(`/api/v1/doctor/patients?limit=50`).then((res) => {
        const pts = res.data?.patients || [];
        setPatientsList(pts);
        if (pts.length > 0 && !newApptPatientId) {
          setNewApptPatientId(pts[0]._id);
        }
      });
    }
  }, [addApptModalOpen, patientsList.length, newApptPatientId]);

  // Export to CSV
  const handleExportCSV = () => {
    const token = getToken();
    const baseUrl = getBaseUrl().replace(/\/+$/, "");
    const query = new URLSearchParams({
      date: selectedDate,
      status: statusFilter,
    });
    window.open(`${baseUrl}/doctor/appointments/export?${query.toString()}&token=${encodeURIComponent(token || "")}`, "_blank");
  };

  // Video Link Modal Handlers
  const handleOpenVideoModal = (appt: AppointmentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMeetingModalAppt(appt);
    setMeetingProvider(appt.meetingProvider === "zoom" ? "zoom" : "google_meet");
    setMeetingUrlInput(appt.meetingLink || "");
    setMeetingMsg(null);
  };

  const handleSaveMeetingLink = async (clear = false) => {
    if (!meetingModalAppt) return;
    try {
      setSavingMeeting(true);
      setMeetingMsg(null);
      const payload = clear
        ? { provider: "none", meetingLink: "" }
        : { provider: meetingProvider, meetingLink: meetingUrlInput.trim() };

      await api.put(`/api/v1/doctor/appointments/${meetingModalAppt._id}/meeting-link`, payload);
      setMeetingMsg({
        type: "success",
        text: clear ? "Meeting link removed." : "Video link saved and confirmed!",
      });
      fetchAppointments();
      if (clear) setMeetingUrlInput("");
    } catch (err: any) {
      setMeetingMsg({
        type: "error",
        text: err?.response?.data?.error?.message || err?.message || "Failed to update meeting link",
      });
    } finally {
      setSavingMeeting(false);
    }
  };

  // Record Encounter Outcome Handlers
  const handleOpenOutcomeModal = (appt: AppointmentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOutcomeModalAppt(appt);
    setOutcomeStatus(
      appt.status === "in_consultation"
        ? "completed"
        : ["completed", "in_consultation", "no_show", "cancelled", "rescheduled"].includes(appt.status)
        ? (appt.status as any)
        : "completed"
    );
    setOutcomeNotes(appt.notes || "");
    setOutcomeError(null);
  };

  const handleSaveOutcome = async () => {
    if (!outcomeModalAppt) return;
    try {
      setIsSubmittingOutcome(true);
      setOutcomeError(null);
      await api.patch(`/api/v1/doctor/appointments/${outcomeModalAppt._id}/outcome`, {
        status: outcomeStatus,
        outcomeNotes: outcomeNotes.trim(),
        notes: outcomeNotes.trim(),
      });
      setOutcomeModalAppt(null);
      fetchAppointments();
      fetchSummary();
      fetchCalendarSummary();
    } catch (err: any) {
      setOutcomeError(
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to record appointment outcome"
      );
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  // Reschedule Request Handlers
  const handleRequestReschedule = async () => {
    if (!rescheduleModalAppt || !newRescheduleDate || !newRescheduleTime) return;
    try {
      setIsSubmittingReschedule(true);
      await api.post(`/api/v1/doctor/appointments/${rescheduleModalAppt._id}/reschedule-request`, {
        requestedDate: newRescheduleDate,
        requestedTime: newRescheduleTime,
        reason: rescheduleReason || "Clinician schedule adjustment",
      });
      setRescheduleModalAppt(null);
      fetchAppointments();
      fetchSummary();
    } catch (err) {
      console.error("Failed to request reschedule", err);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Cancellation Request Handlers
  const handleRequestCancellation = async () => {
    if (!cancelModalAppt || !cancellationReason) return;
    try {
      setIsSubmittingCancel(true);
      await api.post(`/api/v1/doctor/appointments/${cancelModalAppt._id}/cancellation-request`, {
        reason: cancellationReason,
      });
      setCancelModalAppt(null);
      fetchAppointments();
      fetchSummary();
    } catch (err) {
      console.error("Failed to request cancellation", err);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Add Appointment Submission
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApptPatientId || !newApptDate || !newApptTime) return;

    try {
      setIsCreatingAppt(true);
      setCreateApptError(null);
      await api.post(`/api/v1/doctor/appointments`, {
        patientId: newApptPatientId,
        serviceName: newApptService,
        appointmentDate: newApptDate,
        startTime: newApptTime,
        notes: newApptNotes,
      });

      setAddApptModalOpen(false);
      setNewApptNotes("");
      fetchAppointments();
      fetchSummary();
      fetchCalendarSummary();
    } catch (err: any) {
      setCreateApptError(err?.response?.data?.error?.message || err?.message || "Failed to book appointment");
    } finally {
      setIsCreatingAppt(false);
    }
  };

  // Helper for starting consultation
  const handleStartVisit = async (appt: AppointmentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (appt.status !== "in_consultation" && appt.status !== "completed") {
        await api.post(`/api/v1/doctor/appointments/${appt._id}/start-consultation`, {});
      }
    } catch (err) {
      console.warn("Status transition warn", err);
    }
    onOpenConsultation(appt._id, appt.patientId?._id);
  };

  // KPI card values from real summary
  const kpis = summaryData?.kpis || {
    todayAppointments: 0,
    todayAppointmentsDelta: "+0 vs, yesterday",
    upcomingAppointments: 0,
    upcomingAppointmentsDelta: "+0 next 7 days",
    awaitingConsultation: 0,
    awaitingDelta: "0 vs, yesterday",
    completedConsultations: 0,
    completedDelta: "+0 today",
    cancelled: 0,
    cancelledDelta: "–",
    rescheduled: 0,
    rescheduledDelta: "+0 today",
  };

  const quickFilters = summaryData?.quickFilters || {
    all: totalAppointments,
    confirmed: 0,
    awaiting: 0,
    completed: 0,
    cancelled: 0,
    rescheduled: 0,
  };

  // Calendar matrix calculation for the Left Panel Date Selector
  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];
    const firstDayOfMonth = new Date(calendarYear, calendarMonth - 1, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const prevMonthDays = new Date(calendarYear, calendarMonth - 1, 0).getDate();

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = calendarMonth === 1 ? 12 : calendarMonth - 1;
      const prevY = calendarMonth === 1 ? calendarYear - 1 : calendarYear;
      days.push({
        day: d,
        dateStr: `${prevY}-${String(prevM).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        dateStr: `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill complete weeks
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = calendarMonth === 12 ? 1 : calendarMonth + 1;
      const nextY = calendarMonth === 12 ? calendarYear + 1 : calendarYear;
      days.push({
        day: i,
        dateStr: `${nextY}-${String(nextM).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  // Toggle selection checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppointments(appointments.map((a) => a._id));
    } else {
      setSelectedAppointments([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedAppointments((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E7F3EA] text-[#07543D] flex items-center justify-center shrink-0 shadow-xs border border-[#07543D]/10">
            <Calendar className="w-5 h-5 text-[#07543D]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#17251F] tracking-tight">
              My Appointments
            </h1>
            <p className="text-xs sm:text-sm text-[#718078] mt-0.5">
              Manage your consultation schedule, patient visits, and appointment actions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAddApptModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#07543D] hover:bg-[#064B38] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Appointment</span>
        </button>
      </div>

      {/* 2. Six Real-Time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Today's Appointments */}
        <div
          onClick={() => {
            setStatusFilter("all");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E1EAE4] shadow-xs hover:border-[#07543D]/40 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#E7F3EA] text-[#07543D] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-medium text-[#718078] leading-tight">Today&apos;s Appointments</p>
          <p className="text-2xl font-bold text-[#17251F] mt-1 tracking-tight">
            {isLoading ? "--" : String(kpis.todayAppointments).padStart(2, "0")}
          </p>
          <p className="text-[10px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
            <span>{kpis.todayAppointmentsDelta || "↑ +2 vs, yesterday"}</span>
          </p>
        </div>

        {/* Card 2: Upcoming */}
        <div
          onClick={() => {
            setStatusFilter("confirmed");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E1EAE4] shadow-xs hover:border-[#D97706]/40 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-medium text-[#718078] leading-tight">Upcoming</p>
          <p className="text-2xl font-bold text-[#17251F] mt-1 tracking-tight">
            {isLoading ? "--" : String(kpis.upcomingAppointments).padStart(2, "0")}
          </p>
          <p className="text-[10px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
            <span>{kpis.upcomingAppointmentsDelta || "↑ +4 next 7 days"}</span>
          </p>
        </div>

        {/* Card 3: Awaiting Consultation */}
        <div
          onClick={() => {
            setStatusFilter("awaiting");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E1EAE4] shadow-xs hover:border-[#8B5CF6]/40 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#8B5CF6] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Stethoscope className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-medium text-[#718078] leading-tight">Awaiting Consultation</p>
          <p className="text-2xl font-bold text-[#17251F] mt-1 tracking-tight">
            {isLoading ? "--" : String(kpis.awaitingConsultation).padStart(2, "0")}
          </p>
          <p className="text-[10px] font-semibold text-[#EF4444] mt-1 flex items-center gap-0.5">
            <span>{kpis.awaitingDelta || "↓ -1 vs, yesterday"}</span>
          </p>
        </div>

        {/* Card 4: Completed */}
        <div
          onClick={() => {
            setStatusFilter("completed");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E1EAE4] shadow-xs hover:border-[#16A34A]/40 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-medium text-[#718078] leading-tight">Completed</p>
          <p className="text-2xl font-bold text-[#17251F] mt-1 tracking-tight">
            {isLoading ? "--" : String(kpis.completedConsultations).padStart(2, "0")}
          </p>
          <p className="text-[10px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
            <span>{kpis.completedDelta || "↑ +3 today"}</span>
          </p>
        </div>

        {/* Card 5: Cancelled */}
        <div
          onClick={() => {
            setStatusFilter("cancelled");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E1EAE4] shadow-xs hover:border-[#EF4444]/40 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-medium text-[#718078] leading-tight">Cancelled</p>
          <p className="text-2xl font-bold text-[#17251F] mt-1 tracking-tight">
            {isLoading ? "--" : String(kpis.cancelled).padStart(2, "0")}
          </p>
          <p className="text-[10px] font-semibold text-[#718078] mt-1">
            <span>{kpis.cancelledDelta || "–"}</span>
          </p>
        </div>

        {/* Card 6: Rescheduled */}
        <div
          onClick={() => {
            setStatusFilter("rescheduled");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E1EAE4] shadow-xs hover:border-[#0284C7]/40 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Repeat className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-medium text-[#718078] leading-tight">Rescheduled</p>
          <p className="text-2xl font-bold text-[#17251F] mt-1 tracking-tight">
            {isLoading ? "--" : String(kpis.rescheduled).padStart(2, "0")}
          </p>
          <p className="text-[10px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
            <span>{kpis.rescheduledDelta || "↑ +1 today"}</span>
          </p>
        </div>
      </div>

      {/* 3. View Switcher & Top Controls Bar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#E1EAE4] shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-[#07543D] text-white shadow-2xs"
                : "bg-transparent text-[#718078] hover:bg-[#F2F7F4] hover:text-[#17251F]"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "calendar"
                ? "bg-[#07543D] text-white shadow-2xs"
                : "bg-transparent text-[#718078] hover:bg-[#F2F7F4] hover:text-[#17251F]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "day"
                ? "bg-[#07543D] text-white shadow-2xs"
                : "bg-transparent text-[#718078] hover:bg-[#F2F7F4] hover:text-[#17251F]"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Day View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "week"
                ? "bg-[#07543D] text-white shadow-2xs"
                : "bg-transparent text-[#718078] hover:bg-[#F2F7F4] hover:text-[#17251F]"
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Week View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "month"
                ? "bg-[#07543D] text-white shadow-2xs"
                : "bg-transparent text-[#718078] hover:bg-[#F2F7F4] hover:text-[#17251F]"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Month View</span>
          </button>
        </div>

        {/* Right Date Selector & Status Filter */}
        <div className="flex items-center gap-2.5">
          {/* Native Date Picker Pill */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              aria-label="Select appointment date"
            />
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#E1EAE4] hover:border-[#07543D]/50 rounded-xl text-xs font-semibold text-[#17251F] shadow-2xs transition-colors cursor-pointer select-none">
              <Calendar className="w-3.5 h-3.5 text-[#07543D]" />
              <span>{formatDisplayDate(selectedDate)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#718078]" />
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E1EAE4] hover:border-[#07543D]/50 rounded-xl text-xs font-semibold text-[#17251F] shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#07543D]"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="awaiting">Awaiting Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Workspace: Left Calendar/Filters + Right Table/Views */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (4 cols): Select Date Calendar & Quick Filters */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card A: Select Date Calendar */}
          <div className="bg-white rounded-2xl border border-[#E1EAE4] shadow-xs p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[#17251F] mb-3">Select Date</h3>

            {/* Month Header with Navigation */}
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-[#17251F]">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-gray-100 text-[#718078] hover:text-[#17251F] transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {monthNames[calendarMonth - 1]} {calendarYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-gray-100 text-[#718078] hover:text-[#17251F] transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#718078] mb-1">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((dObj, idx) => {
                const isSelected = dObj.dateStr === selectedDate;
                const apptCount = dateDots[dObj.dateStr] || 0;
                const hasAppts = apptCount > 0;

                return (
                  <button
                    key={`${dObj.dateStr}-${idx}`}
                    type="button"
                    onClick={() => setSelectedDate(dObj.dateStr)}
                    className={`py-1.5 flex flex-col items-center justify-center rounded-xl text-xs transition-all relative cursor-pointer ${
                      isSelected
                        ? "bg-[#07543D] text-white font-bold shadow-2xs"
                        : dObj.isCurrentMonth
                        ? "text-[#17251F] hover:bg-[#F2F7F4] font-medium"
                        : "text-[#B8C4BD] hover:bg-gray-50"
                    }`}
                  >
                    <span>{dObj.day}</span>
                    {hasAppts && (
                      <span
                        className={`w-1 h-1 rounded-full mt-0.5 ${
                          isSelected ? "bg-white" : "bg-[#16A34A]"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card B: Quick Filters */}
          <div className="bg-white rounded-2xl border border-[#E1EAE4] shadow-xs p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[#17251F] mb-3">Quick Filters</h3>

            <div className="space-y-1">
              {/* All Appointments */}
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-[#E7F3EA] text-[#07543D]"
                    : "text-[#17251F] hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#07543D]" />
                  <span>All Appointments</span>
                </div>
                <span className="text-[11px] font-bold text-[#718078]">{quickFilters.all}</span>
              </button>

              {/* Confirmed */}
              <button
                type="button"
                onClick={() => setStatusFilter("confirmed")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  statusFilter === "confirmed"
                    ? "bg-[#E7F3EA] text-[#07543D]"
                    : "text-[#17251F] hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Confirmed</span>
                </div>
                <span className="text-[11px] font-bold text-[#718078]">{quickFilters.confirmed}</span>
              </button>

              {/* Awaiting Consultation */}
              <button
                type="button"
                onClick={() => setStatusFilter("awaiting")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  statusFilter === "awaiting"
                    ? "bg-[#FEF3C7] text-[#D97706]"
                    : "text-[#17251F] hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#D97706]" />
                  <span>Awaiting Consultation</span>
                </div>
                <span className="text-[11px] font-bold text-[#718078]">{quickFilters.awaiting}</span>
              </button>

              {/* Completed */}
              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  statusFilter === "completed"
                    ? "bg-[#E7F3EA] text-[#07543D]"
                    : "text-[#17251F] hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Completed</span>
                </div>
                <span className="text-[11px] font-bold text-[#718078]">{quickFilters.completed}</span>
              </button>

              {/* Cancelled */}
              <button
                type="button"
                onClick={() => setStatusFilter("cancelled")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  statusFilter === "cancelled"
                    ? "bg-[#FEE2E2] text-[#EF4444]"
                    : "text-[#17251F] hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <XCircle className="w-4 h-4 text-[#EF4444]" />
                  <span>Cancelled</span>
                </div>
                <span className="text-[11px] font-bold text-[#718078]">{quickFilters.cancelled}</span>
              </button>

              {/* Rescheduled */}
              <button
                type="button"
                onClick={() => setStatusFilter("rescheduled")}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  statusFilter === "rescheduled"
                    ? "bg-[#E0F2FE] text-[#0284C7]"
                    : "text-[#17251F] hover:bg-[#F2F7F4]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Repeat className="w-4 h-4 text-[#0284C7]" />
                  <span>Rescheduled</span>
                </div>
                <span className="text-[11px] font-bold text-[#718078]">{quickFilters.rescheduled}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Appointments Data Table or Selected View */}
        <div className="lg:col-span-8">
          {viewMode === "list" && (
            <div className="bg-white rounded-2xl border border-[#E1EAE4] shadow-xs overflow-hidden">
              {/* Table Card Header */}
              <div className="p-4 sm:p-5 border-b border-[#E1EAE4] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#07543D]" />
                  <h2 className="text-sm sm:text-base font-bold text-[#17251F]">
                    Appointments – {formatDisplayDate(selectedDate)} ({appointments.length})
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E1EAE4] hover:bg-[#F2F7F4] text-[#17251F] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#07543D]" />
                    <span>Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      fetchAppointments();
                      fetchSummary();
                      fetchCalendarSummary();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E1EAE4] hover:bg-[#F2F7F4] text-[#17251F] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#07543D] ${isLoading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto min-h-[350px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E1EAE4] text-[#718078] bg-[#FAFCFB] font-semibold">
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            appointments.length > 0 &&
                            selectedAppointments.length === appointments.length
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded text-[#07543D] focus:ring-[#07543D] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-24">Time</th>
                      <th className="py-2.5 px-4">Patient Details</th>
                      <th className="py-2.5 px-4">Service</th>
                      <th className="py-2.5 px-3">Consultation Mode</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Billing</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1EAE4]/60">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-xs text-[#718078]">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#07543D] mb-2" />
                          Loading authorized appointments...
                        </td>
                      </tr>
                    ) : appointments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-xs text-[#718078]">
                          No appointments found for {formatDisplayDate(selectedDate)}.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((appt) => {
                        const patient = appt.patientId || ({} as any);
                        const pName = patient.fullName || "Patient";
                        const pCode = patient.patientCode || appt.appointmentCode || "";
                        const pAge = patient.age ? `${patient.age} yrs` : "";
                        const pGender = patient.gender === "female" ? "♀" : patient.gender === "male" ? "♂" : "";
                        const avatarStyle = getAvatarStyle(pName);

                        const isCompleted = appt.status === "completed";
                        const isAwaiting = ["waiting", "in_queue", "awaiting", "checked_in"].includes(appt.status);
                        const isConfirmed = ["confirmed", "scheduled"].includes(appt.status);
                        const isCancelled = appt.status === "cancelled";
                        const isRescheduled = appt.status === "rescheduled";

                        const isChecked = selectedAppointments.includes(appt._id);

                        return (
                          <tr
                            key={appt._id}
                            onClick={() => setDetailDrawerAppt(appt)}
                            className="hover:bg-[#F8FBFA] transition-colors cursor-pointer group"
                          >
                            {/* Checkbox */}
                            <td
                              className="py-3 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelect(appt._id);
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelect(appt._id)}
                                className="rounded text-[#07543D] focus:ring-[#07543D] cursor-pointer"
                              />
                            </td>

                            {/* Time with green vertical bar */}
                            <td className="py-3 px-3 font-semibold text-[#17251F] whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="w-0.5 h-4 bg-[#07543D] rounded-full inline-block" />
                                <span>{appt.startTime || "09:00 AM"}</span>
                              </div>
                            </td>

                            {/* Patient Details */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPatientProfile(patient._id);
                                  }}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer ${avatarStyle.bg} ${avatarStyle.text}`}
                                >
                                  {getInitials(pName)}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenPatientProfile(patient._id);
                                    }}
                                    className="font-bold text-xs text-[#17251F] hover:text-[#07543D] hover:underline truncate block text-left"
                                  >
                                    {pName}
                                  </button>
                                  <p className="text-[11px] text-[#718078] truncate">
                                    {pCode} • {pAge} {pGender}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Service */}
                            <td className="py-3 px-4 text-xs font-medium text-[#17251F] whitespace-nowrap">
                              {appt.serviceName || "Clinical Consultation"}
                            </td>

                            {/* Consultation Mode */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div>
                                <div className="flex items-center gap-1.5 text-xs text-[#17251F] font-medium">
                                  <Video className="w-3.5 h-3.5 text-[#07543D]" />
                                  <span>Online Video</span>
                                </div>
                                <p className="text-[10px] font-semibold text-[#16A34A] mt-0.5">
                                  {appt.meetingLink ? "Meet Ready" : "Pending Link"}
                                </p>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isCompleted ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F3EA] text-[#16A34A]">
                                  Completed
                                </span>
                              ) : isAwaiting ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                  Awaiting
                                </span>
                              ) : isCancelled ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#EF4444]">
                                  Cancelled
                                </span>
                              ) : isRescheduled ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F2FE] text-[#0284C7]">
                                  Rescheduled
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F3EA] text-[#16A34A]">
                                  Confirmed
                                </span>
                              )}
                            </td>

                            {/* Billing */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-[11px] font-medium text-[#718078]">
                                {appt.billing?.status === "paid"
                                  ? "Paid"
                                  : appt.billing?.status === "partially_paid"
                                  ? "Partially Paid"
                                  : "Unbilled"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap relative">
                              <div className="flex items-center justify-end gap-2">
                                {isCompleted ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenConsultation(appt._id, patient._id);
                                    }}
                                    className="px-3 py-1 bg-white border border-[#E1EAE4] hover:bg-gray-50 text-[#17251F] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    View Notes
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenVideoModal(appt, e)}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E1EAE4] hover:bg-gray-50 text-[#17251F] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      <Video className="w-3 h-3 text-[#07543D]" />
                                      <span>Video Link</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => handleStartVisit(appt, e)}
                                      className="flex items-center gap-1 px-3 py-1 bg-[#07543D] hover:bg-[#064B38] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      <span>Start Visit</span>
                                    </button>
                                  </>
                                )}

                                {/* Context Menu */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(activeMenuId === appt._id ? null : appt._id);
                                    }}
                                    className="p-1 text-[#718078] hover:text-[#17251F] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                    aria-label="More actions"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>

                                  {activeMenuId === appt._id && (
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E1EAE4] rounded-xl shadow-lg p-1.5 z-30 animate-fade-in text-left">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDetailDrawerAppt(appt);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs text-[#17251F] hover:bg-[#F2F7F4] rounded-lg flex items-center gap-2 cursor-pointer text-left font-medium"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-[#07543D]" />
                                        <span>View Appointment</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenPatientProfile(patient._id);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs text-[#17251F] hover:bg-[#F2F7F4] rounded-lg flex items-center gap-2 cursor-pointer text-left font-medium"
                                      >
                                        <User className="w-3.5 h-3.5 text-[#07543D]" />
                                        <span>Patient Profile</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenOutcomeModal(appt, e);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs text-[#17251F] hover:bg-[#F2F7F4] rounded-lg flex items-center gap-2 cursor-pointer text-left font-medium"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                                        <span>Record Encounter Outcome</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenVideoModal(appt, e);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs text-[#17251F] hover:bg-[#F2F7F4] rounded-lg flex items-center gap-2 cursor-pointer text-left font-medium"
                                      >
                                        <Video className="w-3.5 h-3.5 text-[#07543D]" />
                                        <span>Update Meeting Link</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRescheduleModalAppt(appt);
                                          setNewRescheduleDate(appt.appointmentDate);
                                          setNewRescheduleTime(appt.startTime);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs text-[#17251F] hover:bg-[#F2F7F4] rounded-lg flex items-center gap-2 cursor-pointer text-left font-medium"
                                      >
                                        <Repeat className="w-3.5 h-3.5 text-[#0284C7]" />
                                        <span>Request Reschedule</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCancelModalAppt(appt);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs text-[#EF4444] hover:bg-red-50 rounded-lg flex items-center gap-2 cursor-pointer text-left font-medium"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Request Cancellation</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar View Mode */}
          {viewMode === "calendar" && (
            <div className="bg-white rounded-2xl border border-[#E1EAE4] shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#17251F]">
                  Calendar View – {formatDisplayDate(selectedDate)}
                </h2>
                <span className="text-xs font-semibold text-[#07543D]">
                  {appointments.length} Consultations Booked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {appointments.map((appt) => (
                  <div
                    key={appt._id}
                    onClick={() => setDetailDrawerAppt(appt)}
                    className="p-4 rounded-xl border border-[#E1EAE4] bg-[#FAFCFB] hover:border-[#07543D]/40 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                        <span className="font-bold text-xs text-[#17251F]">{appt.startTime}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7F3EA] text-[#16A34A]">
                        {appt.status}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-sm text-[#17251F]">{appt.patientId?.fullName}</p>
                      <p className="text-xs text-[#718078] mt-0.5">
                        {appt.patientId?.patientCode} • {appt.serviceName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E1EAE4]/60">
                      <span className="text-xs font-medium text-[#07543D] flex items-center gap-1">
                        <Video className="w-3 h-3" /> Online Video
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleStartVisit(appt, e)}
                        className="px-3 py-1 bg-[#07543D] text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Start Visit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day View Mode */}
          {viewMode === "day" && (
            <div className="bg-white rounded-2xl border border-[#E1EAE4] shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1EAE4] pb-3">
                <h2 className="text-base font-bold text-[#17251F]">
                  Day Timeline — {formatDisplayDate(selectedDate)}
                </h2>
                <span className="text-xs text-[#718078]">09:00 AM – 06:00 PM</span>
              </div>

              <div className="space-y-3">
                {[
                  "09:00 AM", "09:45 AM", "10:30 AM", "11:15 AM", "12:00 PM",
                  "02:00 PM", "03:00 PM", "04:00 PM",
                ].map((slotTime) => {
                  const match = appointments.find((a) => a.startTime === slotTime);
                  return (
                    <div
                      key={slotTime}
                      className="flex items-start gap-4 p-3 rounded-xl border border-[#E1EAE4]/80 bg-[#FAFCFB]"
                    >
                      <div className="w-20 font-bold text-xs text-[#17251F] shrink-0 pt-0.5">
                        {slotTime}
                      </div>
                      {match ? (
                        <div className="flex-1 flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#E1EAE4]">
                          <div>
                            <p className="font-bold text-xs text-[#17251F]">
                              {match.patientId?.fullName} ({match.patientId?.patientCode})
                            </p>
                            <p className="text-[11px] text-[#718078]">{match.serviceName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartVisit(match)}
                            className="px-3 py-1 bg-[#07543D] text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Start
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 text-xs text-[#B8C4BD] italic py-1">Available Slot</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week & Month Views */}
          {(viewMode === "week" || viewMode === "month") && (
            <div className="bg-white rounded-2xl border border-[#E1EAE4] shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#17251F]">
                  {viewMode === "week" ? "Week Schedule Overview" : "Monthly Consultations Grid"}
                </h2>
                <span className="text-xs font-semibold text-[#07543D]">
                  {appointments.length} Total in active view
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {appointments.slice(0, 12).map((a) => (
                  <div
                    key={a._id}
                    onClick={() => setDetailDrawerAppt(a)}
                    className="p-3 bg-[#F2F7F4] rounded-xl border border-[#E1EAE4] space-y-1 cursor-pointer hover:border-[#07543D]/50"
                  >
                    <p className="text-[11px] font-bold text-[#07543D]">
                      {a.appointmentDate} • {a.startTime}
                    </p>
                    <p className="text-xs font-bold text-[#17251F] truncate">
                      {a.patientId?.fullName}
                    </p>
                    <p className="text-[10px] text-[#718078] truncate">{a.serviceName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Appointment Detail Drawer */}
      {detailDrawerAppt && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 space-y-6">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E1EAE4]">
                <div>
                  <h3 className="text-lg font-bold text-[#17251F]">
                    Appointment {detailDrawerAppt.appointmentCode}
                  </h3>
                  <p className="text-xs text-[#718078] mt-0.5">
                    {formatDisplayDate(detailDrawerAppt.appointmentDate)} • {detailDrawerAppt.startTime}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailDrawerAppt(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section A: Appointment Information */}
              <div className="py-4 border-b border-[#E1EAE4] space-y-2.5">
                <h4 className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Appointment Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#718078]">Service:</span>
                    <p className="font-semibold text-[#17251F]">{detailDrawerAppt.serviceName}</p>
                  </div>
                  <div>
                    <span className="text-[#718078]">Consultation Mode:</span>
                    <p className="font-semibold text-[#07543D] flex items-center gap-1">
                      <Video className="w-3 h-3" /> Online Video
                    </p>
                  </div>
                  <div>
                    <span className="text-[#718078]">Status:</span>
                    <p className="font-semibold text-[#16A34A] capitalize">{detailDrawerAppt.status}</p>
                  </div>
                  <div>
                    <span className="text-[#718078]">Duration:</span>
                    <p className="font-semibold text-[#17251F]">30 mins</p>
                  </div>
                </div>
              </div>

              {/* Section B: Patient Information */}
              <div className="py-4 border-b border-[#E1EAE4] space-y-2.5">
                <h4 className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Patient Information
                </h4>
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-sm text-[#17251F]">
                    {detailDrawerAppt.patientId?.fullName}
                  </p>
                  <p className="text-[#718078]">
                    ID: <span className="font-medium text-[#17251F]">{detailDrawerAppt.patientId?.patientCode}</span>
                  </p>
                  <p className="text-[#718078]">
                    Phone: <span className="font-medium text-[#17251F]">{detailDrawerAppt.patientId?.phone || "N/A"}</span>
                  </p>
                  <p className="text-[#718078]">
                    Age & Gender:{" "}
                    <span className="font-medium text-[#17251F]">
                      {detailDrawerAppt.patientId?.age || 28} Years • {detailDrawerAppt.patientId?.gender || "Female"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Section C: Video Consultation */}
              <div className="py-4 border-b border-[#E1EAE4] space-y-2.5">
                <h4 className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Video Consultation
                </h4>
                <div className="p-3 rounded-xl bg-[#F2F7F4] border border-[#E1EAE4] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#718078]">Provider:</span>
                    <span className="font-bold text-[#07543D] uppercase">
                      {detailDrawerAppt.meetingProvider || "Google Meet"}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-[#718078]">Meeting URL:</span>
                    <p className="font-mono text-[11px] text-[#17251F] truncate mt-0.5">
                      {detailDrawerAppt.meetingLink || "No link added yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenVideoModal(detailDrawerAppt)}
                      className="px-3 py-1 bg-white border border-[#E1EAE4] rounded-lg text-xs font-semibold text-[#07543D] cursor-pointer"
                    >
                      Update Link
                    </button>
                    {detailDrawerAppt.meetingLink && (
                      <a
                        href={detailDrawerAppt.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-[#07543D] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Join</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Section D: Clinical Preparation Checklist */}
              <div className="py-4 space-y-2.5">
                <h4 className="text-xs font-bold text-[#718078] uppercase tracking-wider">
                  Clinical Preparation
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-[#16A34A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Patient Profile & History Loaded</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#16A34A]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Digital Consent Registered</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#07543D]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pure Online Video Architecture</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="pt-4 border-t border-[#E1EAE4] space-y-2">
              <button
                type="button"
                onClick={() => {
                  handleStartVisit(detailDrawerAppt);
                  setDetailDrawerAppt(null);
                }}
                className="w-full py-2.5 bg-[#07543D] hover:bg-[#064B38] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Clinical Visit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenOutcomeModal(detailDrawerAppt);
                  setDetailDrawerAppt(null);
                }}
                className="w-full py-2 bg-white border border-[#E1EAE4] hover:bg-gray-50 text-[#17251F] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span>Record Encounter Outcome</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Video Link Modal */}
      {meetingModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E1EAE4] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1EAE4]">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#07543D]" />
                <h3 className="font-bold text-sm sm:text-base text-[#17251F]">
                  Consultation Video Link
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMeetingModalAppt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#718078]">
              Add or update the secure meeting link for{" "}
              <span className="font-bold text-[#17251F]">{meetingModalAppt.patientId?.fullName}</span>.
            </p>

            {meetingMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  meetingMsg.type === "success"
                    ? "bg-[#E7F3EA] text-[#16A34A]"
                    : "bg-[#FEE2E2] text-[#EF4444]"
                }`}
              >
                {meetingMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{meetingMsg.text}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  Video Provider
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMeetingProvider("google_meet")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                      meetingProvider === "google_meet"
                        ? "bg-[#E7F3EA] border-[#07543D] text-[#07543D]"
                        : "border-[#E1EAE4] text-[#718078]"
                    }`}
                  >
                    Google Meet
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingProvider("zoom")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                      meetingProvider === "zoom"
                        ? "bg-[#E7F3EA] border-[#07543D] text-[#07543D]"
                        : "border-[#E1EAE4] text-[#718078]"
                    }`}
                  >
                    Zoom
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  Meeting URL (HTTPS)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={meetingUrlInput}
                  onChange={(e) => setMeetingUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F] focus:outline-none focus:ring-1 focus:ring-[#07543D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E1EAE4]">
              <button
                type="button"
                onClick={() => handleSaveMeetingLink(true)}
                disabled={savingMeeting || !meetingModalAppt.meetingLink}
                className="text-xs text-[#EF4444] hover:underline disabled:opacity-50 cursor-pointer"
              >
                Clear Link
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingModalAppt(null)}
                  className="px-3 py-2 border border-[#E1EAE4] rounded-xl text-xs font-semibold text-[#718078] hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMeetingLink(false)}
                  disabled={savingMeeting || !meetingUrlInput.trim()}
                  className="px-4 py-2 bg-[#07543D] hover:bg-[#064B38] text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {savingMeeting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Video Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Appointment Modal */}
      {addApptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E1EAE4] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1EAE4]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#07543D]" />
                <h3 className="font-bold text-sm sm:text-base text-[#17251F]">
                  Add Clinical Appointment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddApptModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createApptError && (
              <div className="p-3 rounded-xl text-xs bg-[#FEE2E2] text-[#EF4444] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createApptError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  Select Patient
                </label>
                <select
                  value={newApptPatientId}
                  onChange={(e) => setNewApptPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                  required
                >
                  {patientsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.patientCode || p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  Clinical Service
                </label>
                <select
                  value={newApptService}
                  onChange={(e) => setNewApptService(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                >
                  <option value="PCOD/PCOS Management">PCOD/PCOS Management</option>
                  <option value="Skin & Hair Consultation">Skin & Hair Consultation</option>
                  <option value="Hormonal Health">Hormonal Health</option>
                  <option value="Diet & Nutrition">Diet & Nutrition</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Follow-up Consultation">Follow-up Consultation</option>
                  <option value="General Consultation">General Consultation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#17251F] block mb-1">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={newApptDate}
                    onChange={(e) => setNewApptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#17251F] block mb-1">
                    Start Time
                  </label>
                  <select
                    value={newApptTime}
                    onChange={(e) => setNewApptTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:45 AM">09:45 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:15 AM">11:15 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  Clinical Notes / Concerns (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newApptNotes}
                  onChange={(e) => setNewApptNotes(e.target.value)}
                  placeholder="Initial clinical concerns..."
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1EAE4]">
                <button
                  type="button"
                  onClick={() => setAddApptModalOpen(false)}
                  className="px-3.5 py-2 border border-[#E1EAE4] rounded-xl text-xs font-semibold text-[#718078] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAppt}
                  className="px-4 py-2 bg-[#07543D] hover:bg-[#064B38] text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isCreatingAppt && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Book Appointment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Reschedule Modal */}
      {rescheduleModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E1EAE4] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1EAE4]">
              <h3 className="font-bold text-base text-[#17251F]">Request Reschedule</h3>
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#718078]">
              Rescheduling appointment for{" "}
              <span className="font-bold text-[#17251F]">
                {rescheduleModalAppt.patientId?.fullName}
              </span>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  New Time
                </label>
                <select
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="09:45 AM">09:45 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:15 AM">11:15 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:00 PM">03:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  Reason for Rescheduling
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Doctor schedule adjustment or emergency..."
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1EAE4]">
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="px-3.5 py-2 border border-[#E1EAE4] rounded-xl text-xs font-semibold text-[#718078] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestReschedule}
                disabled={isSubmittingReschedule || !newRescheduleDate}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isSubmittingReschedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Reschedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Cancellation Modal */}
      {cancelModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E1EAE4] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1EAE4]">
              <h3 className="font-bold text-base text-[#EF4444]">Request Cancellation</h3>
              <button
                type="button"
                onClick={() => setCancelModalAppt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#718078]">
              Are you sure you want to cancel the appointment for{" "}
              <span className="font-bold text-[#17251F]">{cancelModalAppt.patientId?.fullName}</span>?
            </p>

            <div>
              <label className="text-xs font-semibold text-[#17251F] block mb-1">
                Reason for Cancellation
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F]"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1EAE4]">
              <button
                type="button"
                onClick={() => setCancelModalAppt(null)}
                className="px-3.5 py-2 border border-[#E1EAE4] rounded-xl text-xs font-semibold text-[#718078] hover:bg-gray-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleRequestCancellation}
                disabled={isSubmittingCancel || !cancellationReason.trim()}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isSubmittingCancel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Record Outcome Modal */}
      {outcomeModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E1EAE4] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1EAE4]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#07543D]" />
                <h3 className="font-bold text-sm sm:text-base text-[#17251F]">
                  Record Encounter Outcome
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOutcomeModalAppt(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F4F8F5] rounded-xl border border-[#E1EAE4] flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[#17251F]">
                  {outcomeModalAppt.patientId?.fullName || "Patient"}
                </p>
                <p className="text-[#718078]">
                  {outcomeModalAppt.patientId?.patientCode || outcomeModalAppt.appointmentCode} • {outcomeModalAppt.serviceName || "Clinical Consultation"}
                </p>
              </div>
              <span className="font-semibold text-[#07543D]">
                {outcomeModalAppt.appointmentDate} at {outcomeModalAppt.startTime}
              </span>
            </div>

            {outcomeError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{outcomeError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1.5">
                  Encounter Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "completed", label: "Completed", color: "text-[#16A34A] border-[#16A34A]/40 bg-[#DCFCE7]" },
                    { id: "in_consultation", label: "In Consultation", color: "text-[#4F46E5] border-[#4F46E5]/40 bg-[#E0E7FF]" },
                    { id: "no_show", label: "No Show", color: "text-[#D97706] border-[#D97706]/40 bg-[#FEF3C7]" },
                    { id: "rescheduled", label: "Rescheduled", color: "text-[#0284C7] border-[#0284C7]/40 bg-[#E0F2FE]" },
                    { id: "cancelled", label: "Cancelled", color: "text-[#EF4444] border-[#EF4444]/40 bg-[#FEE2E2]" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setOutcomeStatus(st.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        outcomeStatus === st.id
                          ? `${st.color} shadow-xs font-bold scale-[1.02]`
                          : "border-[#E1EAE4] bg-white text-[#718078] hover:bg-gray-50"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17251F] block mb-1">
                  Clinical Disposition / Encounter Notes
                </label>
                <textarea
                  rows={4}
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Record summary of encounter, patient attendance, disposition, or follow-up plan..."
                  className="w-full px-3 py-2 bg-[#F5F8F6] border border-[#E1EAE4] rounded-xl text-xs text-[#17251F] focus:outline-hidden focus:border-[#07543D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E1EAE4]">
              <button
                type="button"
                onClick={() => setOutcomeModalAppt(null)}
                className="px-3.5 py-2 border border-[#E1EAE4] rounded-xl text-xs font-semibold text-[#718078] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOutcome}
                disabled={isSubmittingOutcome}
                className="px-4 py-2 bg-[#07543D] hover:bg-[#064B38] text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isSubmittingOutcome && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Encounter Outcome</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
