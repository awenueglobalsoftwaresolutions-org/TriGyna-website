"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Download,
  Filter,
  SlidersHorizontal,
  Calendar,
  Clock,
  Phone,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  List,
  LayoutGrid,
  CheckCircle2,
  Heart,
  UserCheck,
  User,
  AlertTriangle,
  X,
  FileText,
  Stethoscope,
  Pill,
  Loader2,
  ExternalLink,
  ShieldCheck,
  CalendarDays,
  Check,
  Sparkles,
  Share2,
  FileDown,
  AlertCircle,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";

// Types
export interface PatientSummaryKPIs {
  totalPatients: number;
  totalPatientsDelta: string;
  activePatients: number;
  activePatientsDelta: string;
  withUpcomingAppt: number;
  withUpcomingApptDelta: string;
  followupDue: number;
  followupDueDelta: string;
  newPatients: number;
  newPatientsDelta: string;
  completedCare: number;
  completedCareDelta: string;
}

export interface PatientQuickFilters {
  all: number;
  active: number;
  upcoming: number;
  followupDue: number;
  previous: number;
}

export interface PatientSummaryData {
  kpis: PatientSummaryKPIs;
  quickFilters: PatientQuickFilters;
}

export interface PatientAppointmentRef {
  date: string;
  formattedDate?: string;
  time?: string;
  serviceName?: string;
  status?: string;
}

export interface PatientListItem {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  service: string;
  lastAppointment: PatientAppointmentRef | null;
  nextAppointment: PatientAppointmentRef | null;
  status: "Active" | "Follow-up Due" | "Completed" | string;
  createdAt?: string;
}

export interface PatientOverviewMetrics {
  totalConsultations: number;
  lastConsultation: any | null;
  nextAppointment: any | null;
  activePrescriptionsCount: number;
  pendingFollowUpsCount: number;
  documentsCount: number;
}

interface DoctorPatientsTabProps {
  onOpenConsultation?: (appointmentId: string, patientId: string) => void;
  initialSelectedPatientId?: string | null;
}

export function DoctorPatientsTab({
  onOpenConsultation,
  initialSelectedPatientId,
}: DoctorPatientsTabProps) {
  // State: Data
  const [summary, setSummary] = useState<PatientSummaryData | null>(null);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [lastConsultDate, setLastConsultDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("last_visit");
  const [viewMode, setViewMode] = useState<"list" | "card">("card");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals & Drawers
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [drawerPatient, setDrawerPatient] = useState<PatientListItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<
    "overview" | "consultations" | "prescriptions" | "allergies" | "documents" | "followups"
  >("overview");
  const [drawerMetrics, setDrawerMetrics] = useState<PatientOverviewMetrics | null>(null);
  const [drawerConsultations, setDrawerConsultations] = useState<any[]>([]);
  const [drawerPrescriptions, setDrawerPrescriptions] = useState<any[]>([]);
  const [drawerDocuments, setDrawerDocuments] = useState<any[]>([]);
  const [drawerFollowups, setDrawerFollowups] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Add Patient Form State
  const [newPtName, setNewPtName] = useState("");
  const [newPtPhone, setNewPtPhone] = useState("");
  const [newPtEmail, setNewPtEmail] = useState("");
  const [newPtAge, setNewPtAge] = useState<number | "">("");
  const [newPtGender, setNewPtGender] = useState("female");
  const [newPtBloodGroup, setNewPtBloodGroup] = useState("");
  const [newPtService, setNewPtService] = useState("PCOD/PCOS");
  const [newPtAllergies, setNewPtAllergies] = useState("");
  const [newPtHistory, setNewPtHistory] = useState("");
  const [addPtLoading, setAddPtLoading] = useState(false);
  const [addPtError, setAddPtError] = useState<string | null>(null);
  const [addPtSuccess, setAddPtSuccess] = useState<string | null>(null);

  // 1. Fetch Summary & KPIs
  const fetchSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const res = await api.get<{ data?: PatientSummaryData } | PatientSummaryData>(
        "/api/v1/doctor/patients/summary"
      );
      const data = (res as any)?.data || res;
      if (data?.kpis) {
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to load patient summary:", err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // 2. Fetch Patients Directory
  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        service: serviceFilter !== "all" ? serviceFilter : "",
        sort: sortBy,
        page: String(currentPage),
        limit: String(pageSize),
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (lastConsultDate) {
        params.append("lastConsultationFrom", lastConsultDate);
      }

      const res = await api.get<{
        data?: {
          patients?: PatientListItem[];
          pagination?: { total: number; pages: number; page: number };
        };
        patients?: PatientListItem[];
        pagination?: { total: number; pages: number; page: number };
      }>(`/api/v1/doctor/patients?${params.toString()}`);

      const body = (res as any)?.data || res;
      const list = body?.patients || (Array.isArray(body) ? body : []);
      const pagination = body?.pagination || {
        total: list.length,
        pages: Math.max(1, Math.ceil(list.length / pageSize)),
        page: currentPage,
      };

      setPatients(list);
      setTotalCount(pagination.total || list.length);
      setTotalPages(pagination.pages || 1);

      // Handle initialSelectedPatientId on first mount
      if (initialSelectedPatientId && !drawerPatient) {
        const found = list.find((p: PatientListItem) => p._id === initialSelectedPatientId);
        if (found) {
          handleOpenPatientDrawer(found);
        }
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    statusFilter,
    serviceFilter,
    sortBy,
    currentPage,
    pageSize,
    search,
    lastConsultDate,
    initialSelectedPatientId,
  ]);

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Real-Time SSE Listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getToken();
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const setupSSE = () => {
      try {
        const baseUrl = getBaseUrl().replace(/\/+$/, "");
        const sseUrl = `${baseUrl}/doctor/realtime/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "heartbeat" || data.type === "connected") return;
            // Refreshes patient list & counters on any relevant event
            if (
              data.type === "patient_created" ||
              data.type === "patient_assigned" ||
              data.type === "appointment_status_changed" ||
              data.type === "consultation_completed"
            ) {
              fetchSummary();
              fetchPatients();
            }
          } catch {
            // ping comment
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(setupSSE, 5000);
        };
      } catch (err) {
        console.warn("SSE connection error", err);
      }
    };

    setupSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchSummary, fetchPatients]);

  // Reset Filters
  const handleResetFilters = () => {
    setStatusFilter("all");
    setServiceFilter("all");
    setLastConsultDate("");
    setSearch("");
    setSortBy("last_visit");
    setCurrentPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    const token = getToken();
    const baseUrl = getBaseUrl().replace(/\/+$/, "");
    const query = new URLSearchParams({
      status: statusFilter,
      service: serviceFilter !== "all" ? serviceFilter : "",
      search: search.trim(),
    });
    window.open(
      `${baseUrl}/doctor/patients/export?${query.toString()}&token=${encodeURIComponent(token || "")}`,
      "_blank"
    );
  };

  // Select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(patients.map((p) => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Clinical Drawer
  const handleOpenPatientDrawer = async (patient: PatientListItem) => {
    setDrawerPatient(patient);
    setDrawerLoading(true);
    setDrawerTab("overview");

    try {
      const [overviewRes, historyRes, docsRes, followupsRes] = await Promise.all([
        api.get<any>(`/api/v1/doctor/patients/${patient._id}/overview`),
        api.get<any>(`/api/v1/doctor/patients/${patient._id}/history`),
        api.get<any>(`/api/v1/doctor/patients/${patient._id}/documents`),
        api.get<any>(`/api/v1/doctor/patients/${patient._id}/follow-ups`),
      ]);

      const ov = (overviewRes as any)?.data || overviewRes;
      const hist = (historyRes as any)?.data || historyRes;
      const docs = (docsRes as any)?.data || docsRes;
      const flw = (followupsRes as any)?.data || followupsRes;

      setDrawerMetrics(ov?.metrics || null);
      setDrawerConsultations(hist?.consultations || []);
      setDrawerPrescriptions(hist?.prescriptions || []);
      setDrawerDocuments(docs?.documents || []);
      setDrawerFollowups(flw?.followUps || []);
    } catch (err) {
      console.error("Failed to load patient clinical drawer data:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Add Patient Submit
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtName.trim() || !newPtPhone.trim()) {
      setAddPtError("Patient name and phone number are required.");
      return;
    }

    try {
      setAddPtLoading(true);
      setAddPtError(null);
      setAddPtSuccess(null);

      const allergiesArray = newPtAllergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const res = await api.post<any>("/api/v1/doctor/patients", {
        fullName: newPtName.trim(),
        phone: newPtPhone.trim(),
        email: newPtEmail.trim() || undefined,
        age: newPtAge ? Number(newPtAge) : undefined,
        gender: newPtGender,
        bloodGroup: newPtBloodGroup || undefined,
        allergies: allergiesArray,
        medicalHistory: newPtHistory.trim() || undefined,
      });

      const pt = (res as any)?.data?.patient || (res as any)?.patient;
      setAddPtSuccess(
        `Patient ${pt?.fullName || newPtName} registered successfully (#${pt?.patientCode || "TG"}).`
      );

      // Reset form
      setNewPtName("");
      setNewPtPhone("");
      setNewPtEmail("");
      setNewPtAge("");
      setNewPtBloodGroup("");
      setNewPtAllergies("");
      setNewPtHistory("");

      // Refresh listings
      fetchSummary();
      fetchPatients();

      setTimeout(() => {
        setAddModalOpen(false);
        setAddPtSuccess(null);
      }, 1200);
    } catch (err: any) {
      console.error("Failed to add patient:", err);
      setAddPtError(err?.message || "Failed to register patient. Please check the inputs.");
    } finally {
      setAddPtLoading(false);
    }
  };

  // Helper for patient initials & avatar color
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarStyles = (name: string) => {
    const charCode = name.charCodeAt(0) || 65;
    const styles = [
      "bg-emerald-100 text-emerald-800",
      "bg-purple-100 text-purple-800",
      "bg-amber-100 text-amber-800",
      "bg-sky-100 text-sky-800",
      "bg-rose-100 text-rose-800",
      "bg-indigo-100 text-indigo-800",
      "bg-teal-100 text-teal-800",
    ];
    return styles[charCode % styles.length];
  };

  // Helper for status badge styling
  const renderStatusBadge = (statusStr: string) => {
    const st = (statusStr || "Active").toLowerCase();
    if (st.includes("follow") || st === "follow-up due") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Follow-up Due
        </span>
      );
    }
    if (st.includes("complete") || st === "completed") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          Completed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Active
      </span>
    );
  };

  // Format date helper: "20 Oct 2026"
  const formatDateStr = (dateVal?: string | null) => {
    if (!dateVal) return "— —";
    try {
      const parts = dateVal.split("-");
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        const d = new Date(year, month, day);
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    } catch {
      // fallback
    }
    return dateVal;
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-300">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#E7F3EC] text-[#064B38] flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-5 h-5 text-[#064B38]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#17251E] tracking-tight">My Patients</h1>
            <p className="text-xs text-[#65746B] mt-0.5">
              Manage your authorized patients, view clinical records, and track ongoing care.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-[#064B38] hover:bg-[#053d2d] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Patient</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-[#17251E] border border-[#E1E9E3] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-[#65746B]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Six Real-Time KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Patients */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] p-4 shadow-xs flex flex-col justify-between hover:border-[#064B38]/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#E7F3EC] text-[#064B38] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xs text-[#65746B] font-medium">Total Patients</p>
            <h3 className="text-2xl font-bold text-[#17251E] mt-0.5">
              {isSummaryLoading ? "..." : summary?.kpis.totalPatients ?? 0}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
              {summary?.kpis.totalPatientsDelta || ""}
            </p>
          </div>
        </div>

        {/* Active Patients */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] p-4 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xs text-[#65746B] font-medium">Active Patients</p>
            <h3 className="text-2xl font-bold text-[#17251E] mt-0.5">
              {isSummaryLoading ? "..." : summary?.kpis.activePatients ?? 0}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
              {summary?.kpis.activePatientsDelta || ""}
            </p>
          </div>
        </div>

        {/* With Upcoming Appt */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] p-4 shadow-xs flex flex-col justify-between hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xs text-[#65746B] font-medium">With Upcoming Appt.</p>
            <h3 className="text-2xl font-bold text-[#17251E] mt-0.5">
              {isSummaryLoading ? "..." : summary?.kpis.withUpcomingAppt ?? 0}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
              {summary?.kpis.withUpcomingApptDelta || ""}
            </p>
          </div>
        </div>

        {/* Follow-up Due */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] p-4 shadow-xs flex flex-col justify-between hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xs text-[#65746B] font-medium">Follow-up Due</p>
            <h3 className="text-2xl font-bold text-[#17251E] mt-0.5">
              {isSummaryLoading ? "..." : summary?.kpis.followupDue ?? 0}
            </h3>
            <p className="text-[11px] text-rose-500 font-medium flex items-center gap-0.5 mt-1">
              {summary?.kpis.followupDueDelta || ""}
            </p>
          </div>
        </div>

        {/* New Patients */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] p-4 shadow-xs flex flex-col justify-between hover:border-rose-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xs text-[#65746B] font-medium">New Patients</p>
            <h3 className="text-2xl font-bold text-[#17251E] mt-0.5">
              {isSummaryLoading
                ? "..."
                : String(summary?.kpis.newPatients ?? 0).padStart(2, "0")}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
              {summary?.kpis.newPatientsDelta || ""}
            </p>
          </div>
        </div>

        {/* Completed Care */}
        <div className="bg-white rounded-2xl border border-[#E1E9E3] p-4 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xs text-[#65746B] font-medium">Completed Care</p>
            <h3 className="text-2xl font-bold text-[#17251E] mt-0.5">
              {isSummaryLoading ? "..." : summary?.kpis.completedCare ?? 0}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
              {summary?.kpis.completedCareDelta || ""}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Filters Panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E1E9E3] p-4 shadow-xs space-y-5">
            {/* Filter Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E1E9E3]">
              <h2 className="text-sm font-bold text-[#17251E] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#064B38]" /> Filters
              </h2>
            </div>

            {/* Patient Status Checkboxes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#17251E] block">Patient Status</span>
              <div className="space-y-1">
                {[
                  {
                    id: "all",
                    label: "All Patients",
                    count: summary?.quickFilters.all ?? 0,
                  },
                  {
                    id: "active",
                    label: "Active",
                    count: summary?.quickFilters.active ?? 0,
                  },
                  {
                    id: "upcoming",
                    label: "Upcoming Appointment",
                    count: summary?.quickFilters.upcoming ?? 0,
                  },
                  {
                    id: "followupDue",
                    label: "Follow-up Due",
                    count: summary?.quickFilters.followupDue ?? 0,
                  },
                  {
                    id: "previous",
                    label: "Previous Patients",
                    count: summary?.quickFilters.previous ?? 0,
                  },
                ].map((item) => {
                  const isChecked = statusFilter === item.id;
                  return (
                    <label
                      key={item.id}
                      onClick={() => {
                        setStatusFilter(item.id);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-[#E7F3EC] text-[#064B38] font-semibold"
                          : "text-[#17251E] hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="patient_status_filter"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 text-[#064B38] focus:ring-[#064B38] accent-[#064B38] rounded-sm cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </div>
                      <span
                        className={`text-[11px] ${
                          isChecked ? "text-[#064B38] font-bold" : "text-[#65746B]"
                        }`}
                      >
                        ({item.count})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Service Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="service-select" className="text-xs font-bold text-[#17251E] block">Service</label>
              <div className="relative">
                <select
                  id="service-select"
                  value={serviceFilter}
                  onChange={(e) => {
                    setServiceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E] focus:outline-hidden focus:border-[#064B38] appearance-none cursor-pointer shadow-xs"
                >
                  <option value="all">All Services</option>
                  <option value="PCOD/PCOS">PCOD/PCOS</option>
                  <option value="Skin & Hair">Skin & Hair</option>
                  <option value="Diet & Nutrition">Diet & Nutrition</option>
                  <option value="Hormonal Health">Hormonal Health</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Thyroid & Metabolic">Thyroid & Metabolic</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Last Consultation Date */}
            <div className="space-y-1.5">
              <label htmlFor="last-consult-date" className="text-xs font-bold text-[#17251E] block">Last Consultation</label>
              <div className="relative">
                <input
                  id="last-consult-date"
                  type="date"
                  value={lastConsultDate}
                  onChange={(e) => {
                    setLastConsultDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Select date"
                  className="w-full pl-3 pr-8 py-2 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E] focus:outline-hidden focus:border-[#064B38] shadow-xs"
                />
                <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Reset Filters Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 border border-[#E1E9E3] hover:bg-gray-50 text-xs font-semibold text-[#17251E] rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#65746B]" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Right Column: Patient List Workspace */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-xs overflow-hidden flex flex-col">
            {/* Top Workspace Bar */}
            <div className="p-4 border-b border-[#E1E9E3] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#064B38]" />
                <h2 className="text-base font-bold text-[#17251E]">
                  Patient List ({totalCount || 124})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient, phone, #ID..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F9FAF9] border border-[#E1E9E3] rounded-lg text-xs text-[#17251E] placeholder:text-gray-400 focus:outline-hidden focus:border-[#064B38]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* View Switcher: List View / Card View */}
                <div className="flex items-center bg-[#F4F6F4] p-0.5 rounded-lg border border-[#E1E9E3]">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === "list"
                        ? "bg-[#064B38] text-white shadow-xs"
                        : "text-[#65746B] hover:text-[#17251E]"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("card")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === "card"
                        ? "bg-[#064B38] text-white shadow-xs"
                        : "text-[#65746B] hover:text-[#17251E]"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Card View</span>
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-2.5 pr-7 py-1.5 bg-white border border-[#E1E9E3] rounded-lg text-xs text-[#17251E] focus:outline-hidden focus:border-[#064B38] appearance-none cursor-pointer"
                  >
                    <option value="last_visit">Sort: Last Visit</option>
                    <option value="name_asc">Sort: Name (A-Z)</option>
                    <option value="newest">Sort: Newest</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List View Table */}
            {viewMode === "list" ? (
              <div className="overflow-x-auto min-h-[360px]">
                {isLoading ? (
                  <div className="py-20 text-center text-xs text-[#65746B]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064B38] mb-2" />
                    Loading authorized patients...
                  </div>
                ) : patients.length === 0 ? (
                  <div className="py-20 text-center text-xs text-[#65746B] space-y-2">
                    <Users className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="font-semibold text-sm text-[#17251E]">No patients match the filters</p>
                    <p className="text-gray-400">
                      Try clearing filters or search terms to see your authorized patients.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 px-3 py-1.5 bg-[#064B38] text-white rounded-lg text-xs font-semibold"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFBF9] text-[#65746B] text-[11px] font-semibold border-b border-[#E1E9E3]">
                        <th className="py-3 px-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              patients.length > 0 && selectedIds.length === patients.length
                            }
                            onChange={handleSelectAll}
                            className="w-3.5 h-3.5 text-[#064B38] accent-[#064B38] rounded-sm cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3 font-semibold">Patient Details</th>
                        <th className="py-3 px-3 font-semibold">Contact</th>
                        <th className="py-3 px-3 font-semibold">Service</th>
                        <th className="py-3 px-3 font-semibold">Last Appointment</th>
                        <th className="py-3 px-3 font-semibold">Next Appointment</th>
                        <th className="py-3 px-3 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E9E3]">
                      {patients.map((pt) => {
                        const isSelected = selectedIds.includes(pt._id);
                        return (
                          <tr
                            key={pt._id}
                            className={`hover:bg-[#F9FAF9] transition-colors ${
                              isSelected ? "bg-[#F3F9F5]" : ""
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3.5 px-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(pt._id)}
                                className="w-3.5 h-3.5 text-[#064B38] accent-[#064B38] rounded-sm cursor-pointer"
                              />
                            </td>

                            {/* Patient Details */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarStyles(
                                    pt.fullName
                                  )}`}
                                >
                                  {getInitials(pt.fullName)}
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPatientDrawer(pt)}
                                    className="font-bold text-[#17251E] hover:text-[#064B38] text-xs text-left"
                                  >
                                    {pt.fullName}
                                  </button>
                                  <p className="text-[11px] text-[#65746B] mt-0.5">
                                    #{pt.patientCode} • {pt.age ? `${pt.age} yrs` : "N/A"} •{" "}
                                    {pt.gender === "female" ? "F" : pt.gender === "male" ? "M" : "O"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Contact */}
                            <td className="py-3.5 px-3 text-[#17251E]">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{pt.phone}</span>
                              </div>
                            </td>

                            {/* Service */}
                            <td className="py-3.5 px-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#EBF7F0] text-[#07543D] border border-[#D5EFE0]">
                                {pt.service || "PCOD/PCOS"}
                              </span>
                            </td>

                            {/* Last Appointment */}
                            <td className="py-3.5 px-3 text-[#17251E]">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{formatDateStr(pt.lastAppointment?.date)}</span>
                              </div>
                            </td>

                            {/* Next Appointment */}
                            <td className="py-3.5 px-3 text-[#17251E]">
                              {pt.nextAppointment ? (
                                <div className="flex items-center gap-1.5 font-medium text-[#17251E]">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{formatDateStr(pt.nextAppointment.date)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 font-normal">— —</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-3">{renderStatusBadge(pt.status)}</td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPatientDrawer(pt)}
                                  className="px-2.5 py-1 rounded-lg border border-[#E1E9E3] hover:border-[#064B38] hover:bg-[#F3F9F5] text-[#17251E] hover:text-[#064B38] font-semibold text-xs flex items-center gap-1 transition-all"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(activeMenuId === pt._id ? null : pt._id);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>

                                  {activeMenuId === pt._id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E1E9E3] rounded-xl shadow-lg z-30 py-1 text-left text-xs text-[#17251E] animate-in fade-in-50"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleOpenPatientDrawer(pt);
                                        }}
                                        className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-[#064B38]" />
                                        <span>Clinical Overview</span>
                                      </button>
                                      {pt.nextAppointment && onOpenConsultation && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            onOpenConsultation("", pt._id);
                                          }}
                                          className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-emerald-700 font-semibold text-left"
                                        >
                                          <Stethoscope className="w-3.5 h-3.5" />
                                          <span>Start Consultation</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleOpenPatientDrawer(pt);
                                          setDrawerTab("prescriptions");
                                        }}
                                        className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                                      >
                                        <Pill className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Prescription Records</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleOpenPatientDrawer(pt);
                                          setDrawerTab("documents");
                                        }}
                                        className="w-full px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                                      >
                                        <Download className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Lab & Documents</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              /* Card View Grid */
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[360px]">
                {isLoading ? (
                  <div className="col-span-full py-20 text-center text-xs text-[#65746B]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064B38] mb-2" />
                    Loading patient cards...
                  </div>
                ) : patients.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-xs text-[#65746B]">
                    No patients match your filter criteria.
                  </div>
                ) : (
                  patients.map((pt) => (
                    <div
                      key={pt._id}
                      onClick={() => handleOpenPatientDrawer(pt)}
                      className="bg-[#FAFBF9] border border-[#E1E9E3] rounded-xl p-4 hover:border-[#064B38]/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarStyles(
                                pt.fullName
                              )}`}
                            >
                              {getInitials(pt.fullName)}
                            </div>
                            <div>
                              <h3 className="font-bold text-xs text-[#17251E] hover:text-[#064B38]">
                                {pt.fullName}
                              </h3>
                              <p className="text-[11px] text-[#65746B]">
                                #{pt.patientCode} • {pt.age ? `${pt.age} yrs` : "N/A"} •{" "}
                                {pt.gender === "female" ? "Female" : pt.gender === "male" ? "Male" : "Patient"}
                                {pt.bloodGroup ? ` • ${pt.bloodGroup}` : ""}
                              </p>
                            </div>
                          </div>
                          {renderStatusBadge(pt.status)}
                        </div>

                        <div className="space-y-1.5 text-xs text-[#17251E] pt-2 border-t border-[#E1E9E3]/70">
                          <div className="flex items-center justify-between">
                            <span className="text-[#65746B]">Contact:</span>
                            <span className="font-medium">{pt.phone}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#65746B]">Service:</span>
                            <span className="font-semibold text-[#07543D]">{pt.service}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#65746B]">Last Visit:</span>
                            <span>{formatDateStr(pt.lastAppointment?.date)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#65746B]">Next Visit:</span>
                            <span className="font-medium text-emerald-700">
                              {formatDateStr(pt.nextAppointment?.date)}
                            </span>
                          </div>
                          {pt.allergies && pt.allergies.length > 0 && (
                            <div className="pt-1 flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Allergies: {pt.allergies.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E1E9E3] flex items-center justify-between text-xs font-semibold text-[#064B38]">
                        <span>View Clinical Profile</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination Footer */}
            <div className="p-3.5 border-t border-[#E1E9E3] bg-[#FAFBF9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#65746B]">
              <div>
                Showing 1 to {patients.length} of {totalCount} patients
              </div>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 justify-center">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E1E9E3] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pNum = i + 1;
                  const isActive = currentPage === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#064B38] text-white"
                          : "border border-[#E1E9E3] bg-white text-[#17251E] hover:bg-gray-50"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {totalPages > 5 && (
                  <>
                    <span className="px-1 text-gray-400">...</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                        currentPage === totalPages
                          ? "bg-[#064B38] text-white"
                          : "border border-[#E1E9E3] bg-white text-[#17251E] hover:bg-gray-50"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E1E9E3] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-[#E1E9E3] rounded-lg text-xs text-[#17251E] focus:outline-hidden focus:border-[#064B38]"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Add Patient Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#E1E9E3] overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 bg-[#064B38] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Add Authorized Patient</h3>
                  <p className="text-xs text-emerald-100/80">
                    Register a new patient under your clinical care
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddPatientSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {addPtError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addPtError}</span>
                </div>
              )}
              {addPtSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{addPtSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-fullname" className="font-semibold text-[#17251E] block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="modal-fullname"
                    type="text"
                    required
                    placeholder="e.g. Pooja Deshmukh"
                    value={newPtName}
                    onChange={(e) => setNewPtName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38]"
                  />
                </div>

                <div>
                  <label htmlFor="modal-phone" className="font-semibold text-[#17251E] block mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="modal-phone"
                    type="tel"
                    required
                    placeholder="10-digit mobile, e.g. 9820010241"
                    value={newPtPhone}
                    onChange={(e) => setNewPtPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="modal-age" className="font-semibold text-[#17251E] block mb-1">Age</label>
                  <input
                    id="modal-age"
                    type="number"
                    min={1}
                    max={120}
                    placeholder="e.g. 35"
                    value={newPtAge}
                    onChange={(e) =>
                      setNewPtAge(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38]"
                  />
                </div>

                <div>
                  <label htmlFor="modal-gender" className="font-semibold text-[#17251E] block mb-1">Gender</label>
                  <select
                    id="modal-gender"
                    value={newPtGender}
                    onChange={(e) => setNewPtGender(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38] bg-white"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-bloodgroup" className="font-semibold text-[#17251E] block mb-1">Blood Group</label>
                  <select
                    id="modal-bloodgroup"
                    value={newPtBloodGroup}
                    onChange={(e) => setNewPtBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38] bg-white"
                  >
                    <option value="">Select (optional)</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="modal-email" className="font-semibold text-[#17251E] block mb-1">Email Address</label>
                <input
                  id="modal-email"
                  type="email"
                  placeholder="patient@example.com (optional)"
                  value={newPtEmail}
                  onChange={(e) => setNewPtEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38]"
                />
              </div>

              <div>
                <label htmlFor="modal-allergies" className="font-semibold text-[#17251E] block mb-1">
                  Drug Allergies (comma-separated)
                </label>
                <input
                  id="modal-allergies"
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa Drugs, Aspirin (Leave blank if NKDA)"
                  value={newPtAllergies}
                  onChange={(e) => setNewPtAllergies(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38]"
                />
              </div>

              <div>
                <label htmlFor="modal-notes" className="font-semibold text-[#17251E] block mb-1">
                  Medical History & Clinical Background
                </label>
                <textarea
                  id="modal-notes"
                  rows={3}
                  placeholder="e.g. PCOS since 2022, irregular cycles, fasting insulin monitored."
                  value={newPtHistory}
                  onChange={(e) => setNewPtHistory(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E1E9E3] rounded-xl focus:outline-hidden focus:border-[#064B38] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E1E9E3]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E1E9E3] text-[#17251E] rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPtLoading}
                  className="px-5 py-2 bg-[#064B38] hover:bg-[#053d2d] text-white rounded-xl font-semibold flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {addPtLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Patient</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Patient Clinical Profile Drawer / Modal */}
      {drawerPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-[#E1E9E3] overflow-hidden flex flex-col max-h-[92vh]">
            {/* Drawer Top Header */}
            <div className="p-5 bg-[#064B38] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base bg-white/10 text-emerald-300`}
                >
                  {getInitials(drawerPatient.fullName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{drawerPatient.fullName}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-white/15 text-[11px] font-mono">
                      #{drawerPatient.patientCode}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/80 mt-0.5">
                    {drawerPatient.age ? `${drawerPatient.age} yrs` : "Age N/A"} •{" "}
                    {drawerPatient.gender === "female"
                      ? "Female"
                      : drawerPatient.gender === "male"
                      ? "Male"
                      : "Other"}{" "}
                    • Blood Group: {drawerPatient.bloodGroup || "B+"} • Phone:{" "}
                    {drawerPatient.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerPatient(null)}
                className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clinical Safety Alert Banner (if drug allergies present) */}
            {drawerPatient.allergies && drawerPatient.allergies.length > 0 && (
              <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  CRITICAL CLINICAL SAFETY: Known Drug Allergies:{" "}
                  <span className="font-bold underline">
                    {drawerPatient.allergies.join(", ")}
                  </span>
                </span>
              </div>
            )}

            {/* Drawer Tabs */}
            <div className="px-5 border-b border-[#E1E9E3] bg-[#FAFBF9] flex items-center gap-2 overflow-x-auto text-xs font-semibold">
              {[
                { id: "overview", label: "Overview", icon: FileText },
                { id: "consultations", label: "Consultations", icon: Stethoscope },
                { id: "prescriptions", label: "Prescriptions", icon: Pill },
                { id: "allergies", label: "Allergies & Meds", icon: AlertTriangle },
                { id: "documents", label: "Lab & Documents", icon: Download },
                { id: "followups", label: "Follow-ups", icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      isActive
                        ? "border-[#064B38] text-[#064B38]"
                        : "border-transparent text-[#65746B] hover:text-[#17251E]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#17251E] flex-1">
              {drawerLoading ? (
                <div className="py-20 text-center text-xs text-[#65746B]">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064B38] mb-2" />
                  Loading patient clinical records...
                </div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {drawerTab === "overview" && (
                    <div className="space-y-5">
                      {/* KPI Metric Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                          <p className="text-[11px] text-[#65746B]">Consultations</p>
                          <p className="text-lg font-bold text-[#17251E] mt-0.5">
                            {drawerMetrics?.totalConsultations ?? drawerConsultations.length}
                          </p>
                        </div>
                        <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                          <p className="text-[11px] text-[#65746B]">Active Rx</p>
                          <p className="text-lg font-bold text-purple-700 mt-0.5">
                            {drawerMetrics?.activePrescriptionsCount ??
                              drawerPrescriptions.length}
                          </p>
                        </div>
                        <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                          <p className="text-[11px] text-[#65746B]">Documents</p>
                          <p className="text-lg font-bold text-blue-700 mt-0.5">
                            {drawerMetrics?.documentsCount ?? drawerDocuments.length}
                          </p>
                        </div>
                        <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center">
                          <p className="text-[11px] text-[#65746B]">Follow-ups</p>
                          <p className="text-lg font-bold text-amber-700 mt-0.5">
                            {drawerMetrics?.pendingFollowUpsCount ?? drawerFollowups.length}
                          </p>
                        </div>
                        <div className="p-3 bg-[#F9FAF9] border border-[#E1E9E3] rounded-xl text-center col-span-2 sm:col-span-1 md:col-span-2">
                          <p className="text-[11px] text-[#65746B]">Service Assigned</p>
                          <p className="text-xs font-bold text-[#064B38] mt-1">
                            {drawerPatient.service || "PCOD/PCOS"}
                          </p>
                        </div>
                      </div>

                      {/* Clinical Background & Emergency */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-2">
                          <h4 className="font-bold text-xs text-[#064B38] flex items-center gap-1.5">
                            <FileText className="w-4 h-4" /> Medical Background & History
                          </h4>
                          <p className="text-[#65746B] leading-relaxed">
                            {drawerPatient.medicalHistory ||
                              "No chronic medical conditions documented for this patient record."}
                          </p>
                        </div>

                        <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-2">
                          <h4 className="font-bold text-xs text-[#064B38] flex items-center gap-1.5">
                            <Phone className="w-4 h-4" /> Emergency Contact & Support
                          </h4>
                          <div className="space-y-1 text-[#65746B]">
                            <p>
                              <span className="font-semibold text-[#17251E]">Contact: </span>
                              {drawerPatient.emergencyContact?.name || "Direct / Next of Kin"}
                            </p>
                            <p>
                              <span className="font-semibold text-[#17251E]">Phone: </span>
                              {drawerPatient.emergencyContact?.phone || drawerPatient.phone}
                            </p>
                            <p>
                              <span className="font-semibold text-[#17251E]">Relationship: </span>
                              {drawerPatient.emergencyContact?.relationship || "Family"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Next Appointment & Quick Actions */}
                      <div className="p-4 bg-[#F5F8F6] border border-[#D5EFE0] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-semibold text-[#064B38] uppercase tracking-wide">
                            Next Scheduled Appointment
                          </span>
                          <p className="text-sm font-bold text-[#17251E] mt-0.5">
                            {drawerPatient.nextAppointment
                              ? `${formatDateStr(drawerPatient.nextAppointment.date)} ${
                                  drawerPatient.nextAppointment.time
                                    ? `at ${drawerPatient.nextAppointment.time}`
                                    : ""
                                }`
                              : "No upcoming appointment booked"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {drawerPatient.nextAppointment && onOpenConsultation && (
                            <button
                              type="button"
                              onClick={() => {
                                onOpenConsultation("", drawerPatient._id);
                                setDrawerPatient(null);
                              }}
                              className="px-3.5 py-1.5 bg-[#064B38] text-white rounded-xl font-semibold hover:bg-[#053d2d] flex items-center gap-1.5 shadow-xs"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Start Visit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDrawerTab("prescriptions")}
                            className="px-3.5 py-1.5 bg-white border border-[#E1E9E3] text-[#17251E] rounded-xl font-semibold hover:bg-gray-50 flex items-center gap-1.5"
                          >
                            <Pill className="w-3.5 h-3.5 text-purple-600" />
                            <span>View Prescriptions</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CONSULTATIONS */}
                  {drawerTab === "consultations" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-[#17251E]">
                          Consultation History ({drawerConsultations.length})
                        </h4>
                      </div>

                      {drawerConsultations.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                          No consultation records documented yet.
                        </div>
                      ) : (
                        drawerConsultations.map((c) => (
                          <div
                            key={c._id}
                            className="p-4 bg-white border border-[#E1E9E3] rounded-2xl shadow-xs space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#064B38]">
                                {c.diagnosis || "General Clinical Evaluation"}
                              </span>
                              <span className="text-gray-400 text-[11px]">
                                {formatDateStr(c.createdAt)}
                              </span>
                            </div>
                            {c.symptoms && c.symptoms.length > 0 && (
                              <p className="text-[11px] text-[#65746B]">
                                <span className="font-semibold text-[#17251E]">Symptoms: </span>
                                {c.symptoms.join(", ")}
                              </p>
                            )}
                            <p className="text-xs text-[#65746B] leading-relaxed">
                              {c.treatmentPlan || c.clinicalNotes || "Notes logged during session."}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: PRESCRIPTIONS */}
                  {drawerTab === "prescriptions" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-[#17251E]">
                          Prescription Records ({drawerPrescriptions.length})
                        </h4>
                      </div>

                      {drawerPrescriptions.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                          No prescriptions written yet.
                        </div>
                      ) : (
                        drawerPrescriptions.map((rx) => (
                          <div
                            key={rx._id}
                            className="p-4 bg-white border border-[#E1E9E3] rounded-2xl shadow-xs space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#17251E]">
                                Prescribed on {formatDateStr(rx.createdAt)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const token = getToken();
                                  const baseUrl = getBaseUrl().replace(/\/+$/, "");
                                  window.open(
                                    `${baseUrl}/doctor/prescriptions/${rx._id}/pdf?token=${encodeURIComponent(
                                      token || ""
                                    )}`,
                                    "_blank"
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#064B38] font-semibold text-xs rounded-lg border border-emerald-200 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PDF</span>
                              </button>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-[#E1E9E3]">
                              {(rx.medications || []).map((m: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#FAFBF9]"
                                >
                                  <span className="font-bold text-[#17251E]">
                                    • {m.name} {m.dosage ? `(${m.dosage})` : ""}
                                  </span>
                                  <span className="text-[#65746B]">
                                    {m.frequency} — {m.duration}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: ALLERGIES & MEDS */}
                  {drawerTab === "allergies" && (
                    <div className="space-y-4">
                      {/* Allergies Block */}
                      <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-3">
                        <h4 className="font-bold text-xs text-[#17251E] flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-500" /> Documented Drug
                          Allergies
                        </h4>
                        {drawerPatient.allergies && drawerPatient.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {drawerPatient.allergies.map((a, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-emerald-700 font-medium">
                            ✓ No Known Drug Allergies (NKDA)
                          </p>
                        )}
                      </div>

                      {/* Active Medications */}
                      <div className="p-4 bg-white border border-[#E1E9E3] rounded-2xl space-y-3">
                        <h4 className="font-bold text-xs text-[#17251E] flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-purple-600" /> Active Medication Regimens
                        </h4>
                        {drawerPrescriptions.length > 0 ? (
                          <div className="space-y-2">
                            {drawerPrescriptions.flatMap((rx) =>
                              (rx.medications || []).map((m: any, idx: number) => (
                                <div
                                  key={`${rx._id}-${idx}`}
                                  className="p-2.5 bg-[#FAFBF9] border border-[#E1E9E3] rounded-xl flex items-center justify-between text-xs"
                                >
                                  <span className="font-bold text-[#17251E]">
                                    {m.name} ({m.dosage || "Std"})
                                  </span>
                                  <span className="text-[#65746B]">
                                    {m.frequency} • {m.duration}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-400">No active medication records found.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: LAB & DOCUMENTS */}
                  {drawerTab === "documents" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-[#17251E]">
                          Medical Documents & Lab Scans ({drawerDocuments.length})
                        </h4>
                      </div>

                      {drawerDocuments.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                          No diagnostic documents or lab reports on file.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {drawerDocuments.map((doc) => (
                            <div
                              key={doc._id}
                              className="p-3.5 bg-white border border-[#E1E9E3] rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-[#064B38]" />
                                <div>
                                  <p className="font-bold text-xs text-[#17251E]">{doc.title}</p>
                                  <p className="text-[11px] text-gray-400">
                                    {doc.type || "Document"} • {formatDateStr(doc.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {doc.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg border border-[#E1E9E3] hover:bg-gray-50 text-[#064B38]"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: FOLLOW-UPS */}
                  {drawerTab === "followups" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-[#17251E]">
                          Scheduled Follow-ups ({drawerFollowups.length})
                        </h4>
                      </div>

                      {drawerFollowups.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                          No pending follow-ups scheduled for this patient.
                        </div>
                      ) : (
                        drawerFollowups.map((f) => (
                          <div
                            key={f._id}
                            className="p-4 bg-white border border-[#E1E9E3] rounded-2xl shadow-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <div>
                                <p className="font-bold text-xs text-[#17251E]">
                                  Due on {formatDateStr(f.dueDate || f.followUpDate)}
                                </p>
                                <p className="text-[11px] text-[#65746B]">
                                  {f.notes || f.reason || "Routine clinical review"}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                f.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {f.status || "Pending"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Bottom Bar */}
            <div className="p-4 bg-[#FAFBF9] border-t border-[#E1E9E3] flex items-center justify-between">
              <span className="text-[11px] text-[#65746B]">
                Patient Record ID: #{drawerPatient.patientCode}
              </span>
              <button
                type="button"
                onClick={() => setDrawerPatient(null)}
                className="px-5 py-2 bg-[#064B38] text-white rounded-xl text-xs font-semibold hover:bg-[#053d2d] transition-colors"
              >
                Close Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
