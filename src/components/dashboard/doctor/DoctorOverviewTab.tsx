"use client";

import React, { useState } from "react";
import {
  Calendar,
  Users,
  Stethoscope,
  Clock,
  FileText,
  Activity,
  Phone,
  ChevronRight,
  MoreHorizontal,
  Sun,
  CheckCircle2,
  ChevronLeft,
  CalendarCheck,
  Check,
  Loader2,
} from "lucide-react";
import { DoctorTab } from "./DoctorSidebar";
import { api } from "@/lib/api/client";

export interface DashboardSummary {
  doctor: {
    name: string;
    designation: string;
    specialization: string;
    initials: string;
  };
  todayDate: string;
  formattedDate: string;
  kpis: {
    todayAppointments: number;
    todayAppointmentsDelta: string;
    waitingPatients: number;
    waitingDelta: string;
    completedConsultations: number;
    completedDelta: string;
    followupsDue: number;
    followupsDelta: string;
    pendingNotes: number;
    pendingNotesDelta: string;
  };
  todayAppointments?: Array<{
    _id: string;
    appointmentCode: string;
    startTime: string;
    endTime?: string;
    patientId: {
      _id: string;
      fullName: string;
      age?: number;
      patientCode: string;
      avatarUrl?: string;
    };
    serviceName: string;
    mode: string;
    status: "scheduled" | "checked_in" | "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show";
    notes?: string;
  }>;
  appointments?: Array<{
    _id: string;
    appointmentCode: string;
    startTime: string;
    endTime?: string;
    patientId: {
      _id: string;
      fullName: string;
      age?: number;
      patientCode: string;
      avatarUrl?: string;
    };
    serviceName: string;
    mode: string;
    status: "scheduled" | "checked_in" | "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show";
    notes?: string;
  }>;
  patientQueue: Array<{
    position: number;
    appointmentId: string;
    patientId: {
      _id: string;
      fullName: string;
      age?: number;
      patientCode: string;
    };
    patientName?: string;
    patientAge?: number;
    patientCode?: string;
    serviceName: string;
    waitingTimeMinutes: number;
    status: string;
  }>;
  upcomingFollowups?: Array<{
    _id: string;
    recommendedDate: string;
    patientId: {
      _id: string;
      fullName: string;
      patientCode: string;
    };
    reason: string;
    type: "appointment" | "call";
    status: "pending" | "scheduled" | "completed";
  }>;
  upcomingFollowUps?: Array<{
    _id: string;
    recommendedDate: string;
    patientId: {
      _id: string;
      fullName: string;
      patientCode: string;
    };
    reason: string;
    type: "appointment" | "call";
    status: "pending" | "scheduled" | "completed";
  }>;
  clinicalTasks: Array<{
    _id: string;
    title: string;
    dueDateText: string;
    isDueToday: boolean;
    completed: boolean;
    patientName?: string;
  }>;
  recentActivity: Array<{
    _id: string;
    action: string;
    patientName: string;
    timestampText: string;
    type: "completed" | "checkin" | "prescription" | "followup" | "system";
  }>;
  unreadNotifications?: number;
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
  const [appointmentViewMode, setAppointmentViewMode] = useState<"list" | "calendar">("list");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [taskToggling, setTaskToggling] = useState<Record<string, boolean>>({});
  const [taskStates, setTaskStates] = useState<Record<string, boolean>>({});

  const appointments = data?.todayAppointments || data?.appointments || [];
  const followupsList = data?.upcomingFollowups || data?.upcomingFollowUps || [];
  const queueList = data?.patientQueue || [];
  const totalAppointments = appointments.length;
  const totalPages = Math.ceil(totalAppointments / pageSize) || 1;
  const paginatedAppointments = appointments.slice((page - 1) * pageSize, page * pageSize);

  // Toggle clinical task
  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      setTaskToggling((prev) => ({ ...prev, [taskId]: true }));
      // optimistic update
      setTaskStates((prev) => ({ ...prev, [taskId]: !currentCompleted }));
      await api.patch(`/api/v1/doctor/tasks/${taskId}/toggle`, {});
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle task", err);
      // rollback
      setTaskStates((prev) => ({ ...prev, [taskId]: currentCompleted }));
    } finally {
      setTaskToggling((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  // Helper for patient initials
  const getInitials = (name: string) => {
    if (!name) return "PT";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper for appointment status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E7F3EA] text-[#287A4B]">
            Completed
          </span>
        );
      case "in_consultation":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0284C7]">
            In Consultation
          </span>
        );
      case "waiting":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
            Waiting
          </span>
        );
      case "checked_in":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0284C7]">
            Checked In
          </span>
        );
      case "scheduled":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#4B5563]">
            Scheduled
          </span>
        );
    }
  };

  // Avatar color generator based on name
  const getAvatarBg = (name: string) => {
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-blue-100 text-blue-700",
      "bg-emerald-100 text-emerald-700",
      "bg-pink-100 text-pink-700",
      "bg-amber-100 text-amber-700",
      "bg-indigo-100 text-indigo-700",
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 1. Welcome Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-[0_2px_10px_rgba(20,55,35,0.03)]">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/60 shadow-sm flex-shrink-0">
            <Sun className="w-8 h-8 fill-amber-400 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#17251E] tracking-tight">
              Good morning, {data?.doctor?.name ? data.doctor.name.split(" ")[0] + " " + (data.doctor.name.split(" ")[1] || "") : "Dr. Ananya"}!
            </h1>
            <p className="text-sm text-[#65746B] mt-0.5">
              Here&apos;s your clinical overview for today,{" "}
              <span className="font-medium text-[#17251E]">
                {data?.formattedDate || "26 October 2026"}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Selector */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              aria-label="Select date"
            />
            <button
              type="button"
              className="flex items-center gap-2.5 px-4 py-2 bg-white border border-[#E1E9E3] hover:border-[#154734]/40 rounded-xl text-sm font-medium text-[#17251E] shadow-sm transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#154734]" />
              <span>{data?.formattedDate || "Mon, 26 Oct 2026"}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-90" />
            </button>
          </div>

          {/* View Full Schedule CTA */}
          <button
            type="button"
            onClick={() => onNavigateTab("appointments")}
            className="flex items-center gap-2 px-5 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>View Full Schedule</span>
          </button>
        </div>
      </div>

      {/* 2. Five KPI Cards (Matching reference layout) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Today's Appointments */}
        <div
          onClick={() => onNavigateTab("appointments")}
          className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-[0_2px_8px_rgba(20,55,35,0.03)] hover:shadow-md hover:border-[#154734]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#E7F3EA] text-[#154734] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5 text-[#154734]" />
            </div>
          </div>
          <p className="text-xs font-medium text-[#65746B]">Today&apos;s Appointments</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#17251E] tracking-tight">
              {isLoading ? "..." : String(data?.kpis?.todayAppointments ?? 12).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold text-[#287A4B] flex items-center">
              ↑ +2 <span className="text-[#65746B] font-normal ml-1">vs. yesterday</span>
            </span>
          </div>
        </div>

        {/* Card 2: Waiting Patients */}
        <div
          onClick={() => onNavigateTab("appointments")}
          className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-[0_2px_8px_rgba(20,55,35,0.03)] hover:shadow-md hover:border-[#154734]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 text-[#D97706]" />
            </div>
          </div>
          <p className="text-xs font-medium text-[#65746B]">Waiting Patients</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#17251E] tracking-tight">
              {isLoading ? "..." : String(data?.kpis?.waitingPatients ?? 3).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold text-[#B42332] flex items-center">
              ↑ +1 <span className="text-[#65746B] font-normal ml-1">In queue now</span>
            </span>
          </div>
        </div>

        {/* Card 3: Consultations Completed */}
        <div
          onClick={() => onNavigateTab("consultations")}
          className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-[0_2px_8px_rgba(20,55,35,0.03)] hover:shadow-md hover:border-[#154734]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5 text-[#059669]" />
            </div>
          </div>
          <p className="text-xs font-medium text-[#65746B]">Consultations Completed</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#17251E] tracking-tight">
              {isLoading ? "..." : String(data?.kpis?.completedConsultations ?? 8).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold text-[#287A4B] flex items-center">
              ↑ +3 <span className="text-[#65746B] font-normal ml-1">of 12 scheduled</span>
            </span>
          </div>
        </div>

        {/* Card 4: Follow-ups Due */}
        <div
          onClick={() => onNavigateTab("followups")}
          className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-[0_2px_8px_rgba(20,55,35,0.03)] hover:shadow-md hover:border-[#154734]/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5 text-[#DC2626]" />
            </div>
          </div>
          <p className="text-xs font-medium text-[#65746B]">Follow-ups Due</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#17251E] tracking-tight">
              {isLoading ? "..." : String(data?.kpis?.followupsDue ?? 5).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold text-[#B42332] flex items-center">
              ↑ +1 <span className="text-[#65746B] font-normal ml-1">This week</span>
            </span>
          </div>
        </div>

        {/* Card 5: Pending Notes */}
        <div
          onClick={() => onNavigateTab("consultations")}
          className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-[0_2px_8px_rgba(20,55,35,0.03)] hover:shadow-md hover:border-[#154734]/30 transition-all cursor-pointer group col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 text-[#7C3AED]" />
            </div>
          </div>
          <p className="text-xs font-medium text-[#65746B]">Pending Notes</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#17251E] tracking-tight">
              {isLoading ? "..." : String(data?.kpis?.pendingNotes ?? 2).padStart(2, "0")}
            </span>
            <span className="text-xs text-[#65746B]">Draft consultations</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Two Columns (Appointments + Patient Queue) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Appointments (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E1E9E3] shadow-[0_2px_10px_rgba(20,55,35,0.03)] flex flex-col justify-between overflow-hidden">
          {/* Card Header */}
          <div className="p-5 border-b border-[#E1E9E3] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#154734] text-white flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#17251E]">Today&apos;s Appointments</h2>
            </div>

            <div className="flex items-center gap-4">
              {/* List / Calendar view switch */}
              <div className="flex items-center gap-1 bg-[#F5F8F6] p-1 rounded-lg border border-[#E1E9E3]/70 text-xs font-medium text-[#65746B]">
                <button
                  type="button"
                  onClick={() => setAppointmentViewMode("list")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    appointmentViewMode === "list"
                      ? "bg-white text-[#154734] font-semibold shadow-sm"
                      : "hover:text-[#17251E]"
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentViewMode("calendar")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    appointmentViewMode === "calendar"
                      ? "bg-white text-[#154734] font-semibold shadow-sm"
                      : "hover:text-[#17251E]"
                  }`}
                >
                  Calendar
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab("appointments")}
                className="text-xs font-semibold text-[#154734] hover:underline"
              >
                View All
              </button>
            </div>
          </div>

          {/* Table / List */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E1E9E3] text-[#65746B] text-xs font-semibold bg-[#FAFCFB]">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E9E3]/70">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-[#65746B]">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
                      Loading appointments...
                    </td>
                  </tr>
                ) : paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-[#65746B]">
                      No appointments assigned for this date.
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((appt) => {
                    const patient = appt.patientId || {};
                    const isCompleted = appt.status === "completed";
                    const isInConsultation = appt.status === "in_consultation";
                    const isWaiting = appt.status === "waiting" || appt.status === "checked_in";

                    return (
                      <tr key={appt._id} className="hover:bg-[#F9FCFA] transition-colors group">
                        {/* Time */}
                        <td className="py-3.5 px-4 font-semibold text-[#17251E] whitespace-nowrap">
                          {appt.startTime || "09:00 AM"}
                        </td>

                        {/* Patient info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => onOpenPatientProfile(patient._id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ${getAvatarBg(
                                patient.fullName || "User"
                              )}`}
                            >
                              {getInitials(patient.fullName || "")}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => onOpenPatientProfile(patient._id)}
                                className="font-semibold text-xs md:text-sm text-[#17251E] hover:text-[#154734] hover:underline text-left block"
                              >
                                {patient.fullName || "Unnamed Patient"}
                              </button>
                              <p className="text-[11px] text-[#65746B]">
                                {patient.age ? `${patient.age} years` : "Age N/A"} •{" "}
                                <span className="text-gray-500 font-mono">
                                  #{patient.patientCode || "TG000"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Visit Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#17251E]">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-[#154734]" />
                            <span>{appt.serviceName || "General Consultation"}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(appt.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => onOpenConsultation(appt._id, patient._id)}
                                className="px-3 py-1.5 text-xs font-medium text-[#17251E] bg-white border border-[#E1E9E3] hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
                              >
                                View Notes
                              </button>
                            ) : isInConsultation ? (
                              <button
                                type="button"
                                onClick={() => onOpenConsultation(appt._id, patient._id)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#154734] hover:bg-[#0E3828] rounded-lg shadow-sm transition-colors active:scale-95"
                              >
                                Open Visit
                              </button>
                            ) : isWaiting ? (
                              <button
                                type="button"
                                onClick={() => onOpenConsultation(appt._id, patient._id)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#154734] hover:bg-[#0E3828] rounded-lg shadow-sm transition-colors active:scale-95"
                              >
                                Start Visit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenPatientProfile(patient._id)}
                                className="px-3 py-1.5 text-xs font-medium text-[#17251E] bg-white border border-[#E1E9E3] hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
                              >
                                View Details
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onOpenPatientProfile(patient._id)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                              title="More actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-4 border-t border-[#E1E9E3] bg-[#FAFCFB] flex items-center justify-between text-xs text-[#65746B]">
            <span>
              Showing {Math.min(appointments.length, (page - 1) * pageSize + 1)} to{" "}
              {Math.min(appointments.length, page * pageSize)} of {totalAppointments} appointments
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg border border-[#E1E9E3] flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    page === p
                      ? "bg-[#154734] text-white"
                      : "border border-[#E1E9E3] text-[#17251E] hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded-lg border border-[#E1E9E3] flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Patient Queue (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E1E9E3] shadow-[0_2px_10px_rgba(20,55,35,0.03)] flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-[#E1E9E3] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#154734]" />
              <h2 className="text-base font-bold text-[#17251E]">Patient Queue</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("appointments")}
              className="text-xs font-semibold text-[#154734] hover:underline"
            >
              View All
            </button>
          </div>

          {/* Queue Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E1E9E3] text-[#65746B] font-semibold bg-[#FAFCFB]">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Waiting Time</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E9E3]/70">
                {queueList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#65746B]">
                      Queue is currently empty.
                    </td>
                  </tr>
                ) : (
                  queueList.slice(0, 5).map((q, idx) => {
                    const pName = q.patientId?.fullName || q.patientName || "Patient";
                    const pAge = q.patientId?.age ?? q.patientAge;
                    const pCode = q.patientId?.patientCode || q.patientCode || "TG00";
                    return (
                      <tr
                        key={q.appointmentId || idx}
                        className="hover:bg-[#F9FCFA] transition-colors"
                      >
                        <td className="py-3 px-3 font-semibold text-gray-500">{q.position || idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${getAvatarBg(
                                pName
                              )}`}
                            >
                              {getInitials(pName)}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-[#17251E] truncate max-w-[110px]">
                                {pName}
                              </p>
                              <p className="text-[10px] text-[#65746B]">
                                {pAge ? `${pAge}y` : ""} • #{pCode}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#17251E] truncate max-w-[110px]">
                          {q.serviceName || "Consultation"}
                        </td>
                        <td className="py-3 px-3 text-gray-600 font-medium">
                          {q.waitingTimeMinutes > 0 ? `${q.waitingTimeMinutes} mins` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">{renderStatusBadge(q.status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#FAFCFB] border-t border-[#E1E9E3] text-right">
            <button
              type="button"
              onClick={onRefresh}
              className="text-[11px] font-medium text-[#154734] hover:underline"
            >
              Live queue updates active
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Three Columns (Follow-ups, Clinical Tasks, Recent Activity) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Column 1: Upcoming Follow-ups */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-[0_2px_10px_rgba(20,55,35,0.03)] flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-[#E1E9E3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#154734]" />
              <h2 className="text-sm font-bold text-[#17251E]">Upcoming Follow-ups</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("followups")}
              className="text-xs font-semibold text-[#154734] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E1E9E3] text-[#65746B] font-semibold bg-[#FAFCFB]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E9E3]/70">
                {followupsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No follow-ups recorded.
                    </td>
                  </tr>
                ) : (
                  followupsList.slice(0, 4).map((f) => (
                    <tr key={f._id} className="hover:bg-[#F9FCFA] transition-colors">
                      <td className="py-2.5 px-3 font-medium text-[#17251E] whitespace-nowrap">
                        {f.recommendedDate}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#17251E] truncate max-w-[90px]">
                        {f.patientId?.fullName || "Patient"}
                      </td>
                      <td className="py-2.5 px-3 text-[#65746B] truncate max-w-[100px]">{f.reason}</td>
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap capitalize">
                        <span className="flex items-center gap-1">
                          {f.type === "call" ? <Phone className="w-3 h-3 text-gray-400" /> : <Calendar className="w-3 h-3 text-gray-400" />}
                          {f.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            f.status === "scheduled"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Clinical Tasks */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-[0_2px_10px_rgba(20,55,35,0.03)] flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-[#E1E9E3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#154734]" />
              <h2 className="text-sm font-bold text-[#17251E]">Clinical Tasks</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("consultations")}
              className="text-xs font-semibold text-[#154734] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1">
            {(data?.clinicalTasks || []).length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-6">All clinical tasks completed.</p>
            ) : (
              data?.clinicalTasks.slice(0, 4).map((task) => {
                const isCompleted =
                  taskStates[task._id] !== undefined ? taskStates[task._id] : task.completed;
                const isToggling = taskToggling[task._id];

                return (
                  <div
                    key={task._id}
                    className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl hover:bg-[#F9FCFA] transition-colors border border-transparent hover:border-[#E1E9E3]"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleTask(task._id, isCompleted)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                          isCompleted
                            ? "bg-[#154734] border-[#154734] text-white"
                            : "border-gray-300 hover:border-[#154734] bg-white"
                        }`}
                      >
                        {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span
                        className={`truncate font-medium ${
                          isCompleted ? "line-through text-gray-400" : "text-[#17251E]"
                        }`}
                      >
                        {task.title}
                      </span>
                    </label>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                        task.isDueToday
                          ? "bg-rose-50 text-rose-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {task.dueDateText}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Recent Activity */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-[0_2px_10px_rgba(20,55,35,0.03)] flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-[#E1E9E3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#154734]" />
              <h2 className="text-sm font-bold text-[#17251E]">Recent Activity</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("reports")}
              className="text-xs font-semibold text-[#154734] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="p-4 space-y-3.5 flex-1">
            {(data?.recentActivity || []).length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-6">No recent clinical events logged.</p>
            ) : (
              data?.recentActivity.slice(0, 4).map((act) => {
                let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                let iconBg = "bg-emerald-50";

                if (act.type === "checkin") {
                  icon = <Users className="w-4 h-4 text-blue-600" />;
                  iconBg = "bg-blue-50";
                } else if (act.type === "prescription") {
                  icon = <FileText className="w-4 h-4 text-purple-600" />;
                  iconBg = "bg-purple-50";
                } else if (act.type === "followup") {
                  icon = <Calendar className="w-4 h-4 text-teal-600" />;
                  iconBg = "bg-teal-50";
                }

                return (
                  <div key={act._id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        {icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#17251E] truncate">{act.action}</p>
                        <p className="text-[11px] text-[#65746B] truncate">{act.patientName}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{act.timestampText}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
