"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Video,
  Clock,
  MoreVertical,
  Play,
  Check,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronDown,
  Info,
  BarChart2,
  TrendingUp,
  UserPlus,
  Stethoscope,
  ExternalLink,
  Zap,
  Copy,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { DoctorTab } from "./DoctorSidebar";

// Custom Rx Pill SVG Icon for Prescriptions matching reference design
function RxIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 3h6a3.5 3.5 0 0 1 3.5 3.5v0a3.5 3.5 0 0 1-3.5 3.5h-6z" />
      <path d="M4.5 3v18" />
      <path d="M12.5 10l6 9" />
      <path d="M13.5 16l5-5" />
    </svg>
  );
}

export interface ScheduleAlert {
  id: string;
  severity: "warning" | "info" | "neutral" | "urgent";
  title: string;
  message: string;
  count?: number;
}

export interface PatientQueueItem {
  queueNumber: number;
  position: number;
  appointmentId: string;
  appointmentCode: string;
  patientId: any;
  patientName: string;
  patientCode: string;
  age?: number | null;
  gender?: string;
  serviceName: string;
  visitType?: string;
  startTime: string;
  status: string;
  waitingMinutes?: number | null;
  waitingTimeMinutes?: number;
  checkedInAt?: string;
}

export interface DashboardSummary {
  doctor: {
    _id: string;
    name: string;
    designation: string;
    specialization: string;
    initials: string;
    consultationFee?: number;
  };
  selectedDate: string;
  kpis: {
    todayAppointments: number;
    todayAppointmentsDelta?: string;
    totalPatients: number;
    totalPatientsDelta?: string;
    consultations: number;
    consultationsDelta?: string;
    prescriptions: number;
    prescriptionsDelta?: string;
    followupsDue: number;
    followupsOverdue?: number;
    followupsDelta?: string;
    upcomingAppointments?: number;
    upcomingAppointmentsDelta?: string;
    awaitingConsultation?: number;
    awaitingDelta?: string;
    waitingPatients?: number;
    waitingDelta?: string;
    completedConsultations?: number;
    completedDelta?: string;
    prescriptionsPending?: number;
    pendingDocumentation?: number;
    pendingNotes?: number;
    pendingNotesDelta?: string;
    missingLinks?: number;
  };
  thisWeekOverview?: {
    consultations: { count: number; delta: string };
    prescriptions: { count: number; delta: string };
    followups: { count: number; delta: string };
    newPatients: { count: number; delta: string };
  };
  consultationTrend?: Array<{
    date: string;
    day: string;
    count: number;
  }>;
  todayQueue?: {
    waitingToStart: number;
    inConsultation: number;
    completed: number;
  };
  ongoingConsultation?: {
    _id: string;
    appointmentCode?: string;
    startTime?: string;
    serviceName?: string;
    mode?: string;
    status?: string;
    meetingLink?: string;
    reasonForVisit?: string;
    notes?: string;
    patientId?: {
      _id: string;
      fullName?: string;
      patientCode?: string;
      age?: number;
      gender?: string;
      phone?: string;
      bloodGroup?: string;
      allergies?: string[] | string;
    };
  } | null;
  todayAppointments?: Array<any>;
  appointments?: Array<any>;
  scheduleTabs?: {
    today: Array<any>;
    upcoming: Array<any>;
    pending: Array<any>;
    completed?: Array<any>;
    counts: {
      today: number;
      upcoming: number;
      pending: number;
      completed?: number;
    };
  };
  nextConsultation?: any;
  myAvailability?: {
    status: string;
    workingHours: string;
    bookedSlots: number;
    totalSlots: number;
    utilizationPercent: number;
    isOnLeave?: boolean;
  };
  pendingClinicalWork?: {
    total: number;
    consultationNotes: number;
    prescriptionsToFinalize: number;
    reportsToReview: number;
  };
  followupQueue?: {
    total: number;
    dueToday: number;
    overdue: number;
    upcoming7Days: number;
  };
  recentActivity?: Array<{
    _id: string;
    action: string;
    patientName: string;
    timestampText: string;
    type: "completed" | "checkin" | "prescription" | "followup" | "appointment" | "system";
  }>;
  scheduleAlerts?: ScheduleAlert[];
  patientQueue?: PatientQueueItem[];
  unreadNotifications?: number;
  missingLinkCount?: number;
}

interface DoctorOverviewTabProps {
  data: DashboardSummary | null;
  isLoading: boolean;
  onNavigateTab: (tab: DoctorTab) => void;
  onOpenConsultation: (appointmentId: string, patientId: string) => void;
  onOpenPatientProfile: (patientId: string) => void;
  onRefresh: () => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

// Deterministic soft avatar styles matching reference design (PR purple, SK teal, NK orange, AS indigo, RS pink)
function getAvatarStyle(name: string = "Patient") {
  const charCode = (name.charCodeAt(0) || 65) + (name.charCodeAt(name.length - 1) || 65);
  const palette = [
    { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" }, // soft purple (SK)
    { bg: "bg-[#CCFBF1]", text: "text-[#0D9488]" }, // soft teal (PR)
    { bg: "bg-[#FFEDD5]", text: "text-[#EA580C]" }, // soft orange (NK)
    { bg: "bg-[#E0E7FF]", text: "text-[#4F46E5]" }, // soft indigo (AS)
    { bg: "bg-[#FCE7F3]", text: "text-[#DB2777]" }, // soft pink (RS)
    { bg: "bg-[#DBEAFE]", text: "text-[#2563EB]" }, // soft blue
  ];
  return palette[charCode % palette.length];
}

function getInitials(name: string = "Patient"): string {
  if (!name) return "PT";
  const parts = name.trim().replace(/^Dr\.\s*/i, "").split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDayMonthYear(dateStr: string): string {
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

export function DoctorOverviewTab({
  data,
  isLoading,
  onNavigateTab,
  onOpenConsultation,
  onOpenPatientProfile,
  onRefresh,
  selectedDate,
  onDateChange,
}: DoctorOverviewTabProps) {
  const [scheduleTab, setScheduleTab] = useState<"today" | "upcoming" | "completed">("today");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // In-call stopwatch timer
  const [callSeconds, setCallSeconds] = useState(724); // 12:04 default

  useEffect(() => {
    const timer = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCallTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleCopyLink = (url?: string) => {
    const linkToCopy = url || "https://meet.google.com/tg-cons-10235";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(linkToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const kpis = {
    todayAppointments: data?.kpis?.todayAppointments ?? 12,
    todayAppointmentsDelta: data?.kpis?.todayAppointmentsDelta || "↑ +2 vs yesterday",
    totalPatients: data?.kpis?.totalPatients ?? (data?.kpis as any)?.totalPatientsCount ?? 248,
    totalPatientsDelta: data?.kpis?.totalPatientsDelta || "↑ +8 this week",
    consultations:
      data?.kpis?.consultations ??
      (data?.kpis as any)?.todayConsultations ??
      data?.kpis?.completedConsultations ??
      6,
    consultationsDelta: data?.kpis?.consultationsDelta || "↑ +3 today",
    prescriptions:
      data?.kpis?.prescriptions ??
      (data?.kpis as any)?.todayPrescriptions ??
      data?.kpis?.prescriptionsPending ??
      5,
    prescriptionsDelta: data?.kpis?.prescriptionsDelta || "↑ +2 today",
    followupsDue: data?.kpis?.followupsDue ?? 18,
    followupsOverdue: data?.kpis?.followupsOverdue ?? 4,
    followupsDelta: data?.kpis?.followupsDelta || `${data?.kpis?.followupsOverdue ?? 4} overdue`,
  };

  const doctorName = data?.doctor?.name || "Dr. Ananya Sharma";
  const doctorGreetingName = doctorName.startsWith("Dr.")
    ? doctorName
    : `Dr. ${doctorName}`;

  const scheduleAlerts = data?.scheduleAlerts || [];

  // Appointments for the 3 tabs
  const todayList = data?.scheduleTabs?.today || data?.todayAppointments || data?.appointments || [];
  const upcomingList = data?.scheduleTabs?.upcoming || [];
  const completedList =
    data?.scheduleTabs?.completed ||
    todayList.filter((a) => a.status === "completed");

  const displayedList =
    scheduleTab === "today"
      ? todayList
      : scheduleTab === "upcoming"
      ? upcomingList
      : completedList;

  const todayCount = data?.scheduleTabs?.counts?.today ?? (todayList.length || 12);
  const upcomingCount = data?.scheduleTabs?.counts?.upcoming ?? (upcomingList.length || 15);
  const completedCount =
    data?.scheduleTabs?.counts?.completed ?? (completedList.length || 6);

  // =========================================================================
  // NEXT APPOINTMENT FOCUS RESOLUTION (Clean, Elegant, Real-Time)
  // =========================================================================
  const liveAppointment =
    todayList.find((a) => a.status === "in_consultation") ||
    (data?.ongoingConsultation?.status === "in_consultation" ? data.ongoingConsultation : null);

  const isLiveActive = Boolean(liveAppointment);

  // Prioritize patient currently waiting, then next confirmed/scheduled appointment
  const nextApptCandidate =
    todayList.find((a) => ["waiting", "in_queue", "checked_in"].includes(a.status)) ||
    todayList.find((a) => ["confirmed", "scheduled"].includes(a.status)) ||
    data?.nextConsultation ||
    todayList.find((a) => !["completed", "cancelled", "no_show"].includes(a.status)) ||
    null;

  const focusAppt = liveAppointment || nextApptCandidate || todayList[0] || null;

  // Patient details for Focus Appointment
  const focusPatient = focusAppt?.patientId || {};
  const focusPatientName = focusPatient.fullName || "Sanya Khanna";
  const focusPatientCode = focusPatient.patientCode || focusAppt?.appointmentCode || "TG-10235";
  const focusPatientAge = focusPatient.age ? `${focusPatient.age} Years` : "32 Years";
  const focusPatientGender = focusPatient.gender || "Female";
  const focusPatientBloodGroup = focusPatient.bloodGroup || "B+";
  const focusPatientAllergies = focusPatient.allergies
    ? Array.isArray(focusPatient.allergies)
      ? focusPatient.allergies.join(", ")
      : String(focusPatient.allergies)
    : "No known drug allergies";

  const focusServiceName = focusAppt?.serviceName || "PCOS Consultation";
  const focusStartTime = focusAppt?.startTime || "10:00 AM";
  const focusMeetingLink = focusAppt?.meetingLink || "https://meet.google.com/tg-cons-10235";

  // Weekly Overview Data
  const weeklyOverview = data?.thisWeekOverview || {
    consultations: { count: 38, delta: "↑ +12%" },
    prescriptions: { count: 34, delta: "↑ +9%" },
    followups: { count: 21, delta: "↑ +5%" },
    newPatients: { count: 11, delta: "↑ +22%" },
  };

  // Consultation Trend Data (Mon - Sun)
  const trendData =
    data?.consultationTrend && data.consultationTrend.length === 7
      ? data.consultationTrend
      : [
          { day: "Mon", count: 4 },
          { day: "Tue", count: 6 },
          { day: "Wed", count: 5 },
          { day: "Thu", count: 8 },
          { day: "Fri", count: 7 },
          { day: "Sat", count: 10 },
          { day: "Sun", count: 12 },
        ];

  // Today Queue Summary
  const queueSummary = data?.todayQueue || {
    waitingToStart: todayList.filter((a) =>
      ["waiting", "in_queue", "checked_in", "confirmed", "scheduled"].includes(a.status)
    ).length || 3,
    inConsultation: isLiveActive ? 1 : (data?.todayQueue?.inConsultation || 5),
    completed: completedCount || 4,
  };

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* ========================================================================= */}
      {/* 1. HERO GREETING BANNER (Clean, Spacious, Pure Reference Layout)          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Personalized Greeting Title & Date */}
        <div className="max-w-md z-10">
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#111827] leading-tight tracking-tight">
            Good morning,
            <br />
            <span className="flex items-center gap-2">
              <span>{doctorGreetingName}!</span>
              <span className="text-2xl select-none">👋</span>
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-2.5 font-medium">
            Here&apos;s your clinical overview for today,{" "}
            <span className="text-[#111827] font-semibold">
              {formatDayMonthYear(selectedDate)}
            </span>
            .
          </p>
        </div>

        {/* Center / Right: 3D Stethoscope Artwork + TriGyna Brand Badge */}
        <div className="flex items-center justify-between lg:justify-end gap-6 sm:gap-10 w-full lg:w-auto relative shrink-0">
          {/* Realistic Stethoscope Artwork */}
          <div className="relative w-44 sm:w-56 h-24 sm:h-28 flex items-center justify-center shrink-0">
            {/* Background Botanical Leaves */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
              viewBox="0 0 240 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M170 30 C195 20, 220 35, 225 60 C210 65, 185 55, 170 30Z"
                fill="#DCFCE7"
                opacity="0.8"
              />
              <path
                d="M185 30 Q198 45 220 58"
                stroke="#15803D"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.5"
              />
              <path
                d="M140 10 C160 5, 180 18, 182 38 C168 40, 150 30, 140 10Z"
                fill="#BBF7D0"
                opacity="0.6"
              />
              <path
                d="M195 65 C220 70, 235 95, 230 115 C212 110, 202 90, 195 65Z"
                fill="#DCFCE7"
                opacity="0.7"
              />
              <path
                d="M25 80 C40 70, 65 75, 75 95 C60 105, 35 100, 25 80Z"
                fill="#DCFCE7"
                opacity="0.6"
              />
            </svg>

            {/* 3D Realistic Stethoscope SVG */}
            <svg
              className="w-full h-full drop-shadow-md z-10"
              viewBox="0 0 240 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M60 20 C60 38, 85 55, 105 58"
                stroke="#94A3B8"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M120 20 C120 38, 95 55, 105 58"
                stroke="#CBD5E1"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <ellipse cx="60" cy="18" rx="4" ry="2.5" fill="#475569" />
              <ellipse cx="120" cy="18" rx="4" ry="2.5" fill="#475569" />
              <path
                d="M105 58 C115 62, 130 75, 140 90 C155 110, 185 108, 195 85 C205 60, 180 40, 150 42 C120 44, 100 70, 115 95 C125 110, 150 115, 165 105"
                stroke="#065F46"
                strokeWidth="5.5"
                strokeLinecap="round"
              />
              <path
                d="M105 58 C115 62, 130 75, 140 90 C155 110, 185 108, 195 85 C205 60, 180 40, 150 42 C120 44, 100 70, 115 95 C125 110, 150 115, 165 105"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="1 6"
                opacity="0.7"
              />
              <circle
                cx="165"
                cy="105"
                r="11"
                fill="url(#chestpieceGradClean)"
                stroke="#64748B"
                strokeWidth="2"
              />
              <circle cx="165" cy="105" r="7" fill="#F8FAFC" opacity="0.9" />
              <circle cx="165" cy="105" r="3" fill="#065F46" />
              <defs>
                <linearGradient id="chestpieceGradClean" x1="154" y1="94" x2="176" y2="116">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#CBD5E1" />
                  <stop offset="100%" stopColor="#64748B" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* TriGyna Brand Box */}
          <div className="pl-6 border-l border-[#E2E8F0] shrink-0 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] flex items-center justify-center text-[#065F46]">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C12 2 13.5 6.5 16.5 8C19.5 9.5 22 12 22 12C22 12 17.5 13.5 16 16.5C14.5 19.5 12 22 12 22C12 22 10.5 17.5 7.5 16C4.5 14.5 2 12 2 12C2 12 6.5 10.5 8 7.5C9.5 4.5 12 2 12 2Z" />
                </svg>
              </div>
              <span className="text-xl font-extrabold text-[#064E3B] tracking-tight">
                TriGyna
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#64748B] font-medium mt-1 tracking-tight">
              Online Consultation • Women&apos;s Health • Wellness
            </p>
          </div>
        </div>
      </div>

      {/* Critical Schedule Alerts (if present) */}
      {scheduleAlerts.length > 0 && (
        <div className="space-y-2">
          {scheduleAlerts.map((alert) => {
            const isWarning = alert.severity === "warning" || alert.severity === "urgent";
            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  isWarning
                    ? "bg-[#FFF7ED] border-[#FDBA74] text-[#C2410C]"
                    : "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#EA580C]" />
                  ) : (
                    <Info className="w-4 h-4 shrink-0 text-[#16A34A]" />
                  )}
                  <span className="font-semibold">{alert.title}:</span>
                  <span className="text-[#111827]/80">{alert.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("appointments")}
                  className="px-2.5 py-1 bg-white border rounded-lg font-medium shadow-2xs hover:bg-gray-50 cursor-pointer"
                >
                  Manage
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN SPLIT: LEFT (8 COLS) + RIGHT (4 COLS)                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT COLUMN (8 COLS) ================= */}
        <div className="lg:col-span-8 space-y-5">
          {/* A. Row of 5 KPI Cards (Exact Reference Hierarchy) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* KPI 1: Today's Appointments */}
            <div
              onClick={() => setScheduleTab("today")}
              className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#065F46]/50 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#15803D] mb-3 group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-medium text-[#64748B] leading-tight">
                Today&apos;s Appointments
              </p>
              <p className="text-2xl sm:text-[26px] font-extrabold text-[#111827] mt-1 tracking-tight">
                {isLoading ? "--" : String(kpis.todayAppointments).padStart(2, "0")}
              </p>
              <p className="text-[11px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
                <span>{kpis.todayAppointmentsDelta || "↑ +2 vs yesterday"}</span>
              </p>
            </div>

            {/* KPI 2: Total Patients */}
            <div
              onClick={() => onNavigateTab("patients")}
              className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#065F46]/50 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#15803D] mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-medium text-[#64748B] leading-tight">
                Total Patients
              </p>
              <p className="text-2xl sm:text-[26px] font-extrabold text-[#111827] mt-1 tracking-tight">
                {isLoading ? "--" : kpis.totalPatients}
              </p>
              <p className="text-[11px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
                <span>{kpis.totalPatientsDelta || "↑ +8 this week"}</span>
              </p>
            </div>

            {/* KPI 3: Consultations */}
            <div
              onClick={() => onNavigateTab("consultations")}
              className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#7C3AED]/50 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED] mb-3 group-hover:scale-105 transition-transform">
                <Video className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-medium text-[#64748B] leading-tight">
                Consultations
              </p>
              <p className="text-2xl sm:text-[26px] font-extrabold text-[#111827] mt-1 tracking-tight">
                {isLoading ? "--" : String(kpis.consultations).padStart(2, "0")}
              </p>
              <p className="text-[11px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
                <span>{kpis.consultationsDelta || "↑ +3 today"}</span>
              </p>
            </div>

            {/* KPI 4: Prescriptions */}
            <div
              onClick={() => onNavigateTab("prescriptions")}
              className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#EA580C]/50 transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#FFEDD5] flex items-center justify-center text-[#EA580C] mb-3 group-hover:scale-105 transition-transform">
                <RxIcon className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-medium text-[#64748B] leading-tight">
                Prescriptions
              </p>
              <p className="text-2xl sm:text-[26px] font-extrabold text-[#111827] mt-1 tracking-tight">
                {isLoading ? "--" : String(kpis.prescriptions).padStart(2, "0")}
              </p>
              <p className="text-[11px] font-semibold text-[#16A34A] mt-1 flex items-center gap-0.5">
                <span>{kpis.prescriptionsDelta || "↑ +2 today"}</span>
              </p>
            </div>

            {/* KPI 5: Follow-ups Due */}
            <div
              onClick={() => onNavigateTab("followups")}
              className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#EF4444]/50 transition-all cursor-pointer group col-span-2 sm:col-span-1"
            >
              <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-[#EF4444] mb-3 group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-medium text-[#64748B] leading-tight">
                Follow-ups Due
              </p>
              <p className="text-2xl sm:text-[26px] font-extrabold text-[#111827] mt-1 tracking-tight">
                {isLoading ? "--" : String(kpis.followupsDue).padStart(2, "0")}
              </p>
              <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                {kpis.followupsDelta || `${kpis.followupsOverdue || 4} overdue`}
              </p>
            </div>
          </div>

          {/* B. Today's Schedule Card (with Tasteful Next-Appointment Spotlight) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            {/* Header & Filter Tabs */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#065F46]" />
                  <h2 className="text-base font-bold text-[#111827]">
                    Today&apos;s Schedule
                  </h2>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleTab("today")}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      scheduleTab === "today"
                        ? "bg-[#065F46] text-white shadow-2xs"
                        : "bg-[#F1F5F9] text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    Today ({todayCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleTab("upcoming")}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      scheduleTab === "upcoming"
                        ? "bg-[#065F46] text-white shadow-2xs"
                        : "bg-[#F1F5F9] text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    Upcoming ({upcomingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleTab("completed")}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      scheduleTab === "completed"
                        ? "bg-[#065F46] text-white shadow-2xs"
                        : "bg-[#F1F5F9] text-[#64748B] hover:text-[#111827]"
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>
              </div>

              {/* View Calendar Link */}
              <button
                type="button"
                onClick={() => onNavigateTab("appointments")}
                className="text-xs font-semibold text-[#065F46] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Calendar</span>
                <span>→</span>
              </button>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto min-h-[280px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] bg-[#FAFAF9] font-medium">
                    <th className="py-3 px-4 w-28">Time</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Service / Reason</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/70">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#64748B]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#065F46] mb-2" />
                        Loading appointments...
                      </td>
                    </tr>
                  ) : displayedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#64748B]">
                        No appointments found in this view.
                      </td>
                    </tr>
                  ) : (
                    displayedList.slice(0, 5).map((appt, idx) => {
                      const patient = appt.patientId || {};
                      const pName = patient.fullName || "Sanya Khanna";
                      const pCode = patient.patientCode || appt.appointmentCode || "TG-10235";
                      const pAge = patient.age ? `${patient.age} Y` : "32 Y";
                      const avatarStyle = getAvatarStyle(pName);

                      const isWaiting =
                        appt.status === "waiting" ||
                        appt.status === "in_queue" ||
                        appt.status === "checked_in";
                      const isCompleted = appt.status === "completed";
                      const isInConsultation = appt.status === "in_consultation";

                      // Identify whether this row is the primary focus appointment
                      const isRowFocus =
                        focusAppt &&
                        (focusAppt._id === appt._id ||
                          (!liveAppointment && idx === 0 && scheduleTab === "today"));

                      return (
                        <tr
                          key={appt._id || idx}
                          className={`transition-colors group ${
                            isRowFocus
                              ? "bg-[#F0FDF4]/70 border-l-[3px] border-l-[#065F46]"
                              : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {/* Time with green vertical indicator */}
                          <td className="py-3.5 px-4 font-bold text-[#111827] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-[3px] h-3.5 bg-[#065F46] rounded-full inline-block" />
                              <span>{appt.startTime || "10:00 AM"}</span>
                              {isRowFocus && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#065F46] text-white">
                                  {isInConsultation ? "LIVE" : "NEXT"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Patient: Avatar Initials + Name + ID & Age */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                onClick={() => {
                                  if (patient._id) onOpenPatientProfile(patient._id);
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer ${avatarStyle.bg} ${avatarStyle.text}`}
                              >
                                {getInitials(pName)}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (patient._id) onOpenPatientProfile(patient._id);
                                  }}
                                  className="font-bold text-xs text-[#111827] hover:text-[#065F46] hover:underline truncate block text-left cursor-pointer"
                                >
                                  {pName}
                                </button>
                                <p className="text-[11px] text-[#64748B] truncate">
                                  {pCode} • {pAge}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Service / Reason */}
                          <td className="py-3.5 px-4 text-xs font-medium text-[#111827] whitespace-nowrap">
                            {appt.serviceName || "PCOS Consultation"}
                          </td>

                          {/* Type: Video */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                              <Video className="w-3.5 h-3.5 text-[#065F46]" />
                              <span>Video</span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {isInConsultation ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EF4444] text-white animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                Live Now
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#16A34A]">
                                Completed
                              </span>
                            ) : isWaiting ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                Waiting
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCFCE7] text-[#16A34A]">
                                Confirmed
                              </span>
                            )}
                          </td>

                          {/* Action Button & 3-Dots Menu */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap relative">
                            <div className="flex items-center justify-end gap-2">
                              {isInConsultation ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenConsultation(
                                      appt._id,
                                      patient._id || patient
                                    )
                                  }
                                  className="flex items-center gap-1.5 px-3.5 py-1 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                                >
                                  <Video className="w-3 h-3 text-white" />
                                  <span>Resume</span>
                                </button>
                              ) : isWaiting ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenConsultation(
                                      appt._id,
                                      patient._id || patient
                                    )
                                  }
                                  className="flex items-center gap-1.5 px-3.5 py-1 bg-white border border-[#065F46] hover:bg-[#F0FDF4] text-[#065F46] rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                                >
                                  <Video className="w-3 h-3 text-[#065F46]" />
                                  <span>Join</span>
                                </button>
                              ) : isCompleted ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenConsultation(
                                      appt._id,
                                      patient._id || patient
                                    )
                                  }
                                  className="px-3 py-1 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#111827] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                >
                                  View
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenConsultation(
                                      appt._id,
                                      patient._id || patient
                                    )
                                  }
                                  className="flex items-center gap-1.5 px-3.5 py-1 bg-[#065F46] hover:bg-[#064E3B] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Start</span>
                                </button>
                              )}

                              {/* Three-dots menu */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveMenuId(
                                      activeMenuId === appt._id ? null : appt._id
                                    )
                                  }
                                  className="p-1 text-[#64748B] hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                  aria-label="More options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {activeMenuId === appt._id && (
                                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1.5 z-30 animate-fade-in text-left">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onOpenConsultation(
                                          appt._id,
                                          patient._id || patient
                                        );
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs text-[#111827] hover:bg-[#F0FDF4] rounded-lg flex items-center gap-2 cursor-pointer text-left"
                                    >
                                      <Stethoscope className="w-3.5 h-3.5 text-[#065F46]" />
                                      <span>Consultation Room</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (patient._id) {
                                          onOpenPatientProfile(patient._id);
                                        }
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs text-[#111827] hover:bg-[#F0FDF4] rounded-lg flex items-center gap-2 cursor-pointer text-left"
                                    >
                                      <Users className="w-3.5 h-3.5 text-[#065F46]" />
                                      <span>Patient Profile</span>
                                    </button>
                                    {appt.meetingLink && (
                                      <a
                                        href={appt.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setActiveMenuId(null)}
                                        className="w-full px-2.5 py-1.5 text-xs text-[#111827] hover:bg-[#F0FDF4] rounded-lg flex items-center gap-2 cursor-pointer text-left"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 text-[#065F46]" />
                                        <span>Join Google Meet</span>
                                      </a>
                                    )}
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

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-white flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onNavigateTab("appointments")}
                className="font-semibold text-[#065F46] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Schedule</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* C. Bottom Row: 2 Cards Side-by-Side (This Week Overview & Consultation Trend) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: This Week Overview */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#065F46]" />
                  <h3 className="text-sm font-bold text-[#111827]">
                    This Week Overview
                  </h3>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] cursor-pointer hover:border-gray-300">
                  <span>Mon – Sun</span>
                  <ChevronDown className="w-3 h-3 text-[#64748B]" />
                </div>
              </div>

              {/* 4 Metrics in a row */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-left">
                {/* Metric 1 */}
                <div>
                  <p className="text-[10px] sm:text-[11px] text-[#64748B] font-medium leading-tight">
                    Consultations
                  </p>
                  <p className="text-xl font-extrabold text-[#111827] mt-1">
                    {weeklyOverview.consultations.count}
                  </p>
                  <p className="text-[10px] font-semibold text-[#16A34A] mt-0.5">
                    {weeklyOverview.consultations.delta}
                  </p>
                </div>

                {/* Metric 2 */}
                <div>
                  <p className="text-[10px] sm:text-[11px] text-[#64748B] font-medium leading-tight">
                    Prescriptions
                  </p>
                  <p className="text-xl font-extrabold text-[#111827] mt-1">
                    {weeklyOverview.prescriptions.count}
                  </p>
                  <p className="text-[10px] font-semibold text-[#16A34A] mt-0.5">
                    {weeklyOverview.prescriptions.delta}
                  </p>
                </div>

                {/* Metric 3 */}
                <div>
                  <p className="text-[10px] sm:text-[11px] text-[#64748B] font-medium leading-tight">
                    Follow-ups
                  </p>
                  <p className="text-xl font-extrabold text-[#111827] mt-1">
                    {weeklyOverview.followups.count}
                  </p>
                  <p className="text-[10px] font-semibold text-[#16A34A] mt-0.5">
                    {weeklyOverview.followups.delta}
                  </p>
                </div>

                {/* Metric 4 */}
                <div>
                  <p className="text-[10px] sm:text-[11px] text-[#64748B] font-medium leading-tight">
                    New Patients
                  </p>
                  <p className="text-xl font-extrabold text-[#111827] mt-1">
                    {weeklyOverview.newPatients.count}
                  </p>
                  <p className="text-[10px] font-semibold text-[#16A34A] mt-0.5">
                    {weeklyOverview.newPatients.delta}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Consultation Trend (Pure SVG Area Line Chart) */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#065F46]" />
                  <h3 className="text-sm font-bold text-[#111827]">
                    Consultation Trend
                  </h3>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] cursor-pointer hover:border-gray-300">
                  <span>Last 7 Days</span>
                  <ChevronDown className="w-3 h-3 text-[#64748B]" />
                </div>
              </div>

              {/* Responsive SVG Area Line Chart */}
              <div className="w-full pt-1">
                <svg
                  className="w-full h-20 overflow-visible"
                  viewBox="0 0 320 80"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGradientClean" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Smooth Area Polygon */}
                  <path
                    d="M 15 55 Q 60 48, 105 52 T 195 40 T 255 22 T 305 15 L 305 75 L 15 75 Z"
                    fill="url(#chartGradientClean)"
                  />

                  {/* Smooth Curve Stroke */}
                  <path
                    d="M 15 55 Q 60 48, 105 52 T 195 40 T 255 22 T 305 15"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Circle Dots on Data Points */}
                  <circle cx="15" cy="55" r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
                  <circle cx="63" cy="50" r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
                  <circle cx="111" cy="52" r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
                  <circle cx="159" cy="45" r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
                  <circle cx="207" cy="40" r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
                  <circle cx="255" cy="22" r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
                  <circle cx="305" cy="15" r="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2" />
                </svg>

                {/* Day Labels Mon - Sun */}
                <div className="flex items-center justify-between text-[10px] text-[#64748B] font-medium pt-2 px-1">
                  {trendData.map((t, idx) => (
                    <span key={idx}>{t.day}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (4 COLS) ================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* ===================================================================== */}
          {/* 1. CONSULTATION HUB / NEXT APPOINTMENT FOCUS (Exact Reference Layout)  */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            {/* Header: Pure Reference Deep Green Styling */}
            <div className="bg-[#065F46] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold tracking-tight">
                  {isLiveActive ? "Ongoing Consultation" : "Next Consultation"}
                </h3>
              </div>

              {/* Status Badge */}
              {isLiveActive ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#064E3B] border border-[#10B981]/40 text-xs font-semibold text-white shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#064E3B] border border-[#10B981]/40 text-xs font-semibold text-white">
                  <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                  <span>{focusStartTime}</span>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5">
              {/* Inner Patient Info Card */}
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Purple Initials Circle (SK) */}
                  <div
                    onClick={() => {
                      if (focusPatient._id) onOpenPatientProfile(focusPatient._id);
                    }}
                    className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer ${
                      getAvatarStyle(focusPatientName).bg
                    } ${getAvatarStyle(focusPatientName).text}`}
                  >
                    {getInitials(focusPatientName)}
                  </div>

                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (focusPatient._id) onOpenPatientProfile(focusPatient._id);
                      }}
                      className="text-xs font-bold text-[#111827] hover:text-[#065F46] hover:underline truncate block text-left cursor-pointer"
                    >
                      {focusPatientName}
                    </button>
                    <p className="text-[11px] text-[#64748B] truncate">
                      {focusPatientCode} • {focusPatientAge}
                    </p>
                    <p className="text-[11px] font-medium text-[#065F46] flex items-center gap-1.5 mt-0.5">
                      <Video className="w-3 h-3 text-[#065F46]" />
                      <span>Online Video Consultation</span>
                    </p>
                  </div>
                </div>

                {/* Live Stopwatch Timer OR Scheduled Time */}
                {isLiveActive ? (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs font-bold text-[#111827] shrink-0">
                    <Clock className="w-3 h-3 text-[#64748B]" />
                    <span>{formatCallTime(callSeconds)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0] text-xs font-bold text-[#065F46] shrink-0">
                    <Clock className="w-3 h-3 text-[#065F46]" />
                    <span>{focusStartTime}</span>
                  </div>
                )}
              </div>

              {/* Direct Start Meeting Action Button (Clean, 1-Click Join) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (focusAppt?._id) {
                      onOpenConsultation(
                        focusAppt._id,
                        focusPatient._id || focusPatient
                      );
                    } else {
                      onNavigateTab("consultations");
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-[#065F46] hover:bg-[#064E3B] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isLiveActive ? "Resume Meeting" : "Start Meeting"}</span>
                </button>

                {/* Pre-Call Tools & Direct Google Meet Join */}
                <div className="flex items-center justify-between text-xs px-1 pt-1 text-[#64748B]">
                  <span className="truncate text-[11px] font-medium text-[#111827]">
                    {focusServiceName}
                  </span>
                  {focusMeetingLink ? (
                    <a
                      href={focusMeetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#065F46] hover:underline font-semibold flex items-center gap-1 text-[11px] shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Join Google Meet</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(focusMeetingLink)}
                      className="text-[#065F46] hover:underline font-semibold flex items-center gap-1 text-[11px] shrink-0"
                    >
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Today's Queue Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#065F46]" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Today&apos;s Queue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("appointments")}
                className="text-xs font-semibold text-[#065F46] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <span>→</span>
              </button>
            </div>

            {/* 3 Categories Stacked */}
            <div className="space-y-2">
              {/* Category 1: Waiting to Start */}
              <button
                type="button"
                onClick={() => {
                  setScheduleTab("today");
                }}
                className="w-full p-2.5 rounded-xl border border-[#FEF3C7] bg-[#FFFBEB]/50 hover:bg-[#FFFBEB] flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#D97706] font-bold text-xs flex items-center justify-center">
                    {queueSummary.waitingToStart}
                  </span>
                  <span className="text-xs font-semibold text-[#111827]">
                    Waiting to Start
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              </button>

              {/* Category 2: In Consultation */}
              <button
                type="button"
                onClick={() => onNavigateTab("consultations")}
                className="w-full p-2.5 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/50 hover:bg-[#F0FDF4] flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-[#DCFCE7] text-[#16A34A] font-bold text-xs flex items-center justify-center">
                    {queueSummary.inConsultation}
                  </span>
                  <span className="text-xs font-semibold text-[#111827]">
                    In Consultation
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              </button>

              {/* Category 3: Completed */}
              <button
                type="button"
                onClick={() => setScheduleTab("completed")}
                className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 hover:bg-[#F8FAFC] flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-[#F1F5F9] text-[#64748B] font-bold text-xs flex items-center justify-center">
                    {queueSummary.completed}
                  </span>
                  <span className="text-xs font-semibold text-[#111827]">
                    Completed
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>
          </div>

          {/* 3. Quick Actions Card (2x2 Grid) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5">
            <div className="flex items-center gap-2 mb-3.5">
              <Zap className="w-4 h-4 text-[#065F46]" />
              <h3 className="text-sm font-bold text-[#111827]">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Tile 1: New Consultation */}
              <button
                type="button"
                onClick={() => onNavigateTab("consultations")}
                className="p-3 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] hover:bg-[#DCFCE7]/60 flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-white text-[#065F46] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#111827] leading-tight">
                  New Consultation
                </span>
              </button>

              {/* Tile 2: Write Prescription */}
              <button
                type="button"
                onClick={() => onNavigateTab("prescriptions")}
                className="p-3 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] hover:bg-[#DCFCE7]/60 flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-white text-[#065F46] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <RxIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#111827] leading-tight">
                  Write Prescription
                </span>
              </button>

              {/* Tile 3: Add Follow-up */}
              <button
                type="button"
                onClick={() => onNavigateTab("followups")}
                className="p-3 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] hover:bg-[#DCFCE7]/60 flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-white text-[#065F46] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#111827] leading-tight">
                  Add Follow-up
                </span>
              </button>

              {/* Tile 4: Add Patient */}
              <button
                type="button"
                onClick={() => onNavigateTab("patients")}
                className="p-3 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] hover:bg-[#DCFCE7]/60 flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-white text-[#065F46] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#111827] leading-tight">
                  Add Patient
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
