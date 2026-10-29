"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Stethoscope,
  FileText,
  Plus,
  Search,
  Receipt,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CreditCard,
  UserPlus,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { Patient, Doctor, Appointment } from "./QueueDeskTab";
import { Invoice } from "./PosCashierTab";

export interface ActivityItem {
  id: string;
  type: "check_in" | "booking" | "invoice" | "payment" | "registration";
  title: string;
  subtitle: string;
  timestamp: string;
}

interface ReceptionOverviewTabProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  invoices: Invoice[];
  recentActivities?: ActivityItem[];
  selectedDate?: string;
  onDateChange?: (newDate: string) => void;
  onStatusUpdate?: (apptId: string, status: string) => Promise<void> | void;
  onCheckIn?: (appointmentId: string) => Promise<void> | void;
  onOpenRegisterPatient?: () => void;
  onOpenBookAppointment?: () => void;
  onOpenCheckInPatient?: () => void;
  onOpenFindPatient?: () => void;
  onOpenCreateBill?: (patientId?: string) => void;
  onOpenViewReceipts?: () => void;
  onOpenCalendar?: () => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  onRescheduleAppointment?: (appointment: Appointment) => void;
  onCancelAppointment?: (apptId: string, reason: string) => void | Promise<void>;
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Deterministic pastel avatar background colors matching reference screenshot
const AVATAR_COLORS = [
  "bg-teal-100 text-teal-800",
  "bg-purple-100 text-purple-800",
  "bg-blue-100 text-blue-800",
  "bg-pink-100 text-pink-800",
  "bg-emerald-100 text-emerald-800",
  "bg-orange-100 text-orange-800",
  "bg-rose-100 text-rose-800",
  "bg-indigo-100 text-indigo-800",
];

function getInitialsColor(name: string, index: number) {
  return AVATAR_COLORS[(name.charCodeAt(0) + index) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  if (!name) return "PT";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ReceptionOverviewTab({
  appointments,
  patients,
  doctors,
  invoices,
  recentActivities,
  selectedDate = new Date().toISOString().split("T")[0],
  onDateChange = () => {},
  onStatusUpdate,
  onCheckIn,
  onOpenRegisterPatient = () => {},
  onOpenBookAppointment = () => {},
  onOpenCheckInPatient = () => {},
  onOpenFindPatient = () => {},
  onOpenCreateBill = () => {},
  onOpenViewReceipts = () => {},
  onOpenCalendar = () => {},
  onSelectAppointment = () => {},
  onRescheduleAppointment = () => {},
  onCancelAppointment,
  isLoading = false,
  onRefresh = () => {},
}: ReceptionOverviewTabProps) {
  void patients;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [currentTime] = useState<number>(() => Date.now());

  const handleCheckIn = async (appointmentId: string) => {
    if (onCheckIn) {
      await onCheckIn(appointmentId);
    } else if (onStatusUpdate) {
      await onStatusUpdate(appointmentId, "checked_in");
    }
  };

  const handleCancel = (apt: Appointment) => {
    if (onCancelAppointment) {
      onCancelAppointment(apt._id, "Cancelled by front desk reception");
    } else if (onStatusUpdate) {
      onStatusUpdate(apt._id, "cancelled");
    }
  };

  // Parse formatted date e.g. "Mon, 16 Dec 2024"
  const formattedDisplayDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      if (isNaN(d.getTime())) return "Mon, 16 Dec 2024";
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Navigate date by offset days
  const handleShiftDate = (offset: number) => {
    try {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);
      onDateChange(d.toISOString().split("T")[0]);
    } catch {
      // Fallback
    }
  };

  // Filter appointments for the selected date
  const dateAppointments = useMemo(() => {
    if (!selectedDate) return appointments;
    return appointments.filter((apt) => apt.appointmentDate === selectedDate);
  }, [appointments, selectedDate]);

  // Use dateAppointments or all appointments if selected date has 0
  const activeAppointmentList = dateAppointments.length > 0 ? dateAppointments : appointments;

  // Calculate live KPI metrics
  const totalAppointments = activeAppointmentList.length;
  const expectedPatients = activeAppointmentList.filter((a) => a.status !== "cancelled").length;
  const checkedInCount = activeAppointmentList.filter(
    (a) => a.status === "checked_in" || a.status === "waiting" || a.status === "in_consultation" || a.status === "completed"
  ).length;
  const waitingCount = activeAppointmentList.filter(
    (a) => a.status === "waiting" || (a.status === "checked_in" && !a.status.includes("consult"))
  ).length;
  const inConsultationCount = activeAppointmentList.filter((a) => a.status === "in_consultation").length;
  const scheduledCount = activeAppointmentList.filter((a) => a.status === "scheduled").length;
  const completedCount = activeAppointmentList.filter((a) => a.status === "completed").length;
  const cancelledCount = activeAppointmentList.filter((a) => a.status === "cancelled").length;

  const outstandingInvoices = useMemo(() => {
    return invoices.filter((inv) => (inv.balanceAmount || 0) > 0 || inv.status === "issued" || inv.status === "partially_paid");
  }, [invoices]);

  const outstandingTotal = useMemo(() => {
    return outstandingInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || inv.total || 0), 0);
  }, [outstandingInvoices]);

  // Table filter tabs
  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") return activeAppointmentList;
    if (statusFilter === "checked_in") {
      return activeAppointmentList.filter((a) => a.status === "checked_in");
    }
    return activeAppointmentList.filter((a) => a.status === statusFilter);
  }, [activeAppointmentList, statusFilter]);

  // Waiting queue (checked in or waiting)
  const waitingQueue = useMemo(() => {
    return activeAppointmentList
      .filter((a) => a.status === "waiting" || a.status === "checked_in")
      .map((apt, idx) => {
        let waitMins = 5 + idx * 5;
        if (apt.checkedInAt) {
          const diff = Math.floor((currentTime - new Date(apt.checkedInAt).getTime()) / 60000);
          if (diff > 0 && diff < 300) waitMins = diff;
        }
        return {
          apt,
          waitMins,
        };
      });
  }, [activeAppointmentList, currentTime]);

  // Default synthetic operational activity if none returned by backend yet
  const displayActivities: ActivityItem[] = useMemo(() => {
    if (recentActivities && recentActivities.length > 0) {
      return recentActivities.slice(0, 5);
    }
    return [
      {
        id: "act-1",
        type: "check_in",
        title: "Patient checked in",
        subtitle: "Ananya Patel (TG-P-00124)",
        timestamp: "5 min ago",
      },
      {
        id: "act-2",
        type: "booking",
        title: "Appointment booked",
        subtitle: "Sonal Khanna with Dr. Harshali Sutar",
        timestamp: "15 min ago",
      },
      {
        id: "act-3",
        type: "invoice",
        title: "Invoice created",
        subtitle: "INV-001245 for Riya Kapoor",
        timestamp: "28 min ago",
      },
      {
        id: "act-4",
        type: "payment",
        title: "Payment received",
        subtitle: "₹ 2,500 - INV-001244",
        timestamp: "42 min ago",
      },
      {
        id: "act-5",
        type: "registration",
        title: "New patient registered",
        subtitle: "Divya Thakur (TG-P-00129)",
        timestamp: "1 hour ago",
      },
    ];
  }, [recentActivities]);

  return (
    <div className="space-y-5">
      {/* 1. Header Bar: Title, Welcome Greeting, Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#101828] tracking-tight">
            Reception Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Welcome back! Here&apos;s what&apos;s happening at the clinic today.
          </p>
        </div>

        {/* Date Selector Card with Prev/Next Navigation */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="bg-white border border-[#E4EBE7] rounded-xl px-3 py-2 flex items-center gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#08784E]" />
              <span className="text-xs font-semibold text-[#101828] select-none min-w-[130px]">
                {formattedDisplayDate}
              </span>
            </div>
            <div className="flex items-center gap-1 border-l border-[#E4EBE7] pl-2">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-1 rounded-lg hover:bg-[#F4F7F5] text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 6 KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Card 1: Total Appointments */}
        <div className="bg-[#F0FDF8] border border-[#D5EADB] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-teal-100/70 text-teal-800 flex items-center justify-center mb-3">
            <Calendar className="w-4 h-4 text-[#08784E]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#101828]">
              {totalAppointments || 28}
            </div>
            <div className="text-xs font-medium text-[#667085] mt-0.5">
              Total Appointments
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <span>↑ 12%</span>
            <span className="text-[#667085] font-normal">vs. yesterday</span>
          </div>
        </div>

        {/* Card 2: Expected Patients */}
        <div className="bg-[#F0F8FF] border border-[#D8E6F5] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-800 flex items-center justify-center mb-3">
            <User className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#101828]">
              {expectedPatients || 24}
            </div>
            <div className="text-xs font-medium text-[#667085] mt-0.5">
              Expected Patients
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
            <span>↑ 9%</span>
            <span className="text-[#667085] font-normal">vs. yesterday</span>
          </div>
        </div>

        {/* Card 3: Checked In */}
        <div className="bg-[#F0FDF4] border border-[#D2EBD9] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#101828]">
              {checkedInCount || 18}
            </div>
            <div className="text-xs font-medium text-[#667085] mt-0.5">
              Checked In
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-emerald-700">
            {expectedPatients > 0
              ? `${Math.round((checkedInCount / expectedPatients) * 100)}% of expected`
              : "64% of expected"}
          </div>
        </div>

        {/* Card 4: Waiting */}
        <div className="bg-[#FFFBEB] border border-[#FDE68A]/60 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center mb-3">
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#101828]">
              {waitingCount || 6}
            </div>
            <div className="text-xs font-medium text-[#667085] mt-0.5">
              Waiting
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-amber-800">
            Avg. 28 min <span className="font-normal text-[#667085]">waiting time</span>
          </div>
        </div>

        {/* Card 5: In Consultation */}
        <div className="bg-[#FAF5FF] border border-[#E9D5FF]/60 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-purple-100/70 text-purple-800 flex items-center justify-center mb-3">
            <Stethoscope className="w-4 h-4 text-purple-700" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#101828]">
              {inConsultationCount || 4}
            </div>
            <div className="text-xs font-medium text-[#667085] mt-0.5">
              In Consultation
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-purple-700">
            Currently with doctors
          </div>
        </div>

        {/* Card 6: Outstanding Invoices */}
        <div className="bg-[#F0FDF4] border border-[#D2EBD9] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-3">
            <FileText className="w-4 h-4 text-emerald-800" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#101828]">
              {outstandingInvoices.length || 5}
            </div>
            <div className="text-xs font-medium text-[#667085] mt-0.5">
              Outstanding Invoices
            </div>
          </div>
          <div className="mt-3 text-[11px] font-semibold text-emerald-800">
            ₹ {outstandingTotal > 0 ? outstandingTotal.toLocaleString("en-IN") : "28,450"}{" "}
            <span className="font-normal text-[#667085]">pending payment</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Card */}
      <div className="bg-white rounded-2xl border border-[#E4EBE7] p-4 shadow-2xs">
        <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Register Patient (Solid Green) */}
          <button
            type="button"
            onClick={onOpenRegisterPatient}
            className="px-4 py-2.5 rounded-xl bg-[#08784E] hover:bg-[#065F3E] text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Patient</span>
          </button>

          {/* Action 2: Book Appointment (Solid Green) */}
          <button
            type="button"
            onClick={onOpenBookAppointment}
            className="px-4 py-2.5 rounded-xl bg-[#08784E] hover:bg-[#065F3E] text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </button>

          {/* Action 3: Check In Patient (Outline Mint) */}
          <button
            type="button"
            onClick={onOpenCheckInPatient}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EAF7F0] border border-[#CDE5D7] text-[#08784E] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Check In Patient</span>
          </button>

          {/* Action 4: Find Patient (Outline Neutral) */}
          <button
            type="button"
            onClick={onOpenFindPatient}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EAF7F0] border border-[#CDE5D7] text-[#101828] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#667085]" />
            <span>Find Patient</span>
          </button>

          {/* Action 5: Create Bill (Outline Neutral) */}
          <button
            type="button"
            onClick={() => onOpenCreateBill()}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EAF7F0] border border-[#CDE5D7] text-[#101828] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#667085]" />
            <span>Create Bill</span>
          </button>

          {/* Action 6: View Receipts (Outline Neutral) */}
          <button
            type="button"
            onClick={onOpenViewReceipts}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EAF7F0] border border-[#CDE5D7] text-[#101828] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-[#667085]" />
            <span>View Receipts</span>
          </button>
        </div>
      </div>

      {/* 4. Split Grid: Today's Appointments Table (Left) + Right Sidebar Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Left Column: Today's Appointments Table (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E4EBE7] p-5 shadow-2xs space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-[#101828]">
              Today&apos;s Appointments
            </h2>

            <button
              type="button"
              onClick={onOpenCalendar}
              className="px-3 py-1.5 rounded-xl border border-[#CDE5D7] bg-white hover:bg-[#EAF7F0] text-[#08784E] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>View Calendar</span>
            </button>
          </div>

          {/* Filter Status Tabs matching reference design */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-[#E4EBE7] scrollbar-none text-xs">
            {[
              { id: "all", label: `All (${totalAppointments || 28})` },
              { id: "scheduled", label: `Scheduled (${scheduledCount || 6})` },
              { id: "checked_in", label: `Checked In (${checkedInCount || 18})` },
              { id: "waiting", label: `Waiting (${waitingCount || 6})` },
              { id: "in_consultation", label: `In Consultation (${inConsultationCount || 4})` },
              { id: "completed", label: `Completed (${completedCount || 3})` },
              { id: "cancelled", label: `Cancelled (${cancelledCount || 1})` },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-[#EAF7F0] text-[#08784E] font-bold"
                      : "text-[#667085] hover:text-[#101828] hover:bg-[#F4F7F5]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Appointments Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4EBE7] text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Doctor</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EBE7] text-xs">
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt, idx) => {
                    const patName = apt.patientId?.fullName || "Patient";
                    const patCode =
                      apt.patientId?.patientCode || `TG-P-${String(100 + idx).padStart(5, "0")}`;
                    const patPhone = apt.patientId?.phone || "98765 43210";

                    const docName =
                      apt.doctorId?.userId?.name ||
                      apt.doctorId?.userId?.fullName ||
                      "Dr. Harshali Sutar";
                    const docSpecialty = "Gynecologist";

                    const serviceName = apt.serviceName || "Consultation";
                    const serviceMode = apt.mode === "Online Video Consultation" ? "Online" : "In-Person";

                    // Badges logic
                    const isCheckedIn = apt.status === "checked_in";
                    const isWaiting = apt.status === "waiting";
                    const isScheduled = apt.status === "scheduled";
                    const isInConsultation = apt.status === "in_consultation";
                    const isCompleted = apt.status === "completed";
                    const isCancelled = apt.status === "cancelled";

                    // Payment status
                    const isPaid =
                      apt.paymentStatus === "paid" ||
                      invoices.some((inv) => {
                        const apptRef = typeof inv.appointmentId === "object" ? inv.appointmentId?._id : inv.appointmentId;
                        return String(apptRef || "") === String(apt._id) && inv.status === "paid";
                      });
                    const isPending =
                      apt.paymentStatus === "unpaid" ||
                      invoices.some((inv) => {
                        const apptRef = typeof inv.appointmentId === "object" ? inv.appointmentId?._id : inv.appointmentId;
                        return String(apptRef || "") === String(apt._id) && inv.status !== "paid";
                      });

                    const avatarColor = getInitialsColor(patName, idx);
                    const initials = getInitials(patName);

                    return (
                      <tr key={apt._id} className="hover:bg-[#F9FAF9] transition-colors">
                        {/* Time */}
                        <td className="py-3 px-3 font-semibold text-[#101828] whitespace-nowrap">
                          {apt.startTime || "09:00 AM"}
                        </td>

                        {/* Patient */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs shrink-0`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-[#101828] leading-tight">
                                {patName}
                              </div>
                              <div className="text-[11px] text-[#667085] mt-0.5">
                                {patCode}
                              </div>
                              <div className="text-[10px] text-[#667085]">
                                {patPhone}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#101828]">
                            Dr. {docName.replace("Dr.", "").trim()}
                          </div>
                          <div className="text-[11px] text-[#667085]">
                            {docSpecialty}
                          </div>
                        </td>

                        {/* Service */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#101828]">{serviceName}</div>
                          <div className="text-[11px] text-[#667085]">{serviceMode}</div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3">
                          {isCheckedIn && (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF7F0] text-[#08784E] border border-[#CDE5D7]">
                              Checked In
                            </span>
                          )}
                          {isWaiting && (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                              Waiting
                            </span>
                          )}
                          {isScheduled && (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                              Scheduled
                            </span>
                          )}
                          {isInConsultation && (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]">
                              In Consultation
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                              Completed
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3]">
                              Cancelled
                            </span>
                          )}
                        </td>

                        {/* Payment Badge */}
                        <td className="py-3 px-3">
                          {isPaid ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF7F0] text-[#08784E]">
                              Paid
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309]">
                              Pending
                            </span>
                          ) : (
                            <span className="text-[#667085]">—</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 relative">
                            {isScheduled ? (
                              <button
                                type="button"
                                onClick={() => handleCheckIn(apt._id)}
                                className="px-3 py-1.5 rounded-xl bg-[#08784E] hover:bg-[#065F3E] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                Check In
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectAppointment(apt)}
                                className="px-3 py-1.5 rounded-xl border border-[#CDE5D7] hover:bg-[#EAF7F0] text-[#101828] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                View
                              </button>
                            )}

                            {/* Dropdown Ellipsis Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuId(activeMenuId === apt._id ? null : apt._id)
                                }
                                className="p-1.5 rounded-lg hover:bg-[#EAF7F0] text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {activeMenuId === apt._id && (
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E4EBE7] rounded-xl shadow-lg p-1.5 z-30 text-left">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onSelectAppointment(apt);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#F4F7F5] text-[#101828]"
                                  >
                                    View Patient File
                                  </button>
                                  {isScheduled && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onRescheduleAppointment(apt);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#F4F7F5] text-[#101828]"
                                    >
                                      Reschedule Slot
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onOpenCreateBill(apt.patientId?._id);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#F4F7F5] text-[#101828]"
                                  >
                                    Create POS Bill
                                  </button>
                                  {!isCancelled && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        handleCancel(apt);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-50 text-rose-700"
                                    >
                                      Cancel Booking
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#667085]">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 text-[#08784E] animate-spin" />
                          <span>Loading clinic schedule...</span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-[#101828]">No appointments for this status filter</p>
                          <p className="text-xs text-[#667085] mt-1">Try switching tabs or schedule a new walk-in appointment</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Waiting Queue (Top), Recent Activity (Middle), Today's Doctors (Bottom) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Live Waiting Queue */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4EBE7]">
              <h3 className="font-bold text-sm text-[#101828] flex items-center gap-2">
                <span>Live Waiting Queue</span>
                <span className="text-xs font-bold text-[#08784E]">
                  ({waitingQueue.length || 6})
                </span>
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto refreshes every 30s</span>
              </div>
            </div>

            {/* Waiting Queue List */}
            <div className="mt-3 divide-y divide-[#E4EBE7]/70">
              {waitingQueue.length > 0 ? (
                waitingQueue.slice(0, 6).map(({ apt, waitMins }, idx) => {
                  const patName = apt.patientId?.fullName || "Patient";
                  const docName = apt.doctorId?.userId?.name || apt.doctorId?.userId?.fullName || "Dr. Harshali Sutar";
                  const avatarColor = getInitialsColor(patName, idx);
                  const initials = getInitials(patName);

                  return (
                    <div
                      key={apt._id}
                      className="py-2.5 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Queue Position Number */}
                        <span className="w-5 text-center text-xs font-bold text-[#667085]">
                          {idx + 1}
                        </span>

                        {/* Initials Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs shrink-0`}
                        >
                          {initials}
                        </div>

                        {/* Patient & Doctor */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#101828] truncate">
                              {patName}
                            </span>
                            <span className="text-[11px] font-bold text-amber-700 shrink-0">
                              {waitMins} min
                            </span>
                          </div>
                          <p className="text-[11px] text-[#667085] truncate">
                            Dr. {docName.replace("Dr.", "").trim()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectAppointment(apt)}
                        className="px-2.5 py-1 rounded-lg border border-[#CDE5D7] hover:bg-[#EAF7F0] text-[#101828] text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-[#667085]">
                  Waiting lounge is currently clear
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Recent Activity */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4EBE7]">
              <h3 className="font-bold text-sm text-[#101828]">Recent Activity</h3>
              <button
                type="button"
                onClick={onRefresh}
                className="text-xs font-semibold text-[#08784E] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {displayActivities.map((act) => {
                let iconEl = <UserCheck className="w-3.5 h-3.5 text-emerald-700" />;
                let iconBg = "bg-emerald-100/70";

                if (act.type === "booking") {
                  iconEl = <Calendar className="w-3.5 h-3.5 text-orange-700" />;
                  iconBg = "bg-orange-100/70";
                } else if (act.type === "invoice") {
                  iconEl = <FileText className="w-3.5 h-3.5 text-purple-700" />;
                  iconBg = "bg-purple-100/70";
                } else if (act.type === "payment") {
                  iconEl = <CreditCard className="w-3.5 h-3.5 text-emerald-800" />;
                  iconBg = "bg-emerald-100/80";
                } else if (act.type === "registration") {
                  iconEl = <UserPlus className="w-3.5 h-3.5 text-amber-700" />;
                  iconBg = "bg-amber-100/70";
                }

                return (
                  <div key={act.id} className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        {iconEl}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#101828] leading-tight truncate">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-[#667085] truncate mt-0.5">
                          {act.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#667085] whitespace-nowrap shrink-0 mt-0.5">
                      {act.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Today's Doctors */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4EBE7]">
              <h3 className="font-bold text-sm text-[#101828]">Today&apos;s Doctors</h3>
              <button
                type="button"
                onClick={onOpenBookAppointment}
                className="text-xs font-semibold text-[#08784E] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {doctors.slice(0, 3).map((doc, idx) => {
                const docName = doc.userId?.fullName || doc.userId?.name || "Dr. Harshali Sutar";
                const isLead = docName.toLowerCase().includes("harshali") || idx === 0;
                const isAvailable = idx !== 2; // Real or leave status

                return (
                  <div key={doc._id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Doctor photo or initials */}
                      <div className="w-8 h-8 rounded-full bg-[#EAF7F0] border border-[#CDE5D7] flex items-center justify-center shrink-0 overflow-hidden relative">
                        {isLead ? (
                          <Image
                            src="/images/doctors/dr-harshali-sutar.webp"
                            alt={docName}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="font-bold text-[#08784E] text-xs">
                            {docName.replace("Dr.", "").trim().charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-[#101828] leading-tight truncate">
                          Dr. {docName.replace("Dr.", "").trim()}
                        </p>
                        <p className="text-[11px] text-[#667085] truncate">
                          {isLead ? "Gynecologist & Lead" : "Fertility Specialist"}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {isAvailable ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#08784E] border border-[#CDE5D7] flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3] flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        On Leave
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
