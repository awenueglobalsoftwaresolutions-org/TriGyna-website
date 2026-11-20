"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Loader2,
  Stethoscope,
  X,
  Video,
  Building,
  RefreshCw,
  Activity,
  ArrowUpRight,
  MoreVertical,
  Phone,
  FileText,
  CreditCard,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  User,
  XCircle,
  AlertCircle,
  Check,
  Filter,
  Download,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ModalPortal } from "@/components/ui/ModalPortal";

// =========================================================================
// TYPES & DATA CONTRACTS
// =========================================================================
export interface AppointmentItem {
  _id: string;
  appointmentCode: string;
  patientId?: {
    _id: string;
    fullName: string;
    phone: string;
    patientCode: string;
    age?: number;
    gender?: string;
  };
  doctorId?: {
    _id: string;
    userId?: {
      _id?: string;
      name: string;
    };
    specialization?: string | string[];
    consultationFee?: number;
  };
  serviceName: string;
  appointmentDate: string; // "YYYY-MM-DD"
  startTime: string; // "10:00"
  endTime?: string; // "10:30"
  mode: string; // "In-Clinic Consultation" | "Online Video Consultation"
  status: "scheduled" | "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show" | "rescheduled";
  notes?: string;
  cancellationReason?: string;
  paymentStatus?: string;
  meetingProvider?: "google_meet" | "zoom" | "none" | string;
  meetingLink?: string;
  meetingStatus?: "pending" | "ready" | "expired" | string;
  createdAt: string;
  checkedInAt?: string;
  completedAt?: string;
}

export interface DoctorOption {
  _id: string;
  name: string;
  specialization: string;
  allSpecializations?: string[];
  consultationFee?: number;
  avatarUrl?: string;
  status?: string;
}

export interface PatientOption {
  _id: string;
  fullName: string;
  patientCode: string;
  phone: string;
  age?: number;
  gender?: string;
}

export interface AppointmentStats {
  totalAppointments: number;
  todayAppointments: {
    count: number;
    completed: number;
    upcoming: number;
  };
  inConsultation: number;
  completedThisMonth: number;
  cancelledOrNoShow: number;
  distribution: {
    total: number;
    completed: { count: number; percentage: number };
    inConsultation: { count: number; percentage: number };
    upcoming: { count: number; percentage: number };
    cancelled: { count: number; percentage: number };
  };
}

export interface SlotAvailability {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AppointmentsTabProps {
  showNotification: (msg: string, isErr?: boolean) => void;
  onTabChange?: (tab: string) => void;
}

export function AppointmentsTab({ showNotification, onTabChange }: AppointmentsTabProps) {
  const formatApptTimeRange = (start?: string, end?: string) => {
    if (!start) return "";
    const cleanStart = start.replace(/\s*[AaPp][Mm]/, "").trim();
    let cleanEnd = end && !end.includes("NaN") ? end.replace(/\s*[AaPp][Mm]/, "").trim() : "";
    if (!cleanEnd) {
      const [h, m] = cleanStart.split(":").map(Number);
      if (!isNaN(h)) {
        const tot = h * 60 + (isNaN(m) ? 0 : m) + 30;
        cleanEnd = `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
      }
    }
    return cleanEnd ? `${cleanStart} - ${cleanEnd}` : cleanStart;
  };

  // Navigation View: "calendar" | "list" | "timeline" | "doctor"
  const [activeView, setActiveView] = useState<"calendar" | "list" | "timeline" | "doctor">("calendar");

  // Selected Date (default to canonical clinic reference date 2026-10-31)
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-31");

  // Core Live State (100% populated from backend API & MongoDB)
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [calendarDoctors, setCalendarDoctors] = useState<DoctorOption[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorOption[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Slide-over Drawer for Details
  const [activeDrawerAppt, setActiveDrawerAppt] = useState<AppointmentItem | null>(null);

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);
  const [bookingForm, setBookingForm] = useState({
    patientId: "",
    doctorId: "",
    serviceName: "PCOD/PCOS Care",
    appointmentDate: new Date().toISOString().slice(0, 10),
    startTime: "10:00",
    endTime: "10:30",
    mode: "Online Video Consultation",
    videoProvider: "google_meet",
    notes: "",
  });
  const [availableSlots, setAvailableSlots] = useState<SlotAvailability[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Reschedule Modal State
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<AppointmentItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [isReschedulingSubmitting, setIsReschedulingSubmitting] = useState<boolean>(false);
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotAvailability[]>([]);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState<boolean>(false);

  // Meeting Link Modal State
  const [meetingModalAppt, setMeetingModalAppt] = useState<AppointmentItem | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<"google_meet" | "zoom">("google_meet");
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [isSavingMeeting, setIsSavingMeeting] = useState<boolean>(false);

  // Cancel Modal State
  const [cancelModalAppt, setCancelModalAppt] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // =========================================================================
  // DATA FETCHING & SYNCHRONIZATION (100% REAL MONGODB & API)
  // =========================================================================

  // 1. Load registered patients for modal select
  const loadPatients = useCallback(async () => {
    try {
      const res = await api.get<{
        patients?: PatientOption[];
      }>("/patients?limit=100");
      if (res.data?.patients) {
        setPatients(res.data.patients);
      }
    } catch {
      // Non-fatal if offline
    }
  }, []);

  // 2. Load stats & KPIs directly from MongoDB aggregation
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<AppointmentStats>(`/appointments/stats?date=${selectedDate}`);
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load appointment stats:", err);
    }
  }, [selectedDate]);

  // 3. Load calendar data (column doctors & appointments for the selected date)
  const loadCalendarData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (selectedDoctorFilter !== "all") params.append("doctorId", selectedDoctorFilter);
      if (selectedServiceFilter !== "all") params.append("serviceName", selectedServiceFilter);
      if (selectedStatusFilter !== "all") params.append("status", selectedStatusFilter);

      const res = await api.get<{
        doctors?: DoctorOption[];
        allDoctors?: DoctorOption[];
        appointments?: AppointmentItem[];
        totalCount?: number;
      }>(`/appointments/calendar?${params.toString()}`);

      if (res.data) {
        if (res.data.doctors) {
          setCalendarDoctors(res.data.doctors);
        }
        if (res.data.allDoctors) {
          setAllDoctors(res.data.allDoctors);
        } else if (res.data.doctors) {
          setAllDoctors(res.data.doctors);
        }
        if (res.data.appointments) {
          setAppointments(res.data.appointments);
        }
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to load schedule", true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate, selectedDoctorFilter, selectedServiceFilter, selectedStatusFilter, showNotification]);

  // Mount
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Refetch when date or filters change
  useEffect(() => {
    loadStats();
    loadCalendarData();
  }, [loadStats, loadCalendarData]);

  // Fetch slot availability for booking modal from backend
  useEffect(() => {
    if (!isBookModalOpen || !bookingForm.doctorId || !bookingForm.appointmentDate) return;

    let active = true;
    const fetchSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const res = await api.get<{ slots?: SlotAvailability[] }>(
          `/appointments/availability?doctorId=${bookingForm.doctorId}&date=${bookingForm.appointmentDate}`
        );
        if (active && res.data?.slots) {
          setAvailableSlots(res.data.slots);
          const firstAvail = res.data.slots.find((s) => s.isAvailable);
          if (firstAvail) {
            setBookingForm((prev) => ({
              ...prev,
              startTime: firstAvail.startTime,
              endTime: firstAvail.endTime,
            }));
          }
        }
      } catch (err) {
        console.error("Availability check failed:", err);
      } finally {
        if (active) setIsLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      active = false;
    };
  }, [isBookModalOpen, bookingForm.doctorId, bookingForm.appointmentDate]);

  // Fetch slot availability for reschedule modal from backend
  useEffect(() => {
    if (!rescheduleModalAppt || !rescheduleDate) return;

    let active = true;
    const fetchRescheduleSlots = async () => {
      try {
        setIsLoadingRescheduleSlots(true);
        const docId = rescheduleModalAppt.doctorId?._id || "";
        const res = await api.get<{ slots?: SlotAvailability[] }>(
          `/appointments/availability?doctorId=${docId}&date=${rescheduleDate}`
        );
        if (active && res.data?.slots) {
          setRescheduleSlots(res.data.slots);
          const firstAvail = res.data.slots.find((s) => s.isAvailable);
          if (firstAvail) {
            setRescheduleTime(firstAvail.startTime);
          }
        }
      } catch (err) {
        console.error("Reschedule availability check failed:", err);
      } finally {
        if (active) setIsLoadingRescheduleSlots(false);
      }
    };

    fetchRescheduleSlots();
    return () => {
      active = false;
    };
  }, [rescheduleModalAppt, rescheduleDate]);

  // =========================================================================
  // ACTIONS & HANDLERS
  // =========================================================================

  // Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
    loadCalendarData();
  };

  // Date Navigation
  const handlePrevDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const handleGoToday = () => {
    setSelectedDate("2026-10-31");
  };

  // Formatted date string for the pill
  const formattedSelectedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
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

  // Filtered Appointments for List & Timeline Views
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = appt.appointmentCode?.toLowerCase().includes(q);
      const patientMatch = appt.patientId?.fullName?.toLowerCase().includes(q) || appt.patientId?.phone?.includes(q);
      const doctorMatch = appt.doctorId?.userId?.name?.toLowerCase().includes(q);
      const serviceMatch = appt.serviceName?.toLowerCase().includes(q);
      const matchesSearch = !q || codeMatch || patientMatch || doctorMatch || serviceMatch;

      const matchesDoctor = selectedDoctorFilter === "all" || appt.doctorId?._id === selectedDoctorFilter;
      const matchesService = selectedServiceFilter === "all" || appt.serviceName === selectedServiceFilter;
      const matchesStatus = selectedStatusFilter === "all" || appt.status === selectedStatusFilter;

      return matchesSearch && matchesDoctor && matchesService && matchesStatus;
    });
  }, [appointments, searchQuery, selectedDoctorFilter, selectedServiceFilter, selectedStatusFilter]);

  // Distinct Services present in active records
  const distinctServices = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) {
      if (a.serviceName) set.add(a.serviceName);
    }
    return Array.from(set);
  }, [appointments]);

  // Today's appointments panel items (sorted chronologically)
  const todayPanelAppointments = useMemo(() => {
    return [...appointments]
      .filter((a) => a.appointmentDate === selectedDate)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [appointments, selectedDate]);

  // Export CSV Handler
  const handleExport = async () => {
    try {
      showNotification("Generating verified appointment export...");
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (selectedDoctorFilter !== "all") params.append("doctorId", selectedDoctorFilter);
      if (selectedStatusFilter !== "all") params.append("status", selectedStatusFilter);

      const token = localStorage.getItem("trigyna_token") || "";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
      const exportUrl = `${baseUrl}/appointments/export?${params.toString()}`;

      const res = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to export appointments");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trigyna-appointments-${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification("Appointments exported successfully!");
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Export failed", true);
    }
  };

  // Submit Booking Form
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patientId || !bookingForm.doctorId || !bookingForm.appointmentDate || !bookingForm.startTime) {
      showNotification("Please select patient, doctor, date, and slot time", true);
      return;
    }

    try {
      setIsBookingSubmitting(true);
      const res = await api.post<{ appointment?: AppointmentItem }>("/appointments", {
        patientId: bookingForm.patientId,
        doctorId: bookingForm.doctorId,
        serviceName: bookingForm.serviceName,
        appointmentDate: bookingForm.appointmentDate,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        mode: bookingForm.mode,
        notes: bookingForm.notes,
        bookingSource: "portal",
      });

      showNotification(`Appointment booked successfully! (${res.data?.appointment?.appointmentCode || "TG-A"})`);
      setIsBookModalOpen(false);
      setBookingForm({
        patientId: "",
        doctorId: calendarDoctors[0]?._id || "",
        serviceName: "PCOD/PCOS Care",
        appointmentDate: selectedDate,
        startTime: "10:00",
        endTime: "10:30",
        mode: "Online Video Consultation",
        videoProvider: "google_meet",
        notes: "",
      });
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to book appointment", true);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Check In
  const handleCheckIn = async (appointmentId: string) => {
    try {
      await api.post(`/appointments/${appointmentId}/check-in`);
      showNotification("Patient checked in successfully!");
      if (activeDrawerAppt?._id === appointmentId) {
        setActiveDrawerAppt((prev) => (prev ? { ...prev, status: "checked_in" } : null));
      }
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Check-in failed", true);
    }
  };

  // Start Consultation
  const handleStartConsultation = async (appointmentId: string) => {
    try {
      await api.post(`/appointments/${appointmentId}/start-consultation`);
      showNotification("Consultation session started!");
      if (activeDrawerAppt?._id === appointmentId) {
        setActiveDrawerAppt((prev) => (prev ? { ...prev, status: "in_consultation" } : null));
      }
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to start consultation", true);
    }
  };

  // Complete Appointment
  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await api.post(`/appointments/${appointmentId}/complete`);
      showNotification("Appointment marked as completed!");
      if (activeDrawerAppt?._id === appointmentId) {
        setActiveDrawerAppt((prev) => (prev ? { ...prev, status: "completed" } : null));
      }
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to complete appointment", true);
    }
  };

  // Mark No Show
  const handleMarkNoShow = async (appointmentId: string) => {
    try {
      await api.post(`/appointments/${appointmentId}/no-show`);
      showNotification("Appointment recorded as No Show");
      if (activeDrawerAppt?._id === appointmentId) {
        setActiveDrawerAppt((prev) => (prev ? { ...prev, status: "no_show" } : null));
      }
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Action failed", true);
    }
  };

  // Cancel Appointment
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalAppt) return;

    try {
      setIsCancelling(true);
      await api.post(`/appointments/${cancelModalAppt._id}/cancel`, {
        reason: cancelReason || "Cancelled by administrator",
      });
      showNotification("Appointment cancelled");
      setCancelModalAppt(null);
      setCancelReason("");
      if (activeDrawerAppt?._id === cancelModalAppt._id) {
        setActiveDrawerAppt((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      }
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Cancellation failed", true);
    } finally {
      setIsCancelling(false);
    }
  };

  // Reschedule Appointment
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalAppt || !rescheduleDate || !rescheduleTime) {
      showNotification("Please select a new date and time slot", true);
      return;
    }

    try {
      setIsReschedulingSubmitting(true);
      await api.post(`/appointments/${rescheduleModalAppt._id}/reschedule`, {
        appointmentDate: rescheduleDate,
        startTime: rescheduleTime,
      });
      showNotification("Appointment rescheduled successfully!");
      setRescheduleModalAppt(null);
      if (activeDrawerAppt?._id === rescheduleModalAppt._id) {
        setActiveDrawerAppt(null);
      }
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Reschedule failed", true);
    } finally {
      setIsReschedulingSubmitting(false);
    }
  };

  // Update Meeting Link
  const handleSaveMeetingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingModalAppt || !meetingUrl.trim()) {
      showNotification("Please enter a valid meeting URL", true);
      return;
    }

    try {
      setIsSavingMeeting(true);
      await api.put(`/appointments/${meetingModalAppt._id}/meeting-link`, {
        provider: meetingProvider,
        meetingLink: meetingUrl.trim(),
      });
      showNotification("Meeting link attached and patient notified!");
      setMeetingModalAppt(null);
      setMeetingUrl("");
      if (activeDrawerAppt?._id === meetingModalAppt._id) {
        setActiveDrawerAppt((prev) =>
          prev
            ? {
                ...prev,
                meetingProvider,
                meetingLink: meetingUrl.trim(),
                meetingStatus: "ready",
              }
            : null
        );
      }
      loadStats();
      loadCalendarData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to update link", true);
    } finally {
      setIsSavingMeeting(false);
    }
  };

  // Helper for Status Pill Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]">
            <CheckCircle2 className="w-3 h-3 text-[#087A50]" />
            Completed
          </span>
        );
      case "in_consultation":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            In Consultation
          </span>
        );
      case "checked_in":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            Checked In
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Upcoming
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Cancelled
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            <AlertCircle className="w-3 h-3 text-gray-600" />
            No Show
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  // Helper for Calendar card themes
  const getCalendarCardTheme = (service: string, status: string, index: number) => {
    if (status === "in_consultation") {
      return {
        bg: "bg-blue-50/90",
        border: "border-blue-200",
        text: "text-blue-800",
        bar: "bg-blue-600",
      };
    }
    if (status === "completed") {
      return {
        bg: "bg-[#E9F8F0]/90",
        border: "border-[#D1F2E0]",
        text: "text-[#087A50]",
        bar: "bg-[#087A50]",
      };
    }
    if (status === "cancelled") {
      return {
        bg: "bg-red-50/80",
        border: "border-red-200",
        text: "text-red-800",
        bar: "bg-red-500",
      };
    }

    const s = (service || "").toLowerCase();
    if (s.includes("skin") || s.includes("derma")) {
      return {
        bg: "bg-[#EBF5FF]",
        border: "border-[#BFDBFE]",
        text: "text-[#1E40AF]",
        bar: "bg-[#2563EB]",
      };
    }
    if (s.includes("hair") || s.includes("prp") || s.includes("tricho")) {
      return {
        bg: "bg-[#F5F3FF]",
        border: "border-[#DDD6FE]",
        text: "text-[#5B21B6]",
        bar: "bg-[#7C3AED]",
      };
    }
    if (s.includes("diet") || s.includes("nutrition")) {
      return {
        bg: "bg-[#FFFBEB]",
        border: "border-[#FDE68A]",
        text: "text-[#92400E]",
        bar: "bg-[#D97706]",
      };
    }
    if (s.includes("pcod") || s.includes("pcos") || s.includes("women")) {
      return {
        bg: "bg-[#ECFDF5]",
        border: "border-[#A7F3D0]",
        text: "text-[#065F46]",
        bar: "bg-[#059669]",
      };
    }

    // Default palette rotation
    const themes = [
      { bg: "bg-[#EBF5FF]", border: "border-[#BFDBFE]", text: "text-[#1E40AF]", bar: "bg-[#2563EB]" },
      { bg: "bg-[#ECFDF5]", border: "border-[#A7F3D0]", text: "text-[#065F46]", bar: "bg-[#059669]" },
      { bg: "bg-[#FFFBEB]", border: "border-[#FDE68A]", text: "text-[#92400E]", bar: "bg-[#D97706]" },
      { bg: "bg-[#F5F3FF]", border: "border-[#DDD6FE]", text: "text-[#5B21B6]", bar: "bg-[#7C3AED]" },
    ];
    return themes[index % themes.length];
  };

  // Sparkline Components
  const SparklineGreen = () => (
    <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 24" fill="none">
      <path
        d="M2 18 C 12 16, 20 22, 32 10 C 42 0, 52 14, 62 4"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const SparklineBlue = () => (
    <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 24" fill="none">
      <path
        d="M2 14 C 14 20, 22 6, 34 12 C 44 18, 52 4, 62 10"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const SparklineAmber = () => (
    <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 24" fill="none">
      <path
        d="M2 16 C 16 12, 24 20, 36 8 C 46 16, 54 6, 62 12"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const SparklineRed = () => (
    <svg className="w-16 h-7 overflow-visible" viewBox="0 0 64 24" fill="none">
      <path
        d="M2 8 C 14 16, 24 4, 36 14 C 46 8, 54 18, 62 12"
        stroke="#EF4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Time grid slots from 08:00 to 18:00
  const calendarHours = [
    { label: "8:00 AM", hour: 8 },
    { label: "9:00 AM", hour: 9 },
    { label: "10:00 AM", hour: 10 },
    { label: "11:00 AM", hour: 11 },
    { label: "12:00 PM", hour: 12 },
    { label: "1:00 PM", hour: 13 },
    { label: "2:00 PM", hour: 14 },
    { label: "3:00 PM", hour: 15 },
    { label: "4:00 PM", hour: 16 },
    { label: "5:00 PM", hour: 17 },
    { label: "6:00 PM", hour: 18 },
  ];

  // Dynamic SVG Donut Arc Calculations
  const donutData = useMemo(() => {
    const total = stats?.distribution?.total ?? 0;
    const r = 38;
    const circumference = 2 * Math.PI * r; // ~238.761

    const compCount = stats?.distribution?.completed?.count ?? 0;
    const inConCount = stats?.distribution?.inConsultation?.count ?? 0;
    const upcmCount = stats?.distribution?.upcoming?.count ?? 0;
    const cancCount = stats?.distribution?.cancelled?.count ?? 0;

    const compPct = stats?.distribution?.completed?.percentage ?? (total > 0 ? Math.round((compCount / total) * 100) : 0);
    const inConPct = stats?.distribution?.inConsultation?.percentage ?? (total > 0 ? Math.round((inConCount / total) * 100) : 0);
    const upcmPct = stats?.distribution?.upcoming?.percentage ?? (total > 0 ? Math.round((upcmCount / total) * 100) : 0);
    const cancPct = stats?.distribution?.cancelled?.percentage ?? (total > 0 ? Math.round((cancCount / total) * 100) : 0);

    const compDash = (compPct / 100) * circumference;
    const inConDash = (inConPct / 100) * circumference;
    const upcmDash = (upcmPct / 100) * circumference;
    const cancDash = (cancPct / 100) * circumference;

    const compOffset = 0;
    const inConOffset = -compDash;
    const upcmOffset = -(compDash + inConDash);
    const cancOffset = -(compDash + inConDash + upcmDash);

    return {
      total,
      circumference,
      compCount,
      compPct,
      compDash,
      compOffset,
      inConCount,
      inConPct,
      inConDash,
      inConOffset,
      upcmCount,
      upcmPct,
      upcmDash,
      upcmOffset,
      cancCount,
      cancPct,
      cancDash,
      cancOffset,
    };
  }, [stats]);

  return (
    <div className="space-y-6 animate-fade-in font-sans text-[#111827] pb-12">
      {/* =========================================================================
          PHASE 3 — APPOINTMENT PAGE HEADER (Exact Reference Layout)
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-transparent pt-1">
        <div className="flex items-start gap-3.5">
          {/* Green Calendar Icon Badge */}
          <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <Calendar className="w-5 h-5 text-[#087A50]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              Appointments &amp; Schedule
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-normal">
              Manage clinic appointments, consultations and practitioner availability in one place.
            </p>
          </div>
        </div>

        {/* Action Controls: Export + Book Appointment Button */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] bg-white text-xs font-semibold text-[#111827] hover:bg-[#F8FAFC] cursor-pointer transition shadow-2xs active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookingForm({
                patientId: "",
                doctorId: calendarDoctors[0]?._id || "",
                serviceName: distinctServices[0] || "PCOD/PCOS Care",
                appointmentDate: selectedDate,
                startTime: "10:00",
                endTime: "10:30",
                mode: "Online Video Consultation",
                videoProvider: "google_meet",
                notes: "",
              });
              setIsBookModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold cursor-pointer transition shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          PHASE 4 — 5 KPI SUMMARY CARDS (Live MongoDB Aggregations)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* CARD 1: Total Appointments */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <SparklineGreen />
          </div>
          <div className="mt-3">
            <span className="text-xs text-[#64748B] font-medium block">Total Appointments</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-[#111827]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#087A50]" /> : stats?.totalAppointments ?? 0}
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">All registered clinical bookings</span>
          </div>
        </div>

        {/* CARD 2: Today's Appointments */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <SparklineBlue />
          </div>
          <div className="mt-3">
            <span className="text-xs text-[#64748B] font-medium block">Today&apos;s Appointments</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-[#111827]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : stats?.todayAppointments?.count ?? 0}
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              {stats?.todayAppointments?.completed ?? 0} completed • {stats?.todayAppointments?.upcoming ?? 0} upcoming
            </span>
          </div>
        </div>

        {/* CARD 3: In Consultation */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <SparklineAmber />
          </div>
          <div className="mt-3">
            <span className="text-xs text-[#64748B] font-medium block">In Consultation</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-[#111827]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-amber-600" /> : stats?.inConsultation ?? 0}
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">Active encounters in clinic</span>
          </div>
        </div>

        {/* CARD 4: Completed (This Month) */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <SparklineGreen />
          </div>
          <div className="mt-3">
            <span className="text-xs text-[#64748B] font-medium block">Completed (This Month)</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-[#111827]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-[#087A50]" /> : stats?.completedThisMonth ?? 0}
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">Consultations finalized</span>
          </div>
        </div>

        {/* CARD 5: Cancelled / No Show */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
            <SparklineRed />
          </div>
          <div className="mt-3">
            <span className="text-xs text-[#64748B] font-medium block">Cancelled / No Show</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-[#111827]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-red-600" /> : stats?.cancelledOrNoShow ?? 0}
              </span>
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">Cancelled or missed bookings</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PHASE 5 — APPOINTMENT VIEW & FILTER TOOLBAR (Exact Reference Layout)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3 sm:p-4 shadow-xs space-y-3 max-w-full">
        {/* Row 1: View Mode Switcher + Date Navigation */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Left: View Switcher Tabs (Calendar, List View, Timeline, Doctor View) */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E5EAF0] overflow-x-auto scrollbar-none max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setActiveView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === "calendar"
                  ? "bg-[#087A50] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#111827] hover:bg-white/80"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === "list"
                  ? "bg-[#087A50] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#111827] hover:bg-white/80"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === "timeline"
                  ? "bg-[#087A50] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#111827] hover:bg-white/80"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("doctor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === "doctor"
                  ? "bg-[#087A50] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#111827] hover:bg-white/80"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Doctor View</span>
            </button>
          </div>

          {/* Right: Date Navigation (< Date Button > Today) */}
          <div className="flex items-center gap-1.5 justify-start sm:justify-end shrink-0">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#111827] cursor-pointer transition shadow-2xs"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Date Picker Button */}
            <div className="relative">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#111827] cursor-pointer shadow-2xs transition">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                <span className="whitespace-nowrap">{formattedSelectedDate}</span>
                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#111827] cursor-pointer transition shadow-2xs"
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleGoToday}
              className="px-3 py-1.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#E9F8F0] text-xs font-semibold text-[#111827] hover:text-[#087A50] cursor-pointer transition shadow-2xs whitespace-nowrap"
            >
              Today
            </button>
          </div>
        </div>

        {/* Row 2: Dropdown Filters (Doctors, Services, Status, Advanced Filter Icon) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {/* Doctor Filter */}
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-white text-xs text-[#111827] font-medium focus:ring-2 focus:ring-[#087A50] focus:outline-none cursor-pointer max-w-[170px] truncate shadow-2xs"
            >
              <option value="all">All Doctors</option>
              {allDoctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Service Filter */}
            <select
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-white text-xs text-[#111827] font-medium focus:ring-2 focus:ring-[#087A50] focus:outline-none cursor-pointer max-w-[190px] truncate shadow-2xs"
            >
              <option value="all">All Services</option>
              {distinctServices.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-white text-xs text-[#111827] font-medium focus:ring-2 focus:ring-[#087A50] focus:outline-none cursor-pointer max-w-[160px] truncate shadow-2xs"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Upcoming / Scheduled</option>
              <option value="checked_in">Checked In</option>
              <option value="in_consultation">In Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>

            {/* Active filters reset shortcut */}
            {(selectedDoctorFilter !== "all" || selectedServiceFilter !== "all" || selectedStatusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctorFilter("all");
                  setSelectedServiceFilter("all");
                  setSelectedStatusFilter("all");
                }}
                className="text-[11px] font-semibold text-[#087A50] hover:text-[#075B3D] underline underline-offset-2 ml-1 cursor-pointer whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Advanced Filter Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer shadow-2xs text-xs font-semibold ${
                showAdvancedFilters
                  ? "bg-[#E9F8F0] border-[#087A50] text-[#087A50]"
                  : "bg-white border-[#E5EAF0] text-[#64748B] hover:text-[#111827]"
              }`}
              title="Advanced Filters"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {showAdvancedFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#087A50]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Row (Expandable) */}
      {showAdvancedFilters && (
        <div className="bg-[#F8FAFC] border border-[#E5EAF0] rounded-2xl p-3.5 flex flex-wrap items-center gap-3 animate-fade-in text-xs">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, phone, code, or service..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedDoctorFilter("all");
              setSelectedServiceFilter("all");
              setSelectedStatusFilter("all");
            }}
            className="px-3 py-1.5 rounded-xl border border-[#E5EAF0] bg-white text-xs font-semibold text-[#64748B] hover:text-[#111827] cursor-pointer"
          >
            Clear Filters
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-xl bg-[#087A50] text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Apply</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN CONTENT AREA (Grid with Multi-Doctor Calendar or Views + Right Panels)
          ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (Schedule View) — 8 Cols on XL */}
        <div className="xl:col-span-8 space-y-6">
          {/* VIEW 1: MULTI-DOCTOR CALENDAR GRID (Exact Reference Layout) */}
          {activeView === "calendar" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
              <div className="overflow-x-auto scrollbar-none">
                <div className="min-w-[620px]">
                  {/* Doctor Columns Header Row */}
                  <div className="grid grid-cols-12 border-b border-[#E5EAF0] bg-[#F8FAFC]">
                    {/* Empty corner cell above time column */}
                    <div className="col-span-2 p-3 border-r border-[#E5EAF0] flex items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">TIME</span>
                    </div>

                    {/* 4 Doctor Column Headers from live MongoDB roster */}
                    <div className="col-span-10 grid grid-cols-4 divide-x divide-[#E5EAF0]">
                      {calendarDoctors.map((doc) => {
                        const initials = doc.name
                          .replace("Dr. ", "")
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2);
                        return (
                          <div key={doc._id} className="p-3 flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-[#111827] truncate leading-tight">{doc.name}</p>
                              <p className="text-[10px] text-[#64748B] truncate mt-0.5 leading-tight">{doc.specialization}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots Grid (8:00 AM – 6:00 PM) */}
                  <div className="divide-y divide-[#E5EAF0] min-h-[500px]">
                    {calendarHours.map((slot) => {
                      return (
                        <div key={slot.hour} className="grid grid-cols-12 min-h-[56px] hover:bg-[#F8FAFC]/40 transition">
                          {/* Left Time Label */}
                          <div className="col-span-2 p-2.5 border-r border-[#E5EAF0] flex items-start justify-center">
                            <span className="text-[11px] font-mono font-semibold text-[#64748B]">{slot.label}</span>
                          </div>

                          {/* Doctor Schedule Slots for this hour */}
                          <div className="col-span-10 grid grid-cols-4 divide-x divide-[#E5EAF0]">
                            {calendarDoctors.map((doc, docIdx) => {
                              // Find live MongoDB appointments for this doctor starting in this hour block
                              const matchingAppts = appointments.filter((a) => {
                                const isDoctor = a.doctorId?._id === doc._id || a.doctorId?.userId?.name === doc.name;
                                if (!isDoctor) return false;

                                const [appHourStr] = (a.startTime || "").split(":");
                                const appHour = parseInt(appHourStr, 10);
                                return appHour === slot.hour;
                              });

                              return (
                                <div
                                  key={doc._id}
                                  className="p-1.5 relative group hover:bg-[#F8FAFC]/60 transition flex flex-col justify-start gap-1 min-h-[56px]"
                                >
                                  {matchingAppts.map((appt, apptIdx) => {
                                    const theme = getCalendarCardTheme(appt.serviceName, appt.status, docIdx + apptIdx);
                                    return (
                                      <div
                                        key={appt._id}
                                        onClick={() => setActiveDrawerAppt(appt)}
                                        className={`p-2 rounded-xl border ${theme.bg} ${theme.border} cursor-pointer transition shadow-2xs hover:shadow-xs group/card relative`}
                                      >
                                        <div className="flex items-center justify-between min-w-0">
                                          <span className="text-[10px] font-bold text-[#64748B] block truncate">
                                            {formatApptTimeRange(appt.startTime, appt.endTime)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveDrawerAppt(appt);
                                            }}
                                            className="p-0.5 rounded text-[#94A3B8] hover:text-[#111827] cursor-pointer"
                                          >
                                            <MoreVertical className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <p className="text-xs font-bold text-[#111827] truncate mt-0.5">
                                          {appt.patientId?.fullName || "Patient"}
                                        </p>
                                        <p className={`text-[10px] font-medium truncate mt-0.5 ${theme.text}`}>
                                          {appt.serviceName}
                                        </p>
                                      </div>
                                    );
                                  })}

                                  {/* Empty slot hover + Book trigger */}
                                  {matchingAppts.length === 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBookingForm({
                                          patientId: "",
                                          doctorId: doc._id,
                                          serviceName: distinctServices[0] || "PCOD/PCOS Care",
                                          appointmentDate: selectedDate,
                                          startTime: `${String(slot.hour).padStart(2, "0")}:00`,
                                          endTime: `${String(slot.hour).padStart(2, "0")}:30`,
                                          mode: "Online Video Consultation",
                                          videoProvider: "google_meet",
                                          notes: "",
                                        });
                                        setIsBookModalOpen(true);
                                      }}
                                      className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-semibold text-[#087A50] hover:bg-[#E9F8F0]/50 rounded-lg transition"
                                    >
                                      + Book
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: LIST VIEW (STRUCTURED DATA TABLE) */}
          {activeView === "list" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Appointment Directory</h3>
                  <p className="text-xs text-[#64748B]">All consultations matching selected criteria ({filteredAppointments.length} total)</p>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#087A50]" : ""}`} />
                </button>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-[#64748B]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#087A50] mx-auto mb-2" />
                  <span>Loading clinical appointments...</span>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#64748B]">
                  No appointments found for this selection.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E5EAF0] text-[#64748B] font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 whitespace-nowrap">Code</th>
                        <th className="py-3 px-4 whitespace-nowrap">Patient</th>
                        <th className="py-3 px-4 whitespace-nowrap">Doctor</th>
                        <th className="py-3 px-4 whitespace-nowrap">Service</th>
                        <th className="py-3 px-4 whitespace-nowrap">Date &amp; Time</th>
                        <th className="py-3 px-4 whitespace-nowrap">Mode</th>
                        <th className="py-3 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]">
                      {filteredAppointments.map((appt) => (
                        <tr
                          key={appt._id}
                          onClick={() => setActiveDrawerAppt(appt)}
                          className="hover:bg-[#F8FAFC] transition cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#087A50]">{appt.appointmentCode}</td>
                          <td className="py-3 px-4 font-bold text-[#111827]">{appt.patientId?.fullName || "Patient"}</td>
                          <td className="py-3 px-4 text-[#111827]">{appt.doctorId?.userId?.name || "Dr. TriGyna"}</td>
                          <td className="py-3 px-4 text-[#64748B]">{appt.serviceName}</td>
                          <td className="py-3 px-4 font-mono text-[#64748B]">
                            {appt.appointmentDate} • {appt.startTime}
                          </td>
                          <td className="py-3 px-4 text-[#64748B]">{appt.mode}</td>
                          <td className="py-3 px-4">{getStatusBadge(appt.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDrawerAppt(appt);
                              }}
                              className="px-2 py-1 rounded-lg border border-[#E5EAF0] text-[#087A50] hover:bg-[#E9F8F0] font-semibold text-[11px]"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: TIMELINE VIEW */}
          {activeView === "timeline" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#111827]">
                Chronological Schedule Timeline ({formattedSelectedDate})
              </h3>
              {appointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  No appointments scheduled for this date.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#E5EAF0]">
                  {appointments.map((appt) => (
                    <div key={appt._id} className="relative flex items-start gap-4 pl-8 group">
                      <div className="absolute left-2 top-2 w-3.5 h-3.5 rounded-full bg-[#087A50] border-2 border-white shadow-2xs" />
                      <div
                        onClick={() => setActiveDrawerAppt(appt)}
                        className="flex-1 p-3.5 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl hover:border-[#087A50] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#087A50]">
                              {formatApptTimeRange(appt.startTime, appt.endTime)}
                            </span>
                            <span className="text-xs font-bold text-[#111827]">
                              {appt.patientId?.fullName || "Patient"}
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono">
                              ({appt.appointmentCode})
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-1">
                            Service: <span className="font-semibold text-[#111827]">{appt.serviceName}</span> • Practitioner: <span className="font-semibold text-[#111827]">{appt.doctorId?.userId?.name || "Dr. TriGyna"}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(appt.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: DOCTOR VIEW */}
          {activeView === "doctor" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calendarDoctors.map((doc) => {
                const docAppts = appointments.filter(
                  (a) => a.doctorId?._id === doc._id || a.doctorId?.userId?.name === doc.name
                );
                return (
                  <div key={doc._id} className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#111827]">{doc.name}</h4>
                        <p className="text-xs text-[#087A50] font-semibold">{doc.specialization}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]">
                        {docAppts.length} appointments
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {docAppts.length === 0 ? (
                        <p className="text-xs text-[#94A3B8] py-4 text-center">No appointments scheduled today</p>
                      ) : (
                        docAppts.map((a) => (
                          <div
                            key={a._id}
                            onClick={() => setActiveDrawerAppt(a)}
                            className="p-2.5 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl hover:bg-[#E9F8F0]/30 transition cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-[#111827]">{a.patientId?.fullName || "Patient"}</p>
                              <p className="text-[10px] text-[#64748B] font-mono">{a.startTime} • {a.serviceName}</p>
                            </div>
                            {getStatusBadge(a.status)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =======================================================================
            RIGHT COLUMN (Today's Appointments Panel + Statistics Donut) — 4 Cols
            ======================================================================= */}
        <div className="xl:col-span-4 space-y-6">
          {/* CARD A: TODAY'S APPOINTMENTS (Chronological list with avatars and status) */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">Today&apos;s Appointments</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveView("list")}
                className="text-[11px] font-bold text-[#087A50] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Appointment list items */}
            {todayPanelAppointments.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#E9F8F0] text-[#087A50] mx-auto flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#111827]">No Appointments Scheduled</p>
                <p className="text-[11px] text-[#64748B] mt-0.5 max-w-[200px] mx-auto">
                  No appointments booked for {formattedSelectedDate}.
                </p>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Patient</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E5EAF0]">
                {todayPanelAppointments.map((appt) => {
                  const patientName = appt.patientId?.fullName || "Patient";
                  const pInitials = patientName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const docName = appt.doctorId?.userId?.name || "Dr. TriGyna";

                  return (
                    <div
                      key={appt._id}
                      onClick={() => setActiveDrawerAppt(appt)}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-[#F8FAFC] rounded-xl px-1.5 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-[#64748B] shrink-0 w-16">
                          {appt.startTime}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] font-bold text-xs flex items-center justify-center shrink-0">
                          {pInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#111827] truncate leading-tight">
                            {patientName}
                          </p>
                          <p className="text-[10px] text-[#64748B] truncate mt-0.5 leading-tight">
                            {appt.serviceName}
                          </p>
                          <p className="text-[9px] text-[#087A50] truncate font-medium">
                            {docName}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {getStatusBadge(appt.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CARD B: APPOINTMENT STATISTICS (Dynamic Donut Chart from MongoDB) */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">Appointment Statistics</h3>
              </div>
              <button
                type="button"
                onClick={() => onTabChange?.("reports")}
                className="text-[11px] font-bold text-[#087A50] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>View Reports</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Dynamic SVG Donut Chart with Center Label */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="38" stroke="#E5EAF0" strokeWidth="12" fill="none" />

                  {donutData.total > 0 && (
                    <>
                      {/* Completed */}
                      {donutData.compDash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#10B981"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${donutData.compDash} ${donutData.circumference}`}
                          strokeDashoffset={donutData.compOffset}
                        />
                      )}
                      {/* In Consultation */}
                      {donutData.inConDash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#3B82F6"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${donutData.inConDash} ${donutData.circumference}`}
                          strokeDashoffset={donutData.inConOffset}
                        />
                      )}
                      {/* Upcoming */}
                      {donutData.upcmDash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#F59E0B"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${donutData.upcmDash} ${donutData.circumference}`}
                          strokeDashoffset={donutData.upcmOffset}
                        />
                      )}
                      {/* Cancelled */}
                      {donutData.cancDash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          stroke="#EF4444"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${donutData.cancDash} ${donutData.circumference}`}
                          strokeDashoffset={donutData.cancOffset}
                        />
                      )}
                    </>
                  )}
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-[#111827] leading-none">
                    {donutData.total}
                  </span>
                  <span className="text-[10px] text-[#64748B] font-semibold mt-1">Today</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="w-full space-y-2 mt-4 text-xs">
                <div className="flex items-center justify-between text-[#111827]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="font-medium">Completed</span>
                  </div>
                  <span className="font-mono text-[#64748B]">
                    {donutData.compCount} ({donutData.compPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#111827]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                    <span className="font-medium">In Consultation</span>
                  </div>
                  <span className="font-mono text-[#64748B]">
                    {donutData.inConCount} ({donutData.inConPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#111827]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="font-medium">Upcoming</span>
                  </div>
                  <span className="font-mono text-[#64748B]">
                    {donutData.upcmCount} ({donutData.upcmPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#111827]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="font-medium">Cancelled</span>
                  </div>
                  <span className="font-mono text-[#64748B]">
                    {donutData.cancCount} ({donutData.cancPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SLIDE-OVER APPOINTMENT DETAILS DRAWER
          ========================================================================= */}
      {activeDrawerAppt && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveDrawerAppt(null)}
          />
          <div className="relative w-full max-w-md bg-white border-l border-[#E5EAF0] h-full shadow-2xl z-10 flex flex-col justify-between animate-fade-in font-sans">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E5EAF0] flex items-center justify-between shrink-0 bg-[#F8FAFC]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#087A50]">
                    {activeDrawerAppt.appointmentCode}
                  </span>
                  {getStatusBadge(activeDrawerAppt.status)}
                </div>
                <p className="text-xs text-[#64748B] mt-1">Appointment Lifecycle &amp; Clinical Management</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawerAppt(null)}
                className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] hover:bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Patient Card */}
              <div className="p-4 rounded-xl border border-[#E5EAF0] bg-white space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">Patient Details</span>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#111827]">
                    {activeDrawerAppt.patientId?.fullName || "Patient"}
                  </h4>
                  <span className="font-mono text-[11px] text-[#64748B]">
                    {activeDrawerAppt.patientId?.patientCode || "#TR-000"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[#64748B] pt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#087A50]" />
                    <a href={`tel:${activeDrawerAppt.patientId?.phone}`} className="hover:underline text-[#087A50] font-medium">
                      {activeDrawerAppt.patientId?.phone || "No phone"}
                    </a>
                  </span>
                  {activeDrawerAppt.patientId?.gender && (
                    <span>• {activeDrawerAppt.patientId.gender}</span>
                  )}
                  {activeDrawerAppt.patientId?.age && (
                    <span>• {activeDrawerAppt.patientId.age} yrs</span>
                  )}
                </div>
              </div>

              {/* Doctor & Service Card */}
              <div className="p-4 rounded-xl border border-[#E5EAF0] bg-white space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">Consultant &amp; Service</span>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">
                      {activeDrawerAppt.doctorId?.userId?.name || "Dr. TriGyna"}
                    </h4>
                    <p className="text-xs text-[#087A50] font-medium">
                      {Array.isArray(activeDrawerAppt.doctorId?.specialization)
                        ? activeDrawerAppt.doctorId?.specialization.join(", ")
                        : activeDrawerAppt.doctorId?.specialization || "General Physician"}
                    </p>
                  </div>
                  <span className="font-bold text-[#111827] text-xs">
                    ₹{activeDrawerAppt.doctorId?.consultationFee || 700}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E5EAF0] flex items-center justify-between text-[#64748B]">
                  <span>Service: <strong className="text-[#111827]">{activeDrawerAppt.serviceName}</strong></span>
                  <span>Mode: <strong className="text-[#111827]">{activeDrawerAppt.mode}</strong></span>
                </div>
              </div>

              {/* Schedule Card */}
              <div className="p-4 rounded-xl border border-[#E5EAF0] bg-white space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">Schedule Timing</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#087A50]" />
                    <span className="font-semibold text-[#111827]">{activeDrawerAppt.appointmentDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#087A50]" />
                    <span className="font-mono font-semibold text-[#111827]">
                      {formatApptTimeRange(activeDrawerAppt.startTime, activeDrawerAppt.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Video Consultation Link */}
              {activeDrawerAppt.meetingLink ? (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      Video Consultation Ready
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMeetingModalAppt(activeDrawerAppt);
                        setMeetingUrl(activeDrawerAppt.meetingLink || "");
                      }}
                      className="text-[10px] text-blue-700 underline font-semibold cursor-pointer"
                    >
                      Edit Link
                    </button>
                  </div>
                  <p className="text-xs font-mono text-[#111827] truncate">{activeDrawerAppt.meetingLink}</p>
                  <a
                    href={activeDrawerAppt.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs mt-1"
                  >
                    <span>Launch Video Consultation</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-[#E5EAF0] bg-[#F8FAFC] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#111827]">Video Consultation</p>
                    <p className="text-[10px] text-[#64748B]">No Google Meet or Zoom link attached</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingModalAppt(activeDrawerAppt);
                      setMeetingUrl("");
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E5EAF0] bg-white text-[#087A50] font-semibold text-xs hover:bg-[#E9F8F0] cursor-pointer"
                  >
                    + Attach Link
                  </button>
                </div>
              )}

              {/* Clinical Notes */}
              {activeDrawerAppt.notes && (
                <div className="p-4 rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">Clinical Notes</span>
                  <p className="text-xs text-[#111827]">{activeDrawerAppt.notes}</p>
                </div>
              )}

              {/* Cancellation Reason if Cancelled */}
              {activeDrawerAppt.cancellationReason && (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-red-600">Cancellation Reason</span>
                  <p className="text-xs">{activeDrawerAppt.cancellationReason}</p>
                </div>
              )}
            </div>

            {/* Drawer Action Footer */}
            <div className="p-4 border-t border-[#E5EAF0] bg-[#F8FAFC] space-y-2 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                {activeDrawerAppt.status === "scheduled" && (
                  <button
                    type="button"
                    onClick={() => handleCheckIn(activeDrawerAppt._id)}
                    className="w-full py-2 px-3 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Check In</span>
                  </button>
                )}

                {(activeDrawerAppt.status === "checked_in" || activeDrawerAppt.status === "scheduled") && (
                  <button
                    type="button"
                    onClick={() => handleStartConsultation(activeDrawerAppt._id)}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Start Consultation</span>
                  </button>
                )}

                {(activeDrawerAppt.status === "in_consultation" || activeDrawerAppt.status === "checked_in") && (
                  <button
                    type="button"
                    onClick={() => handleCompleteAppointment(activeDrawerAppt._id)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs col-span-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Complete Encounter</span>
                  </button>
                )}

                {activeDrawerAppt.status !== "completed" && activeDrawerAppt.status !== "cancelled" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleModalAppt(activeDrawerAppt);
                        setRescheduleDate(activeDrawerAppt.appointmentDate);
                        setRescheduleTime(activeDrawerAppt.startTime);
                      }}
                      className="py-2 px-3 rounded-xl border border-[#E5EAF0] bg-white text-xs font-semibold text-[#111827] hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelModalAppt(activeDrawerAppt)}
                      className="py-2 px-3 rounded-xl border border-red-200 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              {activeDrawerAppt.status === "scheduled" && (
                <button
                  type="button"
                  onClick={() => handleMarkNoShow(activeDrawerAppt._id)}
                  className="w-full py-1.5 text-center text-[11px] text-[#64748B] hover:text-red-600 cursor-pointer transition font-medium"
                >
                  Mark as No Show
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: BOOK APPOINTMENT MODAL (Connected to MongoDB & Availability API)
          ========================================================================= */}
      <ModalPortal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)}>
        <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col font-sans">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Book New Appointment</h3>
                <p className="text-xs text-neutral-500">Schedule clinical consultation with instant slot reservation</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateAppointment} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Select Patient *</label>
                <select
                  required
                  value={bookingForm.patientId}
                  onChange={(e) => setBookingForm({ ...bookingForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                >
                  <option value="">-- Choose registered patient --</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.patientCode || p.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor & Service */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Consultant *</label>
                  <select
                    required
                    value={bookingForm.doctorId}
                    onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                  >
                    <option value="">-- Choose practitioner --</option>
                    {allDoctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Service *</label>
                  <select
                    value={bookingForm.serviceName}
                    onChange={(e) => setBookingForm({ ...bookingForm, serviceName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                  >
                    {distinctServices.length > 0 ? (
                      distinctServices.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="PCOD/PCOS Care">PCOD/PCOS Care</option>
                        <option value="Skin & Hair">Skin &amp; Hair</option>
                        <option value="Diet Consultation">Diet Consultation</option>
                        <option value="General Consultation">General Consultation</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Date & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.appointmentDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Consultation Mode</label>
                  <div className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/60 text-[#087A50] text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Online Video Consultation
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-bold">
                      Online Only
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Slot Selection */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1.5 flex items-center justify-between">
                  <span>Available Time Slot *</span>
                  {isLoadingSlots && (
                    <span className="text-[10px] text-[#64748B] flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin text-[#087A50]" />
                      Checking schedule...
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                  {availableSlots.length === 0 ? (
                    <div className="col-span-4 py-4 text-center text-[#94A3B8]">
                      Select doctor and date to load verified slots.
                    </div>
                  ) : (
                    availableSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot.startTime}
                        disabled={!slot.isAvailable}
                        onClick={() => {
                          setBookingForm({
                            ...bookingForm,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                          });
                        }}
                        className={`p-2 rounded-lg font-mono text-xs font-bold text-center transition cursor-pointer ${
                          !slot.isAvailable
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                            : bookingForm.startTime === slot.startTime
                            ? "bg-[#087A50] text-white shadow-xs"
                            : "bg-white border border-[#E5EAF0] text-[#111827] hover:border-[#087A50]"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Notes / Symptoms</label>
                <textarea
                  rows={2}
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="Reason for visit or pre-consultation notes..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-3.5 border-t border-neutral-200/80 flex items-center justify-end gap-3 bg-neutral-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBookingSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 transition-colors"
              >
                {isBookingSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* =========================================================================
          MODAL 2: RESCHEDULE MODAL
          ========================================================================= */}
      <ModalPortal isOpen={!!rescheduleModalAppt} onClose={() => setRescheduleModalAppt(null)}>
        {rescheduleModalAppt && (
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col font-sans">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Reschedule Appointment</h3>
                  <p className="text-xs text-neutral-500">Select a new date and verified consultation slot</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5EAF0]">
                  <p className="font-bold text-[#111827]">{rescheduleModalAppt.patientId?.fullName}</p>
                  <p className="text-[11px] text-[#64748B] font-mono">
                    {rescheduleModalAppt.appointmentCode} • Current: {rescheduleModalAppt.appointmentDate} at {rescheduleModalAppt.startTime}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">New Date *</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">New Slot *</label>
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                    {rescheduleSlots.length === 0 ? (
                      <div className="col-span-4 py-4 text-center text-[#94A3B8]">
                        Loading availability for new date...
                      </div>
                    ) : (
                      rescheduleSlots.map((slot) => (
                        <button
                          type="button"
                          key={slot.startTime}
                          disabled={!slot.isAvailable}
                          onClick={() => setRescheduleTime(slot.startTime)}
                          className={`p-2 rounded-lg font-mono text-xs font-bold text-center transition cursor-pointer ${
                            !slot.isAvailable
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                              : rescheduleTime === slot.startTime
                              ? "bg-[#087A50] text-white shadow-xs"
                              : "bg-white border border-[#E5EAF0] text-[#111827] hover:border-[#087A50]"
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-neutral-200/80 flex items-center justify-end gap-3 bg-neutral-50/70 shrink-0">
                <button
                  type="button"
                  onClick={() => setRescheduleModalAppt(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReschedulingSubmitting || !rescheduleTime}
                  className="px-5 py-2.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isReschedulingSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Confirm Reschedule</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalPortal>

      {/* =========================================================================
          MODAL 3: VIDEO MEETING LINK MODAL
          ========================================================================= */}
      <ModalPortal isOpen={!!meetingModalAppt} onClose={() => setMeetingModalAppt(null)}>
        {meetingModalAppt && (
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col font-sans">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold shrink-0">
                  <Video className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Attach Video Meeting Link</h3>
                  <p className="text-xs text-neutral-500">Google Meet or Zoom room link for consultation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMeetingModalAppt(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingLink} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Provider *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMeetingProvider("google_meet")}
                      className={`p-2.5 rounded-xl border text-center font-semibold cursor-pointer transition ${
                        meetingProvider === "google_meet"
                          ? "border-[#087A50] bg-[#E9F8F0] text-[#087A50]"
                          : "border-[#E5EAF0] bg-white text-[#64748B]"
                      }`}
                    >
                      Google Meet
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingProvider("zoom")}
                      className={`p-2.5 rounded-xl border text-center font-semibold cursor-pointer transition ${
                        meetingProvider === "zoom"
                          ? "border-[#087A50] bg-[#E9F8F0] text-[#087A50]"
                          : "border-[#E5EAF0] bg-white text-[#64748B]"
                      }`}
                    >
                      Zoom
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Meeting URL *</label>
                  <input
                    type="url"
                    required
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder={
                      meetingProvider === "google_meet"
                        ? "https://meet.google.com/abc-defg-hij"
                        : "https://zoom.us/j/123456789"
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-[#087A50] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">
                    Must be a secure HTTPS link matching the authorized domain.
                  </p>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-neutral-200/80 flex items-center justify-end gap-3 bg-neutral-50/70 shrink-0">
                <button
                  type="button"
                  onClick={() => setMeetingModalAppt(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMeeting}
                  className="px-5 py-2.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSavingMeeting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save &amp; Notify Patient</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalPortal>

      {/* =========================================================================
          MODAL 4: CANCEL MODAL
          ========================================================================= */}
      <ModalPortal isOpen={!!cancelModalAppt} onClose={() => setCancelModalAppt(null)}>
        {cancelModalAppt && (
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col font-sans">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shrink-0">
                  <XCircle className="w-5 h-5 text-red-100" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-600">Cancel Appointment</h3>
                  <p className="text-xs text-neutral-500">Provide reason for record cancellation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalAppt(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <p className="text-xs text-[#64748B]">
                  Are you sure you want to cancel appointment <strong className="text-[#111827]">{cancelModalAppt.appointmentCode}</strong> for patient <strong className="text-[#111827]">{cancelModalAppt.patientId?.fullName}</strong>?
                </p>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Reason for Cancellation *</label>
                  <textarea
                    required
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Patient emergency, clinical rescheduling, practitioner unavailable..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E5EAF0] bg-white text-[#111827] text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-neutral-200/80 flex items-center justify-end gap-3 bg-neutral-50/70 shrink-0">
                <button
                  type="button"
                  onClick={() => setCancelModalAppt(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Confirm Cancellation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}
