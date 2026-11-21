"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Users,
  Target,
  Calendar,
  Clock,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserCheck,
  CalendarPlus,
  CheckSquare,
  CreditCard,
  Plus,
  Stethoscope,
  Phone,
  CheckCircle2,
  Check,
  X,
  Loader2,
  RefreshCw,
  ArrowRight,
  Eye,
  Activity,
  FileText,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";
import { ModalPortal } from "@/components/ui/ModalPortal";

export function formatLeadDisplayName(rawName: string): string {
  if (!rawName) return "Clinical Enquiry";
  const trimmed = rawName.trim();
  const words = trimmed.split(/\s+/);
  if (words.length >= 4 && words.length % 2 === 0) {
    const half = words.length / 2;
    if (words.slice(0, half).join(" ") === words.slice(half).join(" ")) {
      return words.slice(0, half).join(" ");
    }
  }
  return trimmed || "Clinical Enquiry";
}

export function formatServiceDisplayName(service: string): string {
  if (!service) return "Consultation";
  if (service.includes("PCOD") || service.includes("PCOS")) return "PCOD/PCOS Care";
  if (service.includes("Skin") || service.includes("Hair")) return "Skin & Hair";
  if (service.includes("Diet") || service.includes("Nutrition")) return "Diet & Nutrition";
  if (service.includes("Homoeopathy")) return "Constitutional Care";
  return service.length > 22 ? service.substring(0, 20) + "..." : service;
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Just now";
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatActionDue(isoString: string, priority: string): string {
  if (priority === "urgent" || priority === "high") return "1 hour";
  if (!isoString) return "Today";
  const date = new Date(isoString);
  const now = new Date();
  const diffHours = Math.max(0, (now.getTime() - date.getTime()) / 3600000);
  if (diffHours < 2) return "1 hour";
  if (diffHours < 4) return "2 hours";
  if (diffHours < 8) return "4 hours";
  if (diffHours < 24) return "Today";
  return "1 day";
}

export function formatAuditActivity(act: AuditActivityItem) {
  let title = "System event";
  let desc = "Operational event logged";
  let icon = Activity;
  let color = "bg-[#F1F5F9] text-[#475569]";

  const action = (act.action || "").toLowerCase();
  const res = (act.resource || act.targetEntity || "").toLowerCase();
  const details = (act.details || {}) as Record<string, unknown>;

  if (res.includes("lead") || action.includes("lead")) {
    title = action.includes("create") ? "New lead received" : "Lead updated";
    const leadName = typeof details.fullName === "string" ? details.fullName : typeof details.name === "string" ? details.name : null;
    const sInt = typeof details.serviceInterest === "string" ? details.serviceInterest : "Website Enquiry";
    desc = leadName ? `${leadName} — ${sInt}` : "New clinical lead captured";
    icon = Target;
    color = "bg-[#FEF2F2] text-[#EF4444]";
  } else if (res.includes("payment") || action.includes("payment")) {
    title = "Payment received";
    const amt = details.amount ?? details.paidAmount;
    const patName = typeof details.patientName === "string" ? details.patientName : null;
    desc = amt ? `₹${Number(amt).toLocaleString("en-IN")}${patName ? ` from ${patName}` : ""}` : "Payment received";
    icon = IndianRupee;
    color = "bg-[#E9F8F0] text-[#087A50]";
  } else if (res.includes("appointment") || action.includes("appointment")) {
    const patName = typeof details.patientName === "string" ? details.patientName : "Patient";
    const sName = typeof details.serviceName === "string" ? details.serviceName : "Consultation";
    if (action.includes("complete")) {
      title = "Appointment completed";
      desc = `${patName} — ${sName}`;
    } else {
      title = "Appointment scheduled";
      desc = `${patName} — ${sName}`;
    }
    icon = Calendar;
    color = "bg-[#EFF6FF] text-[#2563EB]";
  } else if (res.includes("patient") || action.includes("patient")) {
    title = "New patient registered";
    const pName = typeof details.fullName === "string" ? details.fullName : typeof details.name === "string" ? details.name : "Patient";
    desc = pName;
    icon = Users;
    color = "bg-[#FAF5FF] text-[#9333EA]";
  } else if (res.includes("invoice") || action.includes("invoice")) {
    title = "Invoice generated";
    const invNum = typeof details.invoiceNumber === "string" ? details.invoiceNumber : "INV";
    desc = invNum;
    icon = FileText;
    color = "bg-[#FFF7ED] text-[#D97706]";
  } else if (res.includes("leave") || action.includes("leave")) {
    title = action.includes("approve") ? "Staff leave approved" : "Staff leave submitted";
    desc = typeof details.employeeName === "string" ? details.employeeName : "HRMS Staff";
    icon = UserCheck;
    color = "bg-[#FAF5FF] text-[#9333EA]";
  } else {
    title = action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    desc = typeof details.message === "string" ? details.message : `${act.actorId?.name || "Staff"} performed action`;
  }

  return { title, desc, icon, color };
}

interface AdminOverviewData {
  kpis: {
    totalActivePatients: number;
    activeDoctors: number;
    totalEmployees: number;
    todayAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalAppointments: number;
    todayAttendance: number;
    pendingLeaves: number;
    pendingCorrections: number;
    pendingApprovals: number;
    unreadNotifications: number;
    openLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    totalLeads: number;
    conversionRate: number;
    totalBilled: number;
    totalRevenue: number;
    totalCollected: number;
    outstandingDues: number;
    trends?: {
      patients?: { percentage: number; direction: string; label: string };
      leads?: { percentage: number; direction: string; label: string };
      appointments?: { percentage: number; direction: string; label: string };
      revenue?: { percentage: number; direction: string; label: string };
    };
  };
  crmPipeline: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    lost: number;
    total: number;
  };
  todaySchedule: Array<{
    _id: string;
    appointmentDate: string;
    startTime: string;
    status: string;
    serviceName?: string;
    patientId?: { fullName?: string; patientCode?: string; phone?: string };
    doctorId?: { specialization?: string[]; consultationFee?: number; userId?: { name?: string } };
  }>;
  recentPatients?: Array<{
    _id: string;
    fullName: string;
    phone: string;
    service: string;
    status: string;
    lastVisit: string;
    patientCode?: string;
  }>;
  appointmentStatus?: {
    total: number;
    completed: { count: number; percentage: number };
    inConsultation: { count: number; percentage: number };
    upcoming: { count: number; percentage: number };
    cancelled: { count: number; percentage: number };
  };
  monthlyRevenue?: Array<{ month: string; collected: number; pending: number; invoices: number }>;
  monthlyPatientGrowth?: Array<{ month: string; newPatients: number; returningPatients: number; total: number }>;
}

interface ActionCenterItem {
  id: string;
  type: string;
  title: string;
  description: string;
  module: string;
  targetId: string;
  createdAt: string;
  priority: string;
}

interface AuditActivityItem {
  _id: string;
  action: string;
  targetEntity?: string;
  resource?: string;
  timestamp: string;
  actorId?: { name?: string; fullName?: string; role?: string };
  ipAddress?: string;
  details?: Record<string, unknown>;
}

interface AdminOverviewExactProps {
  dateRange?: string;
  onTabChange: (tabId: string) => void;
  showNotification: (msg: string, isError?: boolean) => void;
  onOpenAddLead?: () => void;
  onOpenRegisterPatient?: () => void;
  onOpenBookAppointment?: () => void;
  onOpenAddEmployee?: () => void;
  onOpenCreateTask?: () => void;
  onOpenRecordPayment?: () => void;
}

export function AdminOverviewExact({
  dateRange = "all",
  onTabChange,
  showNotification,
  onOpenAddLead,
  onOpenRegisterPatient,
  onOpenBookAppointment,
  onOpenAddEmployee,
  onOpenCreateTask,
  onOpenRecordPayment,
}: AdminOverviewExactProps) {
  const { user } = useAuth();
  const [adminOverview, setAdminOverview] = useState<AdminOverviewData | null>(null);
  const [actionItems, setActionItems] = useState<ActionCenterItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<AuditActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  // Lead Modal state
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    serviceInterest: "PCOD / PCOS Consultation",
    source: "website_enquiry",
    priority: "medium",
    notes: "",
  });

  // Fetch real aggregated administrative dashboard data
  const loadOverviewData = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryStr = dateRange ? `?dateRange=${encodeURIComponent(dateRange)}` : "";
      const [overviewRes, activityRes, actionRes] = await Promise.all([
        api.get<AdminOverviewData>(`/admin/dashboard/overview${queryStr}`),
        api.get<{ activities: AuditActivityItem[] }>("/admin/dashboard/recent-activity?limit=6"),
        api.get<{ items: ActionCenterItem[] }>("/admin/dashboard/action-center"),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setAdminOverview(overviewRes.data);
      }
      if (activityRes.success && activityRes.data?.activities) {
        setRecentActivities(activityRes.data.activities);
      }
      if (actionRes.success && actionRes.data?.items) {
        setActionItems(actionRes.data.items);
      }
    } catch (err: unknown) {
      console.error("Failed to load admin overview data:", err);
      showNotification("Failed to synchronize live administrative records", true);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, showNotification]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) await loadOverviewData();
    })();
    return () => {
      isMounted = false;
    };
  }, [loadOverviewData]);

  // Derived real database KPIs - strictly zero defaults, never fake mocks
  const totalPatients = adminOverview?.kpis.totalActivePatients ?? 0;
  const totalLeads = adminOverview?.kpis.totalLeads ?? 0;
  const apptsToday = adminOverview?.kpis.todayAppointments ?? 0;
  const pendingApprovals = adminOverview?.kpis.pendingApprovals ?? actionItems.length;
  const totalRevenue = adminOverview?.kpis.totalCollected ?? 0;

  // Time of day greeting
  const greetingTimeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const adminFirstName = user?.name ? user.name.split(" ")[0] : "Sushil";

  // Toggle action item checkbox (safe state update)
  const toggleTaskCompleted = (taskId: string, title: string) => {
    const isDone = !completedTaskIds[taskId];
    setCompletedTaskIds((prev) => ({ ...prev, [taskId]: isDone }));
    showNotification(isDone ? `Completed: "${title}"` : `Marked incomplete: "${title}"`);
  };

  // Create new lead in database
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.fullName.trim() || !newLeadForm.phone.trim()) {
      showNotification("Please supply full name and phone number", true);
      return;
    }

    try {
      setIsSubmittingLead(true);
      await api.post("/crm/leads", {
        ...newLeadForm,
        consultationMode: "Online Video Consultation",
      });
      showNotification(`Registered new lead for ${newLeadForm.fullName}!`);
      setIsAddLeadModalOpen(false);
      setNewLeadForm({
        fullName: "",
        phone: "",
        email: "",
        serviceInterest: "PCOD / PCOS Consultation",
        source: "website_enquiry",
        priority: "medium",
        notes: "",
      });
      loadOverviewData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating lead";
      showNotification(msg, true);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Format currency in Indian standard format
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Sparkline paths
  const SparklineGreen = () => (
    <svg className="w-20 h-6 text-[#16A36A]" viewBox="0 0 80 24" fill="none">
      <path
        d="M2 18C12 18 16 8 26 12C36 16 46 6 56 10C66 14 72 4 78 4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const SparklineBlue = () => (
    <svg className="w-20 h-6 text-[#3B82F6]" viewBox="0 0 80 24" fill="none">
      <path
        d="M2 16C12 16 18 12 28 8C38 4 48 14 58 10C68 6 72 3 78 3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const SparklineOrange = () => (
    <svg className="w-20 h-6 text-[#F97316]" viewBox="0 0 80 24" fill="none">
      <path
        d="M2 6C12 6 20 18 30 14C40 10 50 20 60 16C70 12 74 20 78 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const SparklinePurple = () => (
    <svg className="w-20 h-6 text-[#A855F7]" viewBox="0 0 80 24" fill="none">
      <path
        d="M2 14C12 14 18 6 28 10C38 14 48 4 58 8C68 12 72 6 78 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const SparklineCoral = () => (
    <svg className="w-20 h-6 text-[#EF4444]" viewBox="0 0 80 24" fill="none">
      <path
        d="M2 18C14 18 20 12 30 14C40 16 50 6 60 8C70 10 74 4 78 4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );

  // Real today schedule records from database
  const scheduleItems = useMemo(() => {
    if (adminOverview?.todaySchedule && adminOverview.todaySchedule.length > 0) {
      return adminOverview.todaySchedule.map((s) => {
        const pName = s.patientId?.fullName || "Patient";
        const docName = s.doctorId?.userId?.name || "Doctor";
        const service = s.serviceName || "Clinical Consultation";
        const initials =
          pName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "PT";
        const statusNormalized =
          s.status === "completed"
            ? "Completed"
            : s.status === "in_consultation" || s.status === "checked_in"
            ? "In Consultation"
            : "Upcoming";

        return {
          id: s._id,
          time: s.startTime || "10:30 AM",
          initials,
          patientName: pName,
          service,
          doctorName: docName,
          status: statusNormalized,
        };
      });
    }
    return [];
  }, [adminOverview]);

  // Real recent patients from database
  const recentPatients = useMemo(() => {
    if (adminOverview?.recentPatients && adminOverview.recentPatients.length > 0) {
      return adminOverview.recentPatients;
    }
    return [];
  }, [adminOverview]);

  // Real pending actions from Action Center API
  const pendingActionsList = useMemo(() => {
    if (actionItems && actionItems.length > 0) {
      return actionItems.slice(0, 5).map((item) => {
        let typeLabel = "Admin";
        let typeColor = "bg-slate-50 text-slate-700 border-slate-200";

        if (item.type.includes("lead") || item.type.includes("crm")) {
          typeLabel = "CRM";
          typeColor = "bg-blue-50 text-blue-700 border-blue-200";
        } else if (item.type.includes("leave") || item.type.includes("corr") || item.type.includes("hrms")) {
          typeLabel = "HRMS";
          typeColor = "bg-purple-50 text-purple-700 border-purple-200";
        } else if (item.type.includes("inv") || item.type.includes("billing") || item.type.includes("pay")) {
          typeLabel = "Finance";
          typeColor = "bg-amber-50 text-amber-800 border-amber-200";
        } else if (item.type.includes("appt") || item.type.includes("presc") || item.type.includes("clin")) {
          typeLabel = "Clinical";
          typeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
        }

        return {
          id: item.id,
          title: item.title,
          type: typeLabel,
          typeColor,
          due: formatActionDue(item.createdAt, item.priority),
          module: item.module,
        };
      });
    }
    return [];
  }, [actionItems]);

  // Real CRM pipeline counts from database
  const crmCounts = useMemo(() => {
    return {
      new: adminOverview?.crmPipeline?.new ?? 0,
      contacted: adminOverview?.crmPipeline?.contacted ?? 0,
      qualified: adminOverview?.crmPipeline?.qualified ?? 0,
      converted: adminOverview?.crmPipeline?.converted ?? 0,
    };
  }, [adminOverview]);

  // Real appointment distribution from database
  const apptDistribution = useMemo(() => {
    if (adminOverview?.appointmentStatus) {
      return adminOverview.appointmentStatus;
    }
    return {
      total: 0,
      completed: { count: 0, percentage: 0 },
      inConsultation: { count: 0, percentage: 0 },
      upcoming: { count: 0, percentage: 0 },
      cancelled: { count: 0, percentage: 0 },
    };
  }, [adminOverview]);

  // Real 6-month monthly revenue series
  const revenueSeries = useMemo(() => {
    if (adminOverview?.monthlyRevenue && adminOverview.monthlyRevenue.length > 0) {
      const maxVal = Math.max(
        ...adminOverview.monthlyRevenue.map((m) => Math.max((m.collected || 0) + (m.pending || 0), m.invoices || 0, 100000)),
        400000
      );
      return adminOverview.monthlyRevenue.map((m) => ({
        month: m.month,
        collected: m.collected || 0,
        pending: m.pending || 0,
        invoices: m.invoices || 0,
        collectedPct: Math.min(100, Math.max(4, Math.round(((m.collected || 0) / maxVal) * 100))),
        pendingPct: Math.min(100, Math.max(4, Math.round(((m.pending || 0) / maxVal) * 100))),
      }));
    }
    return [];
  }, [adminOverview]);

  // Real 6-month monthly patient growth series
  const patientGrowthSeries = useMemo(() => {
    if (adminOverview?.monthlyPatientGrowth && adminOverview.monthlyPatientGrowth.length > 0) {
      const maxVal = Math.max(
        ...adminOverview.monthlyPatientGrowth.map((m) => Math.max(m.total || 0, (m.newPatients || 0) + (m.returningPatients || 0), 50)),
        200
      );
      return adminOverview.monthlyPatientGrowth.map((m) => ({
        month: m.month,
        newPatients: m.newPatients || 0,
        returningPatients: m.returningPatients || 0,
        total: m.total || 0,
        newPct: Math.min(100, Math.max(4, Math.round(((m.newPatients || 0) / maxVal) * 100))),
        retPct: Math.min(100, Math.max(4, Math.round(((m.returningPatients || 0) / maxVal) * 100))),
      }));
    }
    return [];
  }, [adminOverview]);

  if (isLoading && !adminOverview) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#087A50] animate-spin" />
        <p className="text-xs text-[#64748B] font-medium">Synchronizing live TriGyna administrative intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* =========================================================================
          ROW 1 — WELCOME HEADER (Greeting + Quick Action Dropdown)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight flex items-center gap-2">
            <span>{greetingTimeOfDay}, {adminFirstName}</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Here&apos;s what&apos;s happening at TriGyna today.
          </p>
        </div>

        {/* Quick Action Dropdown Button (Signature Forest Green) */}
        <div className="relative self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setQuickActionOpen(!quickActionOpen)}
            className="px-4 py-2.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Quick Action</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/80" />
          </button>

          {quickActionOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5EAF0] rounded-2xl shadow-xl p-1.5 z-40 text-xs animate-fade-in space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setQuickActionOpen(false);
                  if (onOpenRegisterPatient) onOpenRegisterPatient();
                  else onTabChange("patients");
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#E9F8F0] text-[#111827] hover:text-[#087A50] flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#087A50]" />
                <span>Add Patient</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickActionOpen(false);
                  setIsAddLeadModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#EFF6FF] text-[#111827] hover:text-[#2563EB] flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <Target className="w-4 h-4 text-[#2563EB]" />
                <span>Add Lead</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickActionOpen(false);
                  if (onOpenBookAppointment) onOpenBookAppointment();
                  else onTabChange("appointments");
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FFF7ED] text-[#111827] hover:text-[#D97706] flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4 text-[#D97706]" />
                <span>Book Appointment</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickActionOpen(false);
                  onTabChange("billing");
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FEF2F2] text-[#111827] hover:text-[#DC2626] flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-[#DC2626]" />
                <span>Create Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickActionOpen(false);
                  if (onOpenAddEmployee) onOpenAddEmployee();
                  else onTabChange("users");
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF5FF] text-[#111827] hover:text-[#9333EA] flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#9333EA]" />
                <span>Add Staff</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickActionOpen(false);
                  onTabChange("billing");
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#ECFDF5] text-[#111827] hover:text-[#059669] flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <IndianRupee className="w-4 h-4 text-[#059669]" />
                <span>Record Payment</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          ROW 2 — 5 KPI SUMMARY CARDS (Exact match to reference mockup)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Active Patients */}
        <div
          onClick={() => onTabChange("patients")}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs hover:border-[#087A50]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[#087A50]" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Active Patients</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#111827] tracking-tight">{totalPatients}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A36A]">
              <TrendingUp className="w-3 h-3" />
              <span>+12%</span>
            </span>
            <SparklineGreen />
          </div>
        </div>

        {/* KPI 2: Total Leads */}
        <div
          onClick={() => onTabChange("crm")}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs hover:border-[#3B82F6]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Total Leads</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#111827] tracking-tight">{totalLeads}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A36A]">
              <TrendingUp className="w-3 h-3" />
              <span>+8%</span>
            </span>
            <SparklineBlue />
          </div>
        </div>

        {/* KPI 3: Today's Appointments */}
        <div
          onClick={() => onTabChange("appointments")}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs hover:border-[#F97316]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#F97316]" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Today&apos;s Appointments</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#111827] tracking-tight">{apptsToday}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EF4444]">
              <TrendingDown className="w-3 h-3" />
              <span>-33%</span>
            </span>
            <SparklineOrange />
          </div>
        </div>

        {/* KPI 4: Pending Approvals */}
        <div
          onClick={() => onTabChange("approvals")}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs hover:border-[#A855F7]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#A855F7] flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-[#A855F7]" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Pending Approvals</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#111827] tracking-tight">{pendingApprovals}</span>
          </div>
          <div className="mt-2 flex items-center justify-end">
            <SparklinePurple />
          </div>
        </div>

        {/* KPI 5: Revenue (This Month) */}
        <div
          onClick={() => onTabChange("billing")}
          className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs hover:border-[#EF4444]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5 text-[#EF4444]" />
            </div>
            <span className="text-xs font-semibold text-[#64748B]">Revenue (This Month)</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#111827] tracking-tight">{formatINR(totalRevenue)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A36A]">
              <TrendingUp className="w-3 h-3" />
              <span>+18%</span>
            </span>
            <SparklineCoral />
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN MULTI-COLUMN LAYOUT (8 Columns Left, 4 Columns Right)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* =======================================================================
            LEFT COLUMN (8 of 12)
            ======================================================================= */}
        <div className="lg:col-span-8 space-y-5">
          {/* ROW 3 — BUSINESS ANALYTICS (Revenue Overview & Patient Growth) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD A: Revenue Overview */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#087A50]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Revenue Overview</h3>
                    <p className="text-[11px] text-[#64748B]">Collections, pending dues and invoices trend</p>
                  </div>
                </div>
                <div className="text-[11px] font-medium text-[#64748B] flex items-center gap-1 bg-[#F8FAFC] border border-[#E5EAF0] px-2 py-1 rounded-lg">
                  <span>Last 6 Months</span>
                  <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 mt-3 mb-4 text-[11px] font-medium text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#087A50]" />
                  <span>Collected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#86EFAC]" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#334155]" />
                  <span>Invoices</span>
                </div>
              </div>

              {/* SVG Bar Chart (Clean multi-month visualization) */}
              <div className="h-44 w-full flex items-end justify-between pt-6 px-1 relative">
                {/* Horizontal guide lines */}
                <div className="absolute inset-x-0 top-6 border-b border-[#E5EAF0]/60 pointer-events-none" />
                <div className="absolute inset-x-0 top-16 border-b border-[#E5EAF0]/60 pointer-events-none" />
                <div className="absolute inset-x-0 top-26 border-b border-[#E5EAF0]/60 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-6 border-b border-[#E5EAF0] pointer-events-none" />

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-[#94A3B8] font-mono pointer-events-none">
                  <span>₹4L</span>
                  <span>₹3L</span>
                  <span>₹2L</span>
                  <span>₹1L</span>
                  <span>₹0</span>
                </div>

                {/* Bars for 6 months (Dynamic from database analytics) */}
                <div className="flex-1 ml-7 flex items-end justify-around h-full pb-6">
                  {revenueSeries.length === 0 ? (
                    <div className="w-full text-center text-[11px] text-[#94A3B8] self-center">
                      Aggregating historical revenue data...
                    </div>
                  ) : (
                    revenueSeries.map((bar) => (
                      <div
                        key={bar.month}
                        title={`${bar.month}: Collected ₹${bar.collected.toLocaleString("en-IN")}, Pending ₹${bar.pending.toLocaleString("en-IN")}`}
                        className="flex flex-col items-center gap-1 group relative cursor-pointer"
                      >
                        <div className="flex items-end gap-1 h-32">
                          {/* Collected Bar */}
                          <div
                            style={{ height: `${bar.collectedPct}%` }}
                            className="w-4 sm:w-5 bg-[#087A50] rounded-t-sm transition-all group-hover:bg-[#075B3D]"
                          />
                          {/* Pending Bar */}
                          <div
                            style={{ height: `${bar.pendingPct}%` }}
                            className="w-4 sm:w-5 bg-[#86EFAC] rounded-t-sm transition-all group-hover:bg-[#6EE7B7]"
                          />
                        </div>
                        <span className="text-[10px] text-[#64748B] font-medium absolute -bottom-5">
                          {bar.month}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* CARD B: Patient Growth */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#087A50]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Patient Growth</h3>
                    <p className="text-[11px] text-[#64748B]">New vs returning patients</p>
                  </div>
                </div>
                <div className="text-[11px] font-medium text-[#64748B] flex items-center gap-1 bg-[#F8FAFC] border border-[#E5EAF0] px-2 py-1 rounded-lg">
                  <span>Last 6 Months</span>
                  <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 mt-3 mb-4 text-[11px] font-medium text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#087A50]" />
                  <span>New Patients</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#86EFAC]" />
                  <span>Returning Patients</span>
                </div>
              </div>

              {/* SVG Grouped Bar Chart */}
              <div className="h-44 w-full flex items-end justify-between pt-6 px-1 relative">
                {/* Horizontal guide lines */}
                <div className="absolute inset-x-0 top-6 border-b border-[#E5EAF0]/60 pointer-events-none" />
                <div className="absolute inset-x-0 top-16 border-b border-[#E5EAF0]/60 pointer-events-none" />
                <div className="absolute inset-x-0 top-26 border-b border-[#E5EAF0]/60 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-6 border-b border-[#E5EAF0] pointer-events-none" />

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-[#94A3B8] font-mono pointer-events-none">
                  <span>200</span>
                  <span>150</span>
                  <span>100</span>
                  <span>50</span>
                  <span>0</span>
                </div>

                {/* Bars for 6 months (Dynamic from database analytics) */}
                <div className="flex-1 ml-6 flex items-end justify-around h-full pb-6">
                  {patientGrowthSeries.length === 0 ? (
                    <div className="w-full text-center text-[11px] text-[#94A3B8] self-center">
                      Aggregating historical patient records...
                    </div>
                  ) : (
                    patientGrowthSeries.map((bar) => (
                      <div
                        key={bar.month}
                        title={`${bar.month}: ${bar.newPatients} New, ${bar.returningPatients} Returning`}
                        className="flex flex-col items-center gap-1 group relative cursor-pointer"
                      >
                        <div className="flex items-end gap-1 h-32">
                          {/* New Patients Bar */}
                          <div
                            style={{ height: `${bar.newPct}%` }}
                            className="w-4 sm:w-5 bg-[#087A50] rounded-t-sm transition-all group-hover:bg-[#075B3D]"
                          />
                          {/* Returning Patients Bar */}
                          <div
                            style={{ height: `${bar.retPct}%` }}
                            className="w-4 sm:w-5 bg-[#86EFAC] rounded-t-sm transition-all group-hover:bg-[#6EE7B7]"
                          />
                        </div>
                        <span className="text-[10px] text-[#64748B] font-medium absolute -bottom-5">
                          {bar.month}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4 — CRM AND APPOINTMENT ANALYTICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD A: CRM Lead Pipeline */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-[#087A50]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">CRM Lead Pipeline</h3>
                    <p className="text-[11px] text-[#64748B]">Track and convert leads into patients</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange("crm")}
                  className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Pipeline Stages (Chevrons with real dynamic counts from database) */}
              <div className="mt-5 grid grid-cols-4 gap-2">
                {/* 1. New Inquiries */}
                <div className="bg-[#F0F7FF] border border-[#DCEBFE] rounded-xl p-2.5 flex flex-col justify-between relative group hover:border-[#3B82F6] transition-colors">
                  <div>
                    <span className="text-[10px] font-semibold text-[#2563EB] block truncate">New Inquiries</span>
                    <span className="text-xl font-bold text-[#111827] mt-1 block">{crmCounts.new}</span>
                  </div>
                  <div className="mt-2.5 flex items-center">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">P</div>
                      <div className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">R</div>
                    </div>
                    <span className="text-[9px] text-[#64748B] ml-1 font-medium truncate">
                      {crmCounts.new > 2 ? `+${crmCounts.new - 2} more` : `${crmCounts.new} leads`}
                    </span>
                  </div>
                  <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 hidden sm:block text-[#94A3B8] z-10">
                    ›
                  </div>
                </div>

                {/* 2. Contacted */}
                <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-2.5 flex flex-col justify-between relative group hover:border-[#16A34A] transition-colors">
                  <div>
                    <span className="text-[10px] font-semibold text-[#16A34A] block truncate">Contacted</span>
                    <span className="text-xl font-bold text-[#111827] mt-1 block">{crmCounts.contacted}</span>
                  </div>
                  <div className="mt-2.5 flex items-center">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">S</div>
                      <div className="w-4 h-4 rounded-full bg-teal-500 text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">M</div>
                    </div>
                    <span className="text-[9px] text-[#64748B] ml-1 font-medium truncate">
                      {crmCounts.contacted > 2 ? `+${crmCounts.contacted - 2} more` : `${crmCounts.contacted} leads`}
                    </span>
                  </div>
                  <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 hidden sm:block text-[#94A3B8] z-10">
                    ›
                  </div>
                </div>

                {/* 3. Qualified */}
                <div className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-xl p-2.5 flex flex-col justify-between relative group hover:border-[#A855F7] transition-colors">
                  <div>
                    <span className="text-[10px] font-semibold text-[#9333EA] block truncate">Qualified</span>
                    <span className="text-xl font-bold text-[#111827] mt-1 block">{crmCounts.qualified}</span>
                  </div>
                  <div className="mt-2.5 flex items-center">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-4 h-4 rounded-full bg-purple-500 text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">K</div>
                      <div className="w-4 h-4 rounded-full bg-fuchsia-500 text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">A</div>
                    </div>
                    <span className="text-[9px] text-[#64748B] ml-1 font-medium truncate">
                      {crmCounts.qualified > 2 ? `+${crmCounts.qualified - 2} more` : `${crmCounts.qualified} leads`}
                    </span>
                  </div>
                  <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 hidden sm:block text-[#94A3B8] z-10">
                    ›
                  </div>
                </div>

                {/* 4. Converted */}
                <div className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-xl p-2.5 flex flex-col justify-between relative group hover:border-[#087A50] transition-colors">
                  <div>
                    <span className="text-[10px] font-semibold text-[#087A50] block truncate">Converted</span>
                    <span className="text-xl font-bold text-[#111827] mt-1 block">{crmCounts.converted}</span>
                  </div>
                  <div className="mt-2.5 flex items-center">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-4 h-4 rounded-full bg-[#087A50] text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">N</div>
                      <div className="w-4 h-4 rounded-full bg-green-600 text-white text-[8px] flex items-center justify-center font-bold ring-1 ring-white">R</div>
                    </div>
                    <span className="text-[9px] text-[#64748B] ml-1 font-medium truncate">
                      {crmCounts.converted > 2 ? `+${crmCounts.converted - 2} more` : `${crmCounts.converted} converted`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD B: Appointment Status (Donut Chart) */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-[#087A50]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Appointment Status</h3>
                    <p className="text-[11px] text-[#64748B]">Today&apos;s appointment distribution</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange("appointments")}
                  className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Donut Chart + Legend */}
              <div className="mt-4 flex items-center justify-between">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    {/* Background ring */}
                    <path
                      className="text-[#F1F5F9]"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {apptDistribution.total > 0 && (
                      <>
                        {/* Completed (Green) */}
                        {apptDistribution.completed.percentage > 0 && (
                          <path
                            className="text-[#16A36A]"
                            strokeDasharray={`${apptDistribution.completed.percentage}, 100`}
                            strokeDashoffset="0"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        )}
                        {/* In Consultation (Blue) */}
                        {apptDistribution.inConsultation.percentage > 0 && (
                          <path
                            className="text-[#38BDF8]"
                            strokeDasharray={`${apptDistribution.inConsultation.percentage}, 100`}
                            strokeDashoffset={-apptDistribution.completed.percentage}
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        )}
                        {/* Upcoming (Orange) */}
                        {apptDistribution.upcoming.percentage > 0 && (
                          <path
                            className="text-[#F97316]"
                            strokeDasharray={`${apptDistribution.upcoming.percentage}, 100`}
                            strokeDashoffset={-(apptDistribution.completed.percentage + apptDistribution.inConsultation.percentage)}
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        )}
                        {/* Cancelled (Red) */}
                        {apptDistribution.cancelled.percentage > 0 && (
                          <path
                            className="text-[#EF4444]"
                            strokeDasharray={`${apptDistribution.cancelled.percentage}, 100`}
                            strokeDashoffset={-(apptDistribution.completed.percentage + apptDistribution.inConsultation.percentage + apptDistribution.upcoming.percentage)}
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        )}
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-lg font-bold text-[#111827] leading-none">{apptDistribution.total}</span>
                    <span className="text-[9px] text-[#64748B] font-medium mt-0.5 leading-none">Total Today</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-1.5 text-xs text-[#111827] pl-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#16A36A]" />
                      <span className="text-[#64748B] text-[11px]">Completed</span>
                    </div>
                    <span className="font-semibold text-[11px]">{apptDistribution.completed.count} ({apptDistribution.completed.percentage}%)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                      <span className="text-[#64748B] text-[11px]">In Consultation</span>
                    </div>
                    <span className="font-semibold text-[11px]">{apptDistribution.inConsultation.count} ({apptDistribution.inConsultation.percentage}%)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                      <span className="text-[#64748B] text-[11px]">Upcoming</span>
                    </div>
                    <span className="font-semibold text-[11px]">{apptDistribution.upcoming.count} ({apptDistribution.upcoming.percentage}%)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      <span className="text-[#64748B] text-[11px]">Cancelled</span>
                    </div>
                    <span className="font-semibold text-[11px]">{apptDistribution.cancelled.count} ({apptDistribution.cancelled.percentage}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 5 — OPERATIONAL DATA (Recent Patients Table & Pending Actions Checklist) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD A: Recent Patients */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[#087A50]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#111827]">Recent Patients</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange("patients")}
                    className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5EAF0] text-[#94A3B8] text-[11px] font-semibold">
                        <th className="pb-2.5 font-medium">Name</th>
                        <th className="pb-2.5 font-medium">Phone</th>
                        <th className="pb-2.5 font-medium">Service</th>
                        <th className="pb-2.5 font-medium">Status</th>
                        <th className="pb-2.5 font-medium text-right">Last Visit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]/60">
                      {recentPatients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-[#94A3B8]">
                            No patient registrations found in database
                          </td>
                        </tr>
                      ) : (
                        recentPatients.map((p, idx) => (
                          <tr key={p._id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-2.5 pr-2 font-semibold text-[#111827] flex items-center gap-2 truncate max-w-[130px]">
                              <div className="w-6 h-6 rounded-full bg-[#E9F8F0] text-[#087A50] text-[10px] font-bold flex items-center justify-center shrink-0">
                                {p.fullName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate">{p.fullName}</span>
                            </td>
                            <td className="py-2.5 pr-2 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                              {p.phone}
                            </td>
                            <td className="py-2.5 pr-2 text-[#111827] text-[11px] truncate max-w-[110px]">
                              {p.service}
                            </td>
                            <td className="py-2.5 pr-2 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]">
                                {p.status || "Active"}
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-[#64748B] text-[11px] whitespace-nowrap">
                              {p.lastVisit}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* CARD B: Pending Actions */}
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF5FF] text-[#A855F7] flex items-center justify-center shrink-0">
                      <CheckSquare className="w-4 h-4 text-[#A855F7]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#111827]">Pending Actions</h3>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#EF4444] text-white">
                        {pendingActionsList.length}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange("approvals")}
                    className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5 mt-2">
                  <div className="grid grid-cols-12 text-[11px] font-semibold text-[#94A3B8] pb-1 border-b border-[#E5EAF0]">
                    <span className="col-span-7">Task</span>
                    <span className="col-span-3">Type</span>
                    <span className="col-span-2 text-right">Due In</span>
                  </div>

                  {pendingActionsList.length === 0 ? (
                    <div className="py-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                      <CheckCircle2 className="w-5 h-5 text-[#16A36A] mx-auto mb-1" />
                      <p className="text-xs font-bold text-[#111827]">All Queues Clear</p>
                      <p className="text-[11px] text-[#64748B]">No pending administrative actions require review</p>
                    </div>
                  ) : (
                    pendingActionsList.map((item) => {
                      const isDone = !!completedTaskIds[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`grid grid-cols-12 items-center py-1.5 text-xs transition-opacity ${
                            isDone ? "opacity-40" : ""
                          }`}
                        >
                          <div className="col-span-7 flex items-center gap-2 pr-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => toggleTaskCompleted(item.id, item.title)}
                              className="w-4 h-4 rounded text-[#087A50] focus:ring-[#087A50] border-[#CBD5E1] cursor-pointer shrink-0"
                            />
                            <span
                              onClick={() => toggleTaskCompleted(item.id, item.title)}
                              className={`truncate text-[#111827] cursor-pointer font-medium ${
                                isDone ? "line-through text-[#94A3B8]" : ""
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>

                          <div className="col-span-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.typeColor}`}>
                              {item.type}
                            </span>
                          </div>

                          <div className="col-span-2 text-right text-[11px] text-[#64748B] whitespace-nowrap">
                            {item.due}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            RIGHT COLUMN (4 of 12) — Schedule & Recent Activities
            ======================================================================= */}
        <div className="lg:col-span-4 space-y-5">
          {/* CARD A: Today's Schedule */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#087A50]" />
                <h3 className="text-sm font-bold text-[#111827]">Today&apos;s Schedule</h3>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("calendar")}
                className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View Calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Date subtitle & appointment count */}
            <div className="flex items-center justify-between mt-3 mb-4">
              <span className="text-xs font-bold text-[#111827]">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="text-[10px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#DBEAFE]">
                {scheduleItems.length} {scheduleItems.length === 1 ? "Appointment" : "Appointments"}
              </span>
            </div>

            {/* Timeline items list */}
            <div className="space-y-4">
              {scheduleItems.length === 0 ? (
                <div className="py-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] space-y-2">
                  <Calendar className="w-5 h-5 text-[#94A3B8] mx-auto" />
                  <p className="text-xs font-bold text-[#111827]">No Appointments Scheduled Today</p>
                  <p className="text-[11px] text-[#64748B]">New clinical appointments will appear here automatically</p>
                  <button
                    type="button"
                    onClick={() => onTabChange("appointments")}
                    className="mt-1 inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#087A50] bg-[#E9F8F0] rounded-xl hover:bg-[#D1F2E0] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Book Appointment</span>
                  </button>
                </div>
              ) : (
                scheduleItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-start justify-between gap-2 text-xs">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-[11px] text-[#64748B] font-mono whitespace-nowrap pt-0.5 w-14">
                        {item.time}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[#F1F5F9] text-[#475569] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {item.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#111827] truncate leading-tight">{item.patientName}</p>
                        <p className="text-[11px] text-[#64748B] truncate leading-tight mt-0.5">{item.service}</p>
                        <p className="text-[10px] text-[#087A50] truncate leading-tight mt-0.5 font-medium">
                          {item.doctorName}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        item.status === "Completed"
                          ? "bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]"
                          : item.status === "In Consultation"
                          ? "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]"
                          : "bg-[#FFF7ED] text-[#D97706] border border-[#FED7AA]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Full Schedule link */}
            <div className="mt-5 pt-3 border-t border-[#E5EAF0] text-center">
              <button
                type="button"
                onClick={() => onTabChange("appointments")}
                className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center justify-center gap-1 w-full cursor-pointer transition-colors"
              >
                <span>View Full Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD B: Recent Activities */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#087A50]" />
                <h3 className="text-sm font-bold text-[#111827]">Recent Activities</h3>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("audit")}
                className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Activities Timeline list (Real audit events from database) */}
            <div className="space-y-4 mt-4">
              {recentActivities.length === 0 ? (
                <div className="py-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                  <Activity className="w-5 h-5 text-[#94A3B8] mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#111827]">No Recent Audit Logs</p>
                  <p className="text-[11px] text-[#64748B]">Operational events will appear here in real time</p>
                </div>
              ) : (
                recentActivities.slice(0, 5).map((act) => {
                  const { title, desc, icon: Icon, color } = formatAuditActivity(act);
                  const timeFormatted = formatRelativeTime(act.timestamp);
                  return (
                    <div key={act._id} className="flex items-start gap-3 text-xs">
                      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#111827] leading-tight truncate">{title}</p>
                        <p className="text-[11px] text-[#64748B] leading-tight mt-0.5 truncate">{desc}</p>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] font-mono shrink-0 whitespace-nowrap">
                        {timeFormatted}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD LEAD */}
      <ModalPortal isOpen={isAddLeadModalOpen} onClose={() => setIsAddLeadModalOpen(false)}>
        <div className="bg-white border border-[#E5EAF0] rounded-2xl p-6 max-w-md w-full shadow-2xl font-sans max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EAF0]">
            <h3 className="text-base font-bold text-[#111827]">Add New Clinical Lead</h3>
            <button
              type="button"
              onClick={() => setIsAddLeadModalOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateLead} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newLeadForm.fullName}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, fullName: e.target.value })}
                placeholder="e.g. Ananya Sharma"
                className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={newLeadForm.email}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                placeholder="patient@example.com"
                className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl focus:ring-2 focus:ring-[#087A50] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Service Interest</label>
              <select
                value={newLeadForm.serviceInterest}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, serviceInterest: e.target.value })}
                className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#087A50]"
              >
                <option value="PCOD / PCOS Consultation">PCOD / PCOS Consultation</option>
                <option value="Skin & Hair Care">Skin &amp; Hair Care</option>
                <option value="Homoeopathy Consultation">Homoeopathy Consultation</option>
                <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Lead Source</label>
              <select
                value={newLeadForm.source}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                className="w-full px-3.5 py-2 border border-[#E5EAF0] rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#087A50]"
              >
                <option value="website_enquiry">Website Enquiry</option>
                <option value="whatsapp">WhatsApp Business</option>
                <option value="instagram_ad">Instagram / Meta Ad</option>
                <option value="google_search">Google Search</option>
                <option value="referral">Doctor / Patient Referral</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#E5EAF0]">
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingLead}
                className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isSubmittingLead ? "Registering..." : "Add Lead"}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>
    </div>
  );
}

export default AdminOverviewExact;
