"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Clock,
  Search,
  Calendar,
  User,
  Plus,
  CheckCircle2,
  Phone,
  AlertTriangle,
  Loader2,
  X,
  Settings,
  Eye,
  Check,
  FileText,
  Edit2,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  SlidersHorizontal,
  Video,
  Send,
  MessageSquare,
  Mail,
  Bell,
  ArrowUpRight,
  Hourglass,
  CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api/client";

export interface DoctorFollowUpsTabProps {
  onOpenConsultation?: (appointmentId: string, patientId: string) => void;
  onOpenPatientProfile?: (patientId: string) => void;
}

interface FollowUpItem {
  _id: string;
  followUpCode: string;
  patientId: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone?: string;
    email?: string;
    age?: number;
    gender?: string;
  };
  reason: string;
  serviceName?: string;
  description?: string;
  type: string;
  status: "pending" | "scheduled" | "completed" | "overdue" | "cancelled";
  dueDate: string;
  scheduledTime?: string;
  mode?: string;
  priority?: "Routine" | "Medium" | "High" | "Urgent";
  planInstructions?: string;
  completionNotes?: string;
  outcome?: string;
  recoveryStatus?: string;
  completedAt?: string;
  completedBy?: any;
  rescheduleHistory?: any[];
  reminders?: any[];
  reminderPreferences?: {
    whatsappEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
  };
}

interface FollowUpStats {
  totalFollowUps: number;
  totalDelta: string;
  totalSubtitle: string;
  pending: number;
  pendingDelta: string;
  pendingSubtitle: string;
  completed: number;
  completedDelta: string;
  completedSubtitle: string;
  scheduled: number;
  scheduledSubtitle: string;
  overdue: number;
  tabCounts: {
    all: number;
    pending: number;
    scheduled: number;
    completed: number;
    overdue: number;
  };
}

export function DoctorFollowUpsTab({
  onOpenConsultation,
  onOpenPatientProfile,
}: DoctorFollowUpsTabProps) {
  // 1. Data States
  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [stats, setStats] = useState<FollowUpStats>({
    totalFollowUps: 42,
    totalDelta: "↑ +12%",
    totalSubtitle: "All follow-up cases",
    pending: 18,
    pendingDelta: "↑ +6%",
    pendingSubtitle: "Need your action",
    completed: 20,
    completedDelta: "↑ +25%",
    completedSubtitle: "Successfully closed",
    scheduled: 4,
    scheduledSubtitle: "Next 7 days",
    overdue: 3,
    tabCounts: { all: 42, pending: 18, scheduled: 4, completed: 20, overdue: 3 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(42);
  const [totalPages, setTotalPages] = useState(5);

  // 2. Filter & Navigation States
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "scheduled" | "completed" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [statusDropdown, setStatusDropdown] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 3. Dropdown Menu Toggle States
  const [conditionMenuOpen, setConditionMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [dateRangeMenuOpen, setDateRangeMenuOpen] = useState(false);

  // 4. Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<FollowUpItem | null>(null);
  const [completeItem, setCompleteItem] = useState<FollowUpItem | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<FollowUpItem | null>(null);

  // 5. Add Follow-up Form State
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [newReason, setNewReason] = useState("PCOS Management");
  const [newType, setNewType] = useState("Review");
  const [newDueDate, setNewDueDate] = useState("2026-11-13");
  const [newTime, setNewTime] = useState("11:00 AM");
  const [newPriority, setNewPriority] = useState<"Routine" | "Medium" | "High" | "Urgent">("Routine");
  const [newDescription, setNewDescription] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState(true);
  const [newEmail, setNewEmail] = useState(true);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // 6. Complete Follow-up Form State
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionOutcome, setCompletionOutcome] = useState("Symptoms improved significantly");
  const [completionRecovery, setCompletionRecovery] = useState("Improved");
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  // 7. Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("11:00 AM");
  const [rescheduleReason, setRescheduleReason] = useState("Patient requested postponement");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // 8. Settings Form State
  const [settingsData, setSettingsData] = useState<any>({
    defaultInterval: "Day 14",
    defaultType: "Review",
    autoRemindWhatsApp: true,
    autoRemindEmail: true,
    autoRemindPush: true,
    leadTimeDays: 2,
    allowDirectBooking: true,
    preferredConsultationMode: "Online Video Consultation",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch KPI statistics
  const fetchStats = async () => {
    try {
      const res = await api.get<any>("/api/v1/doctor/follow-ups/stats");
      const d = (res as any)?.data || res;
      if (d && typeof d.totalFollowUps === "number") {
        setStats(d);
      }
    } catch (err) {
      console.error("Failed to load follow-up stats:", err);
    }
  };

  // Fetch Follow-ups list from backend
  const fetchFollowups = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "all") params.append("status", activeTab);
      else if (statusDropdown !== "all") params.append("status", statusDropdown);
      if (conditionFilter !== "all") params.append("condition", conditionFilter);
      if (dateRangeFilter !== "all") params.append("dateRange", dateRangeFilter);
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await api.get<any>(`/api/v1/doctor/follow-ups?${params.toString()}`);
      const data = (res as any)?.data || res;
      const list = data?.followUps || (Array.isArray(data) ? data : []);
      setFollowups(list);
      setTotalCount(data?.total ?? list.length);
      setTotalPages(data?.totalPages ?? Math.max(1, Math.ceil((data?.total ?? list.length) / limit)));
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial stats & records
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [activeTab, statusDropdown, conditionFilter, dateRangeFilter, debouncedSearch, page, limit]);

  // Load Doctor Settings
  const loadSettings = async () => {
    try {
      const res = await api.get<any>("/api/v1/doctor/follow-ups/settings");
      const d = (res as any)?.data?.settings || (res as any)?.settings || res;
      if (d) setSettingsData(d);
    } catch (err) {
      console.error("Failed to load follow-up settings:", err);
    }
  };

  // Search patients for Add Follow-up autocomplete
  useEffect(() => {
    if (!addModalOpen) return;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingPatients(true);
        const res = await api.get<any>(`/api/v1/doctor/follow-ups/patients/search?q=${encodeURIComponent(patientQuery)}`);
        const list = (res as any)?.data?.patients || (res as any)?.patients || [];
        setPatientResults(list);
      } catch (err) {
        console.error("Failed to search patients:", err);
      } finally {
        setIsSearchingPatients(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [patientQuery, addModalOpen]);

  // Handlers
  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setConditionFilter("all");
    setStatusDropdown("all");
    setDateRangeFilter("all");
    setActiveTab("all");
    setPage(1);
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient?._id) {
      alert("Please select a patient from the list.");
      return;
    }
    if (!newDueDate) {
      alert("Please select a valid follow-up date.");
      return;
    }

    try {
      setIsSubmittingNew(true);
      await api.post("/api/v1/doctor/follow-ups", {
        patientId: selectedPatient._id,
        reason: newReason,
        serviceName: newReason,
        type: newType,
        dueDate: newDueDate,
        scheduledTime: newTime,
        priority: newPriority,
        description: newDescription,
        reminderPreferences: {
          whatsappEnabled: newWhatsapp,
          emailEnabled: newEmail,
          smsEnabled: false,
          pushEnabled: true,
        },
      });

      setAddModalOpen(false);
      setSelectedPatient(null);
      setPatientQuery("");
      setNewDescription("");
      fetchStats();
      fetchFollowups();
    } catch (err: any) {
      console.error("Failed to create follow-up:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to create follow-up recommendation.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeItem) return;

    try {
      setIsSubmittingComplete(true);
      await api.post(`/api/v1/doctor/follow-ups/${completeItem._id}/complete`, {
        completionNotes,
        outcome: completionOutcome,
        recoveryStatus: completionRecovery,
      });

      setCompleteItem(null);
      setCompletionNotes("");
      fetchStats();
      fetchFollowups();
    } catch (err: any) {
      console.error("Failed to complete follow-up:", err);
      alert(err?.message || "Failed to mark follow-up completed.");
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleItem || !rescheduleDate) return;

    try {
      setIsSubmittingReschedule(true);
      await api.post(`/api/v1/doctor/follow-ups/${rescheduleItem._id}/reschedule`, {
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        reason: rescheduleReason,
      });

      setRescheduleItem(null);
      fetchStats();
      fetchFollowups();
    } catch (err: any) {
      console.error("Failed to reschedule follow-up:", err);
      alert(err?.message || "Failed to reschedule follow-up.");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await api.patch("/api/v1/doctor/follow-ups/settings", settingsData);
      setSettingsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save follow-up settings:", err);
      alert(err?.message || "Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper formatting
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return { formatted: "--", relative: "", isOverdue: false };
    try {
      const d = new Date(dateStr);
      const formatted = d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Compute relative day
      const now = new Date("2026-11-13T00:00:00Z"); // Clinic reference date
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.round((target.getTime() - current.getTime()) / (24 * 60 * 60 * 1000));

      let relative = "";
      let isOverdue = false;

      if (diffDays === 0) relative = "Today";
      else if (diffDays === 1) relative = "Tomorrow";
      else if (diffDays === -1) {
        relative = "1 day overdue";
        isOverdue = true;
      } else if (diffDays < 0) {
        relative = `${Math.abs(diffDays)} days overdue`;
        isOverdue = true;
      } else {
        relative = `In ${diffDays} days`;
      }

      return { formatted, relative, isOverdue };
    } catch {
      return { formatted: dateStr, relative: "", isOverdue: false };
    }
  };

  const getAvatarStyle = (name: string) => {
    const charCode = (name || "Patient").charCodeAt(0) % 5;
    switch (charCode) {
      case 0:
        return { bg: "bg-[#DCFCE7]", text: "text-[#15803D]" }; // Mint green
      case 1:
        return { bg: "bg-[#FFE4E6]", text: "text-[#BE123C]" }; // Rose
      case 2:
        return { bg: "bg-[#F3E8FF]", text: "text-[#7E22CE]" }; // Purple
      case 3:
        return { bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]" }; // Blue
      default:
        return { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" }; // Amber
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "PT";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "Test Review":
        return "bg-[#E0F2FE] text-[#0369A1] border-sky-200";
      case "Progress":
        return "bg-[#FFEDD5] text-[#C2410C] border-orange-200";
      case "Medication Review":
        return "bg-[#DCFCE7] text-[#15803D] border-emerald-200";
      default:
        return "bg-[#F3E8FF] text-[#7E22CE] border-purple-200"; // Review
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (status === "completed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-emerald-200">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Completed</span>
        </span>
      );
    }
    if (status === "overdue" || isOverdue) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFE4E6] text-[#BE123C] border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Overdue</span>
        </span>
      );
    }
    if (status === "scheduled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#1D4ED8] border border-blue-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>Scheduled</span>
        </span>
      );
    }
    // Pending
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-amber-200">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ======================================================== */}
      {/* 1. PAGE HEADER                                           */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#DCE7E1] shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5EC] border border-[#DCE7E1]/60 flex items-center justify-center text-[#065F46] shrink-0 shadow-2xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#14231D] tracking-tight">
              Follow-ups & Continuity of Care
            </h1>
            <p className="text-xs text-[#718096] mt-0.5">
              Track recommended review dates, patient progress, and post-consultation monitoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#064E3B] hover:bg-[#053d2d] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Follow-up</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadSettings();
              setSettingsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white hover:bg-[#F4F8F6] text-[#14231D] border border-[#DCE7E1] text-xs font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#718096]" />
            <span>Follow-up Settings</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FOUR KPI CARDS                                        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Follow-ups */}
        <div className="bg-white p-5 rounded-2xl border border-[#DCE7E1] shadow-2xs hover:border-[#065F46]/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EC] flex items-center justify-center text-[#15803D]">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#16A34A] flex items-center gap-0.5">
              {stats.totalDelta}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-[#718096]">Total Follow-ups</p>
            <p className="text-3xl font-extrabold text-[#14231D] tracking-tight mt-0.5">
              {stats.totalFollowUps}
            </p>
            <p className="text-[11px] text-[#718096] mt-1">{stats.totalSubtitle}</p>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="bg-white p-5 rounded-2xl border border-[#DCE7E1] shadow-2xs hover:border-amber-400/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#B45309]">
              <Hourglass className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#16A34A] flex items-center gap-0.5">
              {stats.pendingDelta}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-[#718096]">Pending</p>
            <p className="text-3xl font-extrabold text-[#14231D] tracking-tight mt-0.5">
              {stats.pending}
            </p>
            <p className="text-[11px] text-[#718096] mt-1">{stats.pendingSubtitle}</p>
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="bg-white p-5 rounded-2xl border border-[#DCE7E1] shadow-2xs hover:border-emerald-400/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#15803D]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#16A34A] flex items-center gap-0.5">
              {stats.completedDelta}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-[#718096]">Completed</p>
            <p className="text-3xl font-extrabold text-[#14231D] tracking-tight mt-0.5">
              {stats.completed}
            </p>
            <p className="text-[11px] text-[#718096] mt-1">{stats.completedSubtitle}</p>
          </div>
        </div>

        {/* Card 4: Scheduled (Upcoming) */}
        <div className="bg-white p-5 rounded-2xl border border-[#DCE7E1] shadow-2xs hover:border-blue-400/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center text-[#1D4ED8]">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-[#718096]">Scheduled (Upcoming)</p>
            <p className="text-3xl font-extrabold text-[#14231D] tracking-tight mt-0.5">
              {stats.scheduled}
            </p>
            <p className="text-[11px] text-[#718096] mt-1">{stats.scheduledSubtitle}</p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FIVE STATUS NAVIGATION TABS                           */}
      {/* ======================================================== */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#DCE7E1] shadow-2xs flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "all"
              ? "bg-[#064E3B] text-white shadow-xs"
              : "text-[#14231D] hover:bg-gray-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>All Follow-ups ({stats.tabCounts?.all ?? stats.totalFollowUps})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("pending");
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "pending"
              ? "bg-[#064E3B] text-white shadow-xs"
              : "text-[#14231D] hover:bg-gray-100"
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Pending ({stats.tabCounts?.pending ?? stats.pending})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("scheduled");
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "scheduled"
              ? "bg-[#064E3B] text-white shadow-xs"
              : "text-[#14231D] hover:bg-gray-100"
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>Scheduled ({stats.tabCounts?.scheduled ?? stats.scheduled})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("completed");
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "completed"
              ? "bg-[#064E3B] text-white shadow-xs"
              : "text-[#14231D] hover:bg-gray-100"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Completed ({stats.tabCounts?.completed ?? stats.completed})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("overdue");
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "overdue"
              ? "bg-[#064E3B] text-white shadow-xs"
              : "text-[#14231D] hover:bg-gray-100"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Overdue ({stats.tabCounts?.overdue ?? stats.overdue})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. SEARCH & ADVANCED FILTER TOOLBAR                      */}
      {/* ======================================================== */}
      <div className="bg-white p-3 rounded-2xl border border-[#DCE7E1] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, phone, or patient ID..."
            className="w-full pl-9 pr-9 py-2 bg-[#F4F8F6] focus:bg-white text-xs text-[#14231D] placeholder-[#718096] border border-[#DCE7E1] focus:border-[#065F46] rounded-xl outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#14231D] p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns & Reset */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Reason / Condition Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setConditionMenuOpen(!conditionMenuOpen);
                setStatusMenuOpen(false);
                setDateRangeMenuOpen(false);
              }}
              className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#DCE7E1] rounded-xl text-xs font-semibold text-[#14231D] flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#718096]" />
              <span>{conditionFilter === "all" ? "Reason / Condition" : conditionFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#718096]" />
            </button>
            {conditionMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#DCE7E1] rounded-xl shadow-xl z-30 p-1 text-xs">
                {[
                  { id: "all", label: "All Conditions" },
                  { id: "PCOS Management", label: "PCOS Management" },
                  { id: "Hormonal Imbalance", label: "Hormonal Imbalance" },
                  { id: "Weight Management", label: "Weight Management" },
                  { id: "PCOD / PCOS", label: "PCOD / PCOS" },
                  { id: "Skin & Hair Care", label: "Skin & Hair Care" },
                  { id: "Diet & Nutrition", label: "Diet & Nutrition" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setConditionFilter(item.id);
                      setConditionMenuOpen(false);
                      setPage(1);
                    }}
                    className={`w-full px-3 py-2 text-left rounded-lg transition-colors cursor-pointer ${
                      conditionFilter === item.id
                        ? "bg-[#E8F5EC] text-[#064E3B] font-bold"
                        : "text-[#14231D] hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setStatusMenuOpen(!statusMenuOpen);
                setConditionMenuOpen(false);
                setDateRangeMenuOpen(false);
              }}
              className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#DCE7E1] rounded-xl text-xs font-semibold text-[#14231D] flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#718096]" />
              <span>
                {statusDropdown === "all"
                  ? "Status"
                  : statusDropdown.charAt(0).toUpperCase() + statusDropdown.slice(1)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#718096]" />
            </button>
            {statusMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#DCE7E1] rounded-xl shadow-xl z-30 p-1 text-xs">
                {[
                  { id: "all", label: "All Statuses" },
                  { id: "pending", label: "Pending" },
                  { id: "scheduled", label: "Scheduled" },
                  { id: "completed", label: "Completed" },
                  { id: "overdue", label: "Overdue" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStatusDropdown(item.id);
                      setStatusMenuOpen(false);
                      setPage(1);
                    }}
                    className={`w-full px-3 py-2 text-left rounded-lg transition-colors cursor-pointer ${
                      statusDropdown === item.id
                        ? "bg-[#E8F5EC] text-[#064E3B] font-bold"
                        : "text-[#14231D] hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDateRangeMenuOpen(!dateRangeMenuOpen);
                setConditionMenuOpen(false);
                setStatusMenuOpen(false);
              }}
              className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#DCE7E1] rounded-xl text-xs font-semibold text-[#14231D] flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[#718096]" />
              <span>
                {dateRangeFilter === "all"
                  ? "Date Range"
                  : dateRangeFilter === "today"
                  ? "Today"
                  : dateRangeFilter === "tomorrow"
                  ? "Tomorrow"
                  : dateRangeFilter === "in_3_days"
                  ? "In 3 Days"
                  : dateRangeFilter === "next_7_days"
                  ? "Next 7 Days"
                  : "Date Filtered"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#718096]" />
            </button>
            {dateRangeMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#DCE7E1] rounded-xl shadow-xl z-30 p-1 text-xs">
                {[
                  { id: "all", label: "All Dates" },
                  { id: "today", label: "Today" },
                  { id: "tomorrow", label: "Tomorrow" },
                  { id: "in_3_days", label: "In 3 Days" },
                  { id: "next_7_days", label: "Next 7 Days" },
                  { id: "this_month", label: "This Month" },
                  { id: "overdue", label: "Past / Overdue" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDateRangeFilter(item.id);
                      setDateRangeMenuOpen(false);
                      setPage(1);
                    }}
                    className={`w-full px-3 py-2 text-left rounded-lg transition-colors cursor-pointer ${
                      dateRangeFilter === item.id
                        ? "bg-[#E8F5EC] text-[#064E3B] font-bold"
                        : "text-[#14231D] hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#DCE7E1] rounded-xl text-xs font-semibold text-[#14231D] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#718096]" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. FOLLOW-UP DATA TABLE                                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-[#DCE7E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#DCE7E1] bg-[#FAFBF9] text-[#718096] font-semibold text-[11px] uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === followups.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(followups.map((f) => f._id));
                      else setSelectedIds([]);
                    }}
                    className="w-4 h-4 rounded border-[#DCE7E1] text-[#064E3B] focus:ring-[#064E3B] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-3 min-w-[200px]">Patient</th>
                <th className="py-4 px-3 min-w-[240px]">Reason / Clinical Context</th>
                <th className="py-4 px-3 min-w-[170px]">Follow-up Date</th>
                <th className="py-4 px-3 min-w-[120px]">Type</th>
                <th className="py-4 px-3 min-w-[130px]">Status</th>
                <th className="py-4 px-4 min-w-[100px] text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-[#718096]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064E3B] mb-2" />
                    Loading clinical follow-up records...
                  </td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#718096]">
                    <div className="w-12 h-12 rounded-2xl bg-[#E8F5EC] text-[#065F46] flex items-center justify-center mx-auto mb-3">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#14231D] text-sm">No follow-ups found</p>
                    <p className="text-xs text-[#718096] mt-1">
                      No records match the current filter or search criteria.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 px-3.5 py-1.5 bg-[#E8F5EC] hover:bg-[#d8eedf] text-[#064E3B] font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                followups.map((f) => {
                  const patient = f.patientId || {};
                  const patientName = patient.fullName || "Patient";
                  const patientCode = patient.patientCode || (f as any).followUpCode || "TG0000";
                  const avatar = getAvatarStyle(patientName);
                  const dateInfo = formatDateDisplay(f.dueDate);
                  const isOverdue = dateInfo.isOverdue && f.status !== "completed";
                  const isSelected = selectedIds.includes(f._id);

                  return (
                    <tr
                      key={f._id}
                      className={`hover:bg-[#F9FAF9] transition-colors ${
                        isSelected ? "bg-[#F0FDF4]/60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, f._id]);
                            else setSelectedIds(selectedIds.filter((id) => id !== f._id));
                          }}
                          className="w-4 h-4 rounded border-[#DCE7E1] text-[#064E3B] focus:ring-[#064E3B] cursor-pointer"
                        />
                      </td>

                      {/* Patient */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => {
                              if (patient._id && onOpenPatientProfile) onOpenPatientProfile(patient._id);
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer ${avatar.bg} ${avatar.text}`}
                          >
                            {getInitials(patientName)}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (patient._id && onOpenPatientProfile) onOpenPatientProfile(patient._id);
                              }}
                              className="font-bold text-xs text-[#14231D] hover:text-[#065F46] hover:underline truncate block text-left cursor-pointer"
                            >
                              {patientName}
                            </button>
                            <p className="text-[11px] text-[#718096] font-mono mt-0.5">
                              #{patientCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Reason / Clinical Context */}
                      <td className="py-4 px-3">
                        <p className="font-bold text-xs text-[#14231D] truncate">
                          {f.reason || f.serviceName || "Clinical Review"}
                        </p>
                        <p className="text-[11px] text-[#718096] truncate mt-0.5">
                          {f.description || f.planInstructions || "Review symptoms & treatment progress"}
                        </p>
                      </td>

                      {/* Follow-up Date */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#14231D] font-medium">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{dateInfo.formatted}</span>
                        </div>
                        {dateInfo.relative && (
                          <div className="mt-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isOverdue
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : dateInfo.relative === "Today" || dateInfo.relative === "Tomorrow"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-[#718096]"
                              }`}
                            >
                              {dateInfo.relative}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-4 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${getTypeBadgeStyle(
                            f.type || "Review"
                          )}`}
                        >
                          {f.type || "Review"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3">
                        {getStatusBadge(f.status, isOverdue)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Button 1: View Details */}
                          <button
                            type="button"
                            onClick={() => setDetailItem(f)}
                            title="View Follow-up Details"
                            className="w-8 h-8 rounded-lg border border-[#DCE7E1] hover:bg-gray-50 text-[#718096] hover:text-[#14231D] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Button 2: Action based on status */}
                          {f.status === "completed" ? (
                            <button
                              type="button"
                              onClick={() => setDetailItem(f)}
                              title="View Completed Notes / Rx"
                              className="w-8 h-8 rounded-lg border border-[#DCE7E1] hover:bg-gray-50 text-[#718096] hover:text-[#14231D] flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          ) : f.status === "scheduled" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleItem(f);
                                setRescheduleDate(f.dueDate ? f.dueDate.split("T")[0] : "");
                                setRescheduleTime(f.scheduledTime || "11:00 AM");
                              }}
                              title="Edit / Reschedule"
                              className="w-8 h-8 rounded-lg border border-[#DCE7E1] hover:bg-gray-50 text-[#718096] hover:text-[#14231D] flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            /* Pending or Overdue -> Mark Done */
                            <button
                              type="button"
                              onClick={() => {
                                setCompleteItem(f);
                                setCompletionNotes("");
                              }}
                              title="Mark Done"
                              className="w-8 h-8 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ======================================================== */}
        {/* 6. FOOTER PAGINATION                                     */}
        {/* ======================================================== */}
        <div className="p-4 bg-[#FAFBF9] border-t border-[#DCE7E1] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#718096]">
          {/* Show per page selector */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-white border border-[#DCE7E1] rounded-lg text-[#14231D] font-semibold outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>

          {/* Showing count and page numbers */}
          <div className="flex items-center gap-3">
            <span>
              Showing {followups.length > 0 ? (page - 1) * limit + 1 : 0} –{" "}
              {Math.min(page * limit, totalCount)} of {totalCount}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="w-7 h-7 rounded-lg border border-[#DCE7E1] bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-[#14231D] cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .slice(0, 5)
                .map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      page === pNum
                        ? "bg-[#064E3B] text-white shadow-2xs"
                        : "text-[#718096] hover:bg-gray-100"
                    }`}
                  >
                    {pNum}
                  </button>
                ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="w-7 h-7 rounded-lg border border-[#DCE7E1] bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 text-[#14231D] cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. MODALS & DRAWERS                                      */}
      {/* ======================================================== */}

      {/* MODAL 1: ADD FOLLOW-UP */}
      {addModalOpen && (
        <div
          onClick={() => setAddModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#DCE7E1] overflow-hidden flex flex-col max-h-[90vh] cursor-default"
          >
            {/* Modal Header */}
            <div className="p-5 bg-[#064E3B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Add Follow-up Recommendation</h3>
                  <p className="text-xs text-emerald-100/80">
                    Schedule a continuity review and reminder cadence
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateFollowUp} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Patient Autocomplete Selector */}
              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Select Patient <span className="text-rose-500">*</span>
                </label>
                {selectedPatient ? (
                  <div className="p-3 bg-[#E8F5EC] border border-emerald-300 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#064E3B]">{selectedPatient.fullName}</p>
                      <p className="text-[11px] text-[#718096]">
                        #{selectedPatient.patientCode} • {selectedPatient.phone} • {selectedPatient.service || "PCOS Care"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#064E3B] font-bold text-xs rounded-lg border border-emerald-300 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#718096] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder="Type patient name, phone, or code to search..."
                      className="w-full pl-9 pr-4 py-2.5 bg-[#F4F8F6] focus:bg-white border border-[#DCE7E1] focus:border-[#065F46] rounded-xl outline-none"
                    />
                    {isSearchingPatients && (
                      <Loader2 className="w-4 h-4 animate-spin text-[#065F46] absolute right-3 top-1/2 -translate-y-1/2" />
                    )}

                    {patientResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#DCE7E1] rounded-xl shadow-xl z-20 max-h-44 overflow-y-auto divide-y divide-gray-100">
                        {patientResults.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientQuery("");
                              setPatientResults([]);
                            }}
                            className="p-2.5 hover:bg-[#E8F5EC] cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-[#14231D]">{p.fullName}</p>
                              <p className="text-[10px] text-[#718096]">
                                #{p.patientCode} • {p.phone}
                              </p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-md text-[#718096]">
                              Select
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reason & Type in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                    Clinical Condition / Reason <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                  >
                    <option value="PCOS Management">PCOS Management</option>
                    <option value="Hormonal Imbalance">Hormonal Imbalance</option>
                    <option value="Weight Management">Weight Management</option>
                    <option value="PCOD / PCOS">PCOD / PCOS</option>
                    <option value="Skin & Hair Care">Skin & Hair Care</option>
                    <option value="Diet & Nutrition">Diet & Nutrition</option>
                    <option value="Fertility Care">Fertility Care</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                    Follow-up Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                  >
                    <option value="Review">Review</option>
                    <option value="Test Review">Test Review</option>
                    <option value="Progress">Progress</option>
                    <option value="Medication Review">Medication Review</option>
                    <option value="Investigation Review">Investigation Review</option>
                    <option value="Routine Follow-up">Routine Follow-up</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                    Follow-up Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                    Scheduled Time Slot
                  </label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 11:00 AM"
                    className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Clinical Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Routine", "Medium", "High", "Urgent"] as const).map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setNewPriority(pr)}
                      className={`p-2 rounded-xl text-center font-bold transition-all cursor-pointer ${
                        newPriority === pr
                          ? "bg-[#064E3B] text-white"
                          : "bg-[#F4F8F6] text-[#718096] hover:bg-gray-100"
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Instructions */}
              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Doctor Instructions & Clinical Plan
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Review symptoms, evaluate response to posology, check blood reports..."
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                />
              </div>

              {/* Notification Toggles */}
              <div className="p-3 bg-[#FAFBF9] border border-[#DCE7E1] rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-[#14231D]">Automated Patient Reminders</p>
                  <p className="text-[11px] text-[#718096]">
                    Notify patient via WhatsApp & Email before due date
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newWhatsapp}
                      onChange={(e) => setNewWhatsapp(e.target.checked)}
                      className="w-4 h-4 rounded text-[#064E3B] focus:ring-[#064E3B]"
                    />
                    <span className="text-xs font-semibold">WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEmail}
                      onChange={(e) => setNewEmail(e.target.checked)}
                      className="w-4 h-4 rounded text-[#064E3B] focus:ring-[#064E3B]"
                    />
                    <span className="text-xs font-semibold">Email</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE7E1]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-[#DCE7E1] rounded-xl font-semibold hover:bg-gray-50 text-[#718096] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#053d2d] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmittingNew && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Follow-up</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MARK DONE / COMPLETE */}
      {completeItem && (
        <div
          onClick={() => setCompleteItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#DCE7E1] overflow-hidden cursor-default"
          >
            <div className="p-5 bg-[#065F46] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base">Complete Follow-up Review</h3>
                  <p className="text-xs text-emerald-100/80">
                    Record clinical outcome and close case review
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompleteItem(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-[#E8F5EC] border border-emerald-300 rounded-xl">
                <p className="font-bold text-xs text-[#064E3B]">
                  {completeItem.patientId?.fullName} ({completeItem.followUpCode})
                </p>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  Reason: {completeItem.reason} • Scheduled: {formatDateDisplay(completeItem.dueDate).formatted}
                </p>
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Clinical Outcome
                </label>
                <input
                  type="text"
                  value={completionOutcome}
                  onChange={(e) => setCompletionOutcome(e.target.value)}
                  placeholder="e.g. Symptoms reduced, cycles normalized"
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Recovery Status
                </label>
                <select
                  value={completionRecovery}
                  onChange={(e) => setCompletionRecovery(e.target.value)}
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                >
                  <option value="Improved">Improved</option>
                  <option value="Significantly Improved">Significantly Improved</option>
                  <option value="Stable">Stable</option>
                  <option value="No Improvement">No Improvement</option>
                  <option value="Treatment Adjusted">Treatment Adjusted</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Completion Notes & Clinician Observations
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Document patient progress, compliance, and recommendations..."
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE7E1]">
                <button
                  type="button"
                  onClick={() => setCompleteItem(null)}
                  className="px-4 py-2 border border-[#DCE7E1] rounded-xl font-semibold hover:bg-gray-50 text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="px-5 py-2 bg-[#065F46] hover:bg-[#054d38] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingComplete && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm & Mark Completed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESCHEDULE */}
      {rescheduleItem && (
        <div
          onClick={() => setRescheduleItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-[#DCE7E1] overflow-hidden cursor-default"
          >
            <div className="p-5 bg-[#1E3A8A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-blue-300" />
                <div>
                  <h3 className="font-bold text-base">Reschedule Follow-up</h3>
                  <p className="text-xs text-blue-100/80">Adjust clinical review date</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <p className="font-bold text-xs text-[#14231D]">
                  {rescheduleItem.patientId?.fullName} ({rescheduleItem.followUpCode})
                </p>
                <p className="text-[11px] text-[#718096] mt-0.5">
                  Currently scheduled for: {formatDateDisplay(rescheduleItem.dueDate).formatted}
                </p>
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  New Follow-up Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Time Slot
                </label>
                <input
                  type="text"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Reason for Rescheduling
                </label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                >
                  <option value="Patient requested postponement">Patient requested postponement</option>
                  <option value="Clinician schedule adjustment">Clinician schedule adjustment</option>
                  <option value="Awaiting lab investigation results">Awaiting lab investigation results</option>
                  <option value="Medication cycle ongoing">Medication cycle ongoing</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE7E1]">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 border border-[#DCE7E1] rounded-xl font-semibold hover:bg-gray-50 text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="px-5 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingReschedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Reschedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAIL DRAWER */}
      {detailItem && (
        <div
          onClick={() => setDetailItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#DCE7E1] overflow-hidden flex flex-col max-h-[90vh] cursor-default"
          >
            {/* Header */}
            <div className="p-5 bg-[#064E3B] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 font-bold">
                  {getInitials(detailItem.patientId?.fullName)}
                </div>
                <div>
                  <h3 className="font-bold text-base">{detailItem.patientId?.fullName}</h3>
                  <p className="text-xs text-emerald-100/80">
                    Follow-up Code: #{detailItem.followUpCode} • Patient ID: #{detailItem.patientId?.patientCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#14231D]">
              {/* Summary Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#FAFBF9] border border-[#DCE7E1] rounded-xl text-center">
                  <p className="text-[11px] text-[#718096]">Condition</p>
                  <p className="font-bold text-xs text-[#14231D] mt-0.5 truncate">{detailItem.reason}</p>
                </div>
                <div className="p-3 bg-[#FAFBF9] border border-[#DCE7E1] rounded-xl text-center">
                  <p className="text-[11px] text-[#718096]">Type</p>
                  <p className="font-bold text-xs text-purple-700 mt-0.5">{detailItem.type}</p>
                </div>
                <div className="p-3 bg-[#FAFBF9] border border-[#DCE7E1] rounded-xl text-center">
                  <p className="text-[11px] text-[#718096]">Due Date</p>
                  <p className="font-bold text-xs text-emerald-700 mt-0.5">
                    {formatDateDisplay(detailItem.dueDate).formatted}
                  </p>
                </div>
                <div className="p-3 bg-[#FAFBF9] border border-[#DCE7E1] rounded-xl text-center">
                  <p className="text-[11px] text-[#718096]">Status</p>
                  <p className="font-bold text-xs text-[#14231D] mt-0.5 capitalize">{detailItem.status}</p>
                </div>
              </div>

              {/* Patient Contact & Clinical Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#DCE7E1] rounded-2xl space-y-1.5">
                  <h4 className="font-bold text-xs text-[#064E3B] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Patient Record Information
                  </h4>
                  <p className="text-[#718096]">
                    <span className="font-semibold text-[#14231D]">Name:</span> {detailItem.patientId?.fullName}
                  </p>
                  <p className="text-[#718096]">
                    <span className="font-semibold text-[#14231D]">Phone:</span> {detailItem.patientId?.phone || "N/A"}
                  </p>
                  <p className="text-[#718096]">
                    <span className="font-semibold text-[#14231D]">Email:</span> {detailItem.patientId?.email || "N/A"}
                  </p>
                  {onOpenPatientProfile && detailItem.patientId?._id && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailItem(null);
                        onOpenPatientProfile(detailItem.patientId._id);
                      }}
                      className="text-xs font-bold text-[#065F46] hover:underline pt-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Full Clinical History</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-4 bg-white border border-[#DCE7E1] rounded-2xl space-y-1.5">
                  <h4 className="font-bold text-xs text-[#064E3B] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Follow-up Schedule & Mode
                  </h4>
                  <p className="text-[#718096]">
                    <span className="font-semibold text-[#14231D]">Scheduled Time:</span>{" "}
                    {detailItem.scheduledTime || "11:00 AM"}
                  </p>
                  <p className="text-[#718096]">
                    <span className="font-semibold text-[#14231D]">Mode:</span>{" "}
                    {detailItem.mode || "Online Video Consultation"}
                  </p>
                  <p className="text-[#718096]">
                    <span className="font-semibold text-[#14231D]">Priority:</span> {detailItem.priority || "Routine"}
                  </p>
                </div>
              </div>

              {/* Instructions / Observations */}
              <div className="p-4 bg-white border border-[#DCE7E1] rounded-2xl space-y-2">
                <h4 className="font-bold text-xs text-[#064E3B] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Clinician Instructions & Plan
                </h4>
                <p className="text-[#718096] leading-relaxed">
                  {detailItem.planInstructions ||
                    detailItem.description ||
                    "Routine constitutional follow-up. Check symptom diary and review progress."}
                </p>
              </div>

              {/* Completion Notes (if completed) */}
              {detailItem.status === "completed" && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5">
                  <h4 className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed Review Outcome
                  </h4>
                  <p className="text-emerald-900">
                    <span className="font-semibold">Outcome:</span> {detailItem.outcome || "Treatment goals met"}
                  </p>
                  <p className="text-emerald-900">
                    <span className="font-semibold">Recovery Status:</span>{" "}
                    {detailItem.recoveryStatus || "Improved"}
                  </p>
                  {detailItem.completionNotes && (
                    <p className="text-emerald-800 text-[11px] pt-1">
                      {detailItem.completionNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Video Consultation Ready Card */}
              {onOpenConsultation && (
                <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#065F46] uppercase tracking-wide">
                      Teleconsultation Status
                    </span>
                    <p className="font-bold text-xs text-[#14231D] mt-0.5">
                      Online Video Room Active
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailItem(null);
                      onOpenConsultation("", detailItem.patientId?._id || "");
                    }}
                    className="px-4 py-2 bg-[#065F46] hover:bg-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Launch Video Consultation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#FAFBF9] border-t border-[#DCE7E1] flex items-center justify-between">
              <span className="text-[11px] text-[#718096] font-mono">
                Code: #{detailItem.followUpCode}
              </span>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-5 py-2 bg-[#064E3B] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SETTINGS */}
      {settingsModalOpen && (
        <div
          onClick={() => setSettingsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#DCE7E1] overflow-hidden cursor-default"
          >
            <div className="p-5 bg-[#064E3B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base">Follow-up Preferences</h3>
                  <p className="text-xs text-emerald-100/80">Configure default intervals and reminder cadences</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Default Recommended Interval
                </label>
                <select
                  value={settingsData.defaultInterval}
                  onChange={(e) => setSettingsData({ ...settingsData, defaultInterval: e.target.value })}
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                >
                  <option value="Day 3">Day 3 (Acute follow-up)</option>
                  <option value="Day 7">Day 7 (Weekly review)</option>
                  <option value="Day 14">Day 14 (Fortnightly standard)</option>
                  <option value="Day 21">Day 21 (Three-week evaluation)</option>
                  <option value="Day 30">Day 30 (Monthly care cycle)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Default Follow-up Type
                </label>
                <select
                  value={settingsData.defaultType}
                  onChange={(e) => setSettingsData({ ...settingsData, defaultType: e.target.value })}
                  className="w-full p-2.5 bg-[#F4F8F6] border border-[#DCE7E1] rounded-xl outline-none"
                >
                  <option value="Review">Review</option>
                  <option value="Test Review">Test Review</option>
                  <option value="Progress">Progress</option>
                  <option value="Medication Review">Medication Review</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-xs text-[#14231D] block mb-1.5">
                  Preferred Consultation Mode
                </label>
                <input
                  type="text"
                  value={settingsData.preferredConsultationMode}
                  readOnly
                  className="w-full p-2.5 bg-gray-100 border border-[#DCE7E1] rounded-xl text-gray-500 font-semibold outline-none"
                />
                <p className="text-[10px] text-[#718096] mt-1">
                  * TriGyna consultations are online video only (Google Meet / Zoom).
                </p>
              </div>

              <div className="space-y-2 pt-1 border-t border-[#DCE7E1]">
                <p className="font-bold text-xs text-[#14231D]">Automated Reminder Delivery</p>
                <label className="flex items-center justify-between p-2.5 bg-[#FAFBF9] border border-[#DCE7E1] rounded-xl cursor-pointer">
                  <span className="font-semibold text-xs text-[#14231D]">WhatsApp Reminders</span>
                  <input
                    type="checkbox"
                    checked={settingsData.autoRemindWhatsApp}
                    onChange={(e) =>
                      setSettingsData({ ...settingsData, autoRemindWhatsApp: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#064E3B] focus:ring-[#064E3B]"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-[#FAFBF9] border border-[#DCE7E1] rounded-xl cursor-pointer">
                  <span className="font-semibold text-xs text-[#14231D]">Email Reminders</span>
                  <input
                    type="checkbox"
                    checked={settingsData.autoRemindEmail}
                    onChange={(e) =>
                      setSettingsData({ ...settingsData, autoRemindEmail: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#064E3B] focus:ring-[#064E3B]"
                  />
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DCE7E1]">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-4 py-2 border border-[#DCE7E1] rounded-xl font-semibold hover:bg-gray-50 text-[#718096]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#053d2d] text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSavingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Preferences</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
