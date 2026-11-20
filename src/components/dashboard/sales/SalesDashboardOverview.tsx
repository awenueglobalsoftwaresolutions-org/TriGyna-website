"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  IndianRupee,
  TrendingUp,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Check,
  ChevronRight,
  GitBranch,
  Video,
  Sparkles,
  Search,
  X,
  Share2,
  ArrowDown,
  MessageCircle,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";
import { SalesLead, SalesLeadDrawer } from "./SalesLeadDrawer";

interface KpiData {
  value: number;
  formatted?: string;
  delta: string;
  deltaPeriod: string;
  isPositive: boolean;
}

interface TodaysTask {
  _id: string;
  leadId?: string;
  leadName?: string;
  title: string;
  time: string;
  icon?: string;
  priority?: string;
  status: "open" | "completed";
}

interface UpcomingAppointment {
  _id: string;
  patientName: string;
  serviceName: string;
  time: string;
  status: "confirmed" | "pending";
  mode?: string;
  meetingLink?: string;
  dotColor?: string;
}

interface LeadsSourceItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface FunnelStage {
  stage: string;
  count: number;
  color: string;
}

interface RecentActivity {
  _id: string;
  title: string;
  timeAgo: string;
  type: string;
}

interface DashboardApiResponse {
  kpis: {
    totalLeads: KpiData;
    convertedPatients: KpiData;
    pendingFollowUps: KpiData;
    appointmentsBooked: KpiData;
    revenueGenerated: KpiData;
  };
  pipeline: {
    new: SalesLead[];
    contacted: SalesLead[];
    interested: SalesLead[];
    appointment: SalesLead[];
    converted: SalesLead[];
  };
  stageCounts: {
    new: number;
    contacted: number;
    interested: number;
    appointment: number;
    converted: number;
  };
  todaysTasks: TodaysTask[];
  upcomingAppointments: UpcomingAppointment[];
  leadsSource: {
    total: number;
    items: LeadsSourceItem[];
  };
  conversionFunnel: FunnelStage[];
  recentActivities: RecentActivity[];
}

interface SalesDashboardOverviewProps {
  showNotification: (msg: string, isError?: boolean) => void;
  dateRange: string;
  searchQuery: string;
  onOpenAddLeadModal: () => void;
  isAddLeadModalOpen: boolean;
  onCloseAddLeadModal: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function SalesDashboardOverview({
  showNotification,
  dateRange,
  searchQuery,
  onOpenAddLeadModal,
  isAddLeadModalOpen,
  onCloseAddLeadModal,
  onNavigateTab,
}: SalesDashboardOverviewProps) {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Daily Work Queue Priority Filter State (Docs/Sales Workflow.md Section 3.2)
  const [priorityQueueFilter, setPriorityQueueFilter] = useState<string>("all");

  // Mark Lost Modal State
  const [leadToMarkLost, setLeadToMarkLost] = useState<SalesLead | null>(null);
  const [markLostReason, setMarkLostReason] = useState<string>("Price too high / Financial constraints");
  const [customLostReason, setCustomLostReason] = useState<string>("");
  const [isSubmittingLost, setIsSubmittingLost] = useState<boolean>(false);

  // Local task completion toggle state
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  // Add lead form state
  const [newLeadForm, setNewLeadForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    serviceInterest: "PCOD Consultation",
    source: "website_enquiry",
    priority: "medium",
    notes: "",
  });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Fetch Dashboard Data from backend
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (dateRange === "today") params.append("dateRange", "today");
      else if (dateRange === "week") params.append("dateRange", "week");
      else if (dateRange === "month") params.append("dateRange", "month");

      const res = await api.get<DashboardApiResponse>(`/crm/sales-dashboard?${params.toString()}`);
      if (res.data) {
        setData(res.data);
      }
    } catch {
      showNotification("Failed to load sales pipeline metrics", true);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, searchQuery, showNotification]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle task checkbox toggle
  const handleToggleTask = async (task: TodaysTask) => {
    const isNowCompleted = !completedTaskIds[task._id];
    setCompletedTaskIds((prev) => ({ ...prev, [task._id]: isNowCompleted }));

    if (task.leadId && !task._id.startsWith("task_sample_") && !task._id.startsWith("default_")) {
      try {
        await api.patch(`/crm/leads/${task.leadId}/tasks/${task._id}`, {
          status: isNowCompleted ? "completed" : "open",
        });
        showNotification(isNowCompleted ? `Task completed: ${task.title}` : `Task reopened: ${task.title}`);
      } catch {
        // Fallback silently if sample ID
      }
    } else {
      showNotification(isNowCompleted ? `Marked done: ${task.title}` : `Reopened: ${task.title}`);
    }
  };

  // Handle Create Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.fullName.trim() || !newLeadForm.phone.trim()) {
      showNotification("Full name and 10-digit phone number are required", true);
      return;
    }

    try {
      setIsSubmittingLead(true);
      await api.post("/crm/leads", {
        ...newLeadForm,
        consultationMode: "Online Video Consultation",
      });
      showNotification(`Lead added: ${newLeadForm.fullName}!`);
      onCloseAddLeadModal();
      setNewLeadForm({
        fullName: "",
        phone: "",
        email: "",
        serviceInterest: "PCOD Consultation",
        source: "website_enquiry",
        priority: "medium",
        notes: "",
      });
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating lead";
      showNotification(msg, true);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Filter pipeline cards by serviceFilter and priorityQueueFilter
  const filteredPipeline = useMemo(() => {
    if (!data?.pipeline) return null;

    const filterFn = (l: SalesLead) => {
      // 1. Service filter
      if (serviceFilter !== "all") {
        if (!l.serviceInterest.toLowerCase().includes(serviceFilter.toLowerCase())) {
          return false;
        }
      }
      // 2. Daily Work Queue priority filter
      if (priorityQueueFilter === "overdue") {
        return l.priority === "high" || l.status === "contacted";
      }
      if (priorityQueueFilter === "new_inquiry") {
        return l.status === "new";
      }
      if (priorityQueueFilter === "payment_pending") {
        return (
          l.status === "awaiting_payment" ||
          l.status === "interested" ||
          l.serviceInterest.toLowerCase().includes("package")
        );
      }
      if (priorityQueueFilter === "high_value") {
        return (l.score !== undefined && l.score >= 70) || l.priority === "high";
      }
      if (priorityQueueFilter === "today_scheduled") {
        return l.status === "appointment" || l.status === "contacted";
      }
      if (priorityQueueFilter === "lab_results") {
        const s = l.serviceInterest.toLowerCase();
        return s.includes("pcod") || s.includes("pcos") || s.includes("diet") || s.includes("fertility");
      }
      return true;
    };

    return {
      new: data.pipeline.new.filter(filterFn),
      contacted: data.pipeline.contacted.filter(filterFn),
      interested: data.pipeline.interested.filter(filterFn),
      appointment: data.pipeline.appointment.filter(filterFn),
      converted: data.pipeline.converted.filter(filterFn),
    };
  }, [data?.pipeline, serviceFilter, priorityQueueFilter]);

  // Submit Mark Lost with mandatory reason
  const handleConfirmMarkLost = async () => {
    if (!leadToMarkLost) return;
    const finalReason =
      markLostReason === "Other"
        ? customLostReason.trim() || "Unspecified loss reason"
        : markLostReason;

    try {
      setIsSubmittingLost(true);
      await api.post(`/crm/leads/${leadToMarkLost._id}/mark-lost`, {
        lostReason: finalReason,
      });
      showNotification(`Lead ${leadToMarkLost.fullName} marked as lost (${finalReason})`);
      setLeadToMarkLost(null);
      setCustomLostReason("");
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark lead as lost";
      showNotification(msg, true);
    } finally {
      setIsSubmittingLost(false);
    }
  };

  // Greeting name
  const greetingName = user?.name ? user.name.split(" ")[0] : "Sushil";

  // Drag-and-drop & manual stage transition handler with optimistic UI updates
  const handleMoveLeadStage = async (leadId: string, targetStage: string, fromStage?: string) => {
    if (!leadId || !targetStage) return;

    let targetLead: SalesLead | undefined;
    if (data?.pipeline) {
      for (const st of ["new", "contacted", "interested", "appointment", "converted"] as const) {
        const found = data.pipeline[st]?.find((l) => l._id === leadId);
        if (found) {
          targetLead = found;
          break;
        }
      }
    }

    const stageLabels: Record<string, string> = {
      new: "New Leads",
      contacted: "Contacted",
      interested: "Interested",
      appointment: "Appointment",
      converted: "Converted",
    };

    // Optimistic UI state update
    const prevData = data;
    if (data?.pipeline) {
      const updatedPipeline = { ...data.pipeline };
      let movedLead: SalesLead | null = null;

      for (const st of ["new", "contacted", "interested", "appointment", "converted"] as const) {
        const idx = updatedPipeline[st].findIndex((l) => l._id === leadId);
        if (idx !== -1) {
          movedLead = { ...updatedPipeline[st][idx], status: targetStage };
          updatedPipeline[st] = updatedPipeline[st].filter((l) => l._id !== leadId);
          break;
        }
      }

      if (movedLead && targetStage in updatedPipeline) {
        const tKey = targetStage as keyof typeof updatedPipeline;
        updatedPipeline[tKey] = [movedLead, ...updatedPipeline[tKey]];
        const fromKey = (fromStage || "new") as keyof typeof data.stageCounts;
        const targetKey = targetStage as keyof typeof data.stageCounts;
        setData({
          ...data,
          pipeline: updatedPipeline,
          stageCounts: {
            ...data.stageCounts,
            [fromKey]: Math.max(0, (data.stageCounts[fromKey] || 1) - 1),
            [targetKey]: (data.stageCounts[targetKey] || 0) + 1,
          },
        });
      }
    }

    try {
      await api.patch(`/crm/leads/${leadId}/stage`, { status: targetStage });
      showNotification(`Moved ${targetLead?.fullName || "Lead"} to ${stageLabels[targetStage] || targetStage}`);
      fetchDashboardData();
    } catch (err: unknown) {
      if (prevData) setData(prevData);
      const msg = err instanceof Error ? err.message : "Failed to update lead stage";
      showNotification(msg, true);
    }
  };

  // Quick Advance Stage
  const handleQuickAdvance = async (leadId: string, currentCol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMap: Record<string, string> = {
      new: "contacted",
      contacted: "interested",
      interested: "appointment",
      appointment: "converted",
    };
    const nextStage = nextMap[currentCol];
    if (!nextStage) return;
    await handleMoveLeadStage(leadId, nextStage, currentCol);
  };

  if (isLoading && !data) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#16A34A] animate-spin" />
        <p className="text-xs text-gray-500 font-medium">Loading TriGyna Sales Pipeline &amp; Real-time KPIs...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalLeads: { value: 128, delta: "+12%", deltaPeriod: "vs last month", isPositive: true },
    convertedPatients: { value: 32, delta: "+18%", deltaPeriod: "vs last month", isPositive: true },
    pendingFollowUps: { value: 24, delta: "+5%", deltaPeriod: "vs last month", isPositive: false },
    appointmentsBooked: { value: 18, delta: "+20%", deltaPeriod: "vs last month", isPositive: true },
    revenueGenerated: { value: 128000, formatted: "₹1,28,000", delta: "+28%", deltaPeriod: "vs last month", isPositive: true },
  };

  const stageCounts = data?.stageCounts || {
    new: 36,
    contacted: 28,
    interested: 18,
    appointment: 12,
    converted: 34,
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Greeting Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
          Good Morning, {greetingName} 👋
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          Here&apos;s your sales overview for today. Keep connecting and making a healthier tomorrow.
        </p>
      </div>

      {/* 2. Top 5 KPI Cards Row (Interactive: Click to jump to dedicated tab) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Leads */}
        <div
          onClick={() => onNavigateTab?.("leads")}
          title="Click to view Leads Pipeline"
          className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#BBF7D0] flex items-center justify-center text-[#16A34A] shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">Total Leads</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight">
                {kpis.totalLeads.value}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-[#16A34A]">↗ {kpis.totalLeads.delta}</span>
            <span className="text-[#64748B]">{kpis.totalLeads.deltaPeriod}</span>
          </div>
        </div>

        {/* KPI 2: Converted Patients */}
        <div
          onClick={() => onNavigateTab?.("patients")}
          title="Click to view Converted Patients"
          className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">Converted Patients</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight">
                {kpis.convertedPatients.value}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-[#16A34A]">↗ {kpis.convertedPatients.delta}</span>
            <span className="text-[#64748B]">{kpis.convertedPatients.deltaPeriod}</span>
          </div>
        </div>

        {/* KPI 3: Pending Follow-ups */}
        <div
          onClick={() => onNavigateTab?.("followups")}
          title="Click to view Pending Follow-ups"
          className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">Pending Follow-ups</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight">
                {kpis.pendingFollowUps.value}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-[#DC2626]">↗ {kpis.pendingFollowUps.delta}</span>
            <span className="text-[#64748B]">{kpis.pendingFollowUps.deltaPeriod}</span>
          </div>
        </div>

        {/* KPI 4: Appointments Booked */}
        <div
          onClick={() => onNavigateTab?.("appointments")}
          title="Click to view Booked Appointments"
          className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#E9D5FF] flex items-center justify-center text-[#9333EA] shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">Appointments Booked</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight">
                {kpis.appointmentsBooked.value}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-[#16A34A]">↗ {kpis.appointmentsBooked.delta}</span>
            <span className="text-[#64748B]">{kpis.appointmentsBooked.deltaPeriod}</span>
          </div>
        </div>

        {/* KPI 5: Revenue Generated */}
        <div
          onClick={() => onNavigateTab?.("invoices")}
          title="Click to view Revenue & Invoices"
          className="bg-[#FFF1F2] border border-[#FFE4E6] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer col-span-2 sm:col-span-1 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#FECDD3] flex items-center justify-center text-[#E11D48] shrink-0 group-hover:scale-105 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block">Revenue Generated</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight">
                {kpis.revenueGenerated.formatted || `₹${(kpis.revenueGenerated.value).toLocaleString("en-IN")}`}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-[#16A34A]">↗ {kpis.revenueGenerated.delta}</span>
            <span className="text-[#64748B]">{kpis.revenueGenerated.deltaPeriod}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid: Left 70% Pipeline + Right 30% Stacked Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Section: Sales Pipeline Kanban (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col relative">
          {/* Backdrop for 3-dots Card Menu */}
          {activeCardMenuId && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => setActiveCardMenuId(null)}
            />
          )}

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-tight">
                  Sales Pipeline
                </h3>
                <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5">
                  Drag your drop leads to update their stage
                </p>
              </div>
            </div>

            {/* Controls: View mode + Filter + View All */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center bg-[#F1F5F9] rounded-xl p-1 text-xs font-semibold text-gray-700">
                <span className="px-3 py-1 rounded-lg bg-white shadow-2xs font-bold text-gray-800">
                  View: Kanban
                </span>
              </div>

              {/* Filter Popover Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ${
                    serviceFilter !== "all"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-[#CBD5E1] bg-white hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-gray-500" />
                  <span>{serviceFilter === "all" ? "Filter" : serviceFilter}</span>
                  {serviceFilter !== "all" && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setServiceFilter("all");
                      }}
                      className="ml-1 text-xs font-bold hover:text-red-600"
                    >
                      &times;
                    </span>
                  )}
                </button>

                {filterMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-[#CBD5E1] rounded-2xl shadow-xl p-2.5 z-30 space-y-1 text-xs animate-fade-in">
                    <span className="font-bold text-gray-800 block text-[10px] uppercase px-2 py-1">
                      Filter By Clinical Service
                    </span>
                    {["all", "PCOD", "Skin", "Hair", "Diet", "PCOS", "Fertility"].map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => {
                          setServiceFilter(srv);
                          setFilterMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition ${
                          serviceFilter === srv
                            ? "bg-[#DCFCE7] text-[#15803D] font-bold"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {srv === "all" ? "All Services" : `${srv} Consultation`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View All Button */}
              <button
                type="button"
                onClick={() => onNavigateTab?.("leads")}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 border border-emerald-200/80 hover:border-emerald-400 text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                title="View All Leads & Pipeline in Directory"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>
          </div>

          {/* 5 Kanban Columns with Drag and Drop & Smooth Horizontal Sizing */}
          <div className="overflow-x-auto pb-2 pt-1 -mx-2 px-2 select-none scrollbar-thin">
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-[880px] lg:min-w-full">
              {[
                {
                  key: "new" as const,
                  title: "New Leads",
                  count: stageCounts.new,
                  headerBg: "bg-[#F1F5F9]",
                  headerText: "text-[#0F172A]",
                  avatarBg: "bg-[#EDE9FE]",
                  avatarText: "text-[#7C3AED]",
                  pillBg: "bg-[#DCFCE7]",
                  pillText: "text-[#15803D]",
                  pillLabel: "New",
                  accentBorder: "hover:border-[#16A34A]/50",
                },
                {
                  key: "contacted" as const,
                  title: "Contacted",
                  count: stageCounts.contacted,
                  headerBg: "bg-[#E0F2FE]",
                  headerText: "text-[#0369A1]",
                  avatarBg: "bg-[#DBEAFE]",
                  avatarText: "text-[#1D4ED8]",
                  pillBg: "bg-[#DBEAFE]",
                  pillText: "text-[#1D4ED8]",
                  pillLabel: "Contacted",
                  accentBorder: "hover:border-[#2563EB]/50",
                },
                {
                  key: "interested" as const,
                  title: "Interested",
                  count: stageCounts.interested,
                  headerBg: "bg-[#FEF3C7]",
                  headerText: "text-[#B45309]",
                  avatarBg: "bg-[#EDE9FE]",
                  avatarText: "text-[#7C3AED]",
                  pillBg: "bg-[#FEF3C7]",
                  pillText: "text-[#B45309]",
                  pillLabel: "Interested",
                  accentBorder: "hover:border-[#D97706]/50",
                },
                {
                  key: "appointment" as const,
                  title: "Appointment",
                  count: stageCounts.appointment,
                  headerBg: "bg-[#EDE9FE]",
                  headerText: "text-[#6D28D9]",
                  avatarBg: "bg-[#EDE9FE]",
                  avatarText: "text-[#6D28D9]",
                  pillBg: "bg-[#EDE9FE]",
                  pillText: "text-[#6D28D9]",
                  pillLabel: "Booked",
                  accentBorder: "hover:border-[#7C3AED]/50",
                },
                {
                  key: "converted" as const,
                  title: "Converted",
                  count: stageCounts.converted,
                  headerBg: "bg-[#DCFCE7]",
                  headerText: "text-[#15803D]",
                  avatarBg: "bg-[#DCFCE7]",
                  avatarText: "text-[#15803D]",
                  pillBg: "bg-[#DCFCE7]",
                  pillText: "text-[#15803D]",
                  pillLabel: "Converted",
                  accentBorder: "hover:border-[#16A34A]/50",
                },
              ].map((col) => {
                const isOver = dragOverStage === col.key;
                const columnLeads = filteredPipeline?.[col.key] || [];

                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverStage !== col.key) {
                        setDragOverStage(col.key);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverStage(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const leadId = e.dataTransfer.getData("leadId");
                      const fromStage = e.dataTransfer.getData("fromStage");
                      setDragOverStage(null);
                      setDraggingLeadId(null);
                      if (!leadId || fromStage === col.key) return;
                      handleMoveLeadStage(leadId, col.key, fromStage);
                    }}
                    className={`flex-1 min-w-[165px] flex flex-col rounded-2xl transition-all duration-200 ${
                      isOver
                        ? "bg-emerald-50/70 ring-2 ring-emerald-500/80 shadow-md"
                        : "bg-transparent"
                    }`}
                  >
                    {/* Column Header Pill */}
                    <div
                      className={`${col.headerBg} py-2 px-3 rounded-xl text-center mb-2 shadow-2xs flex items-center justify-center gap-1.5`}
                    >
                      <span className={`text-xs font-bold ${col.headerText}`}>
                        {col.title} ({col.count})
                      </span>
                    </div>

                    {/* Drop placeholder indicator */}
                    {isOver && (
                      <div className="p-3 mb-2 rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-100/50 text-center text-[11px] font-bold text-emerald-800 animate-pulse flex items-center justify-center gap-1">
                        <ArrowDown className="w-3.5 h-3.5 text-emerald-700" /> Drop to {col.title}
                      </div>
                    )}

                    {/* Cards List: Exactly 4 rows visible with smooth vertical scroll */}
                    <div className="h-[372px] max-h-[372px] overflow-y-auto pr-1 space-y-2 flex-1 [scrollbar-width:thin] [scrollbar-color:#E2E8F0_transparent]">
                      {columnLeads.length === 0 ? (
                        <div className="h-full border-2 border-dashed border-gray-200/80 rounded-2xl flex flex-col items-center justify-center text-center p-4 text-gray-400 bg-gray-50/40">
                          <p className="text-[11px] font-semibold text-gray-500">No leads in {col.title}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Drag leads here to update stage</p>
                        </div>
                      ) : (
                        <>
                          {columnLeads.map((lead) => {
                            const isBeingDragged = draggingLeadId === lead._id;
                            const isMenuOpen = activeCardMenuId === lead._id;

                            return (
                              <div
                                key={lead._id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("leadId", lead._id);
                                  e.dataTransfer.setData("fromStage", col.key);
                                  e.dataTransfer.effectAllowed = "move";
                                  setDraggingLeadId(lead._id);
                                }}
                                onDragEnd={() => {
                                  setDraggingLeadId(null);
                                  setDragOverStage(null);
                                }}
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDrawerOpen(true);
                                }}
                                className={`bg-white border border-[#E2E8F0] rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:shadow-md ${
                                  col.accentBorder
                                } transition-all cursor-grab active:cursor-grabbing group relative shrink-0 ${
                                  isBeingDragged ? "opacity-35 scale-95 border-emerald-400 border-dashed" : ""
                                }`}
                              >
                                {/* Top Row: Avatar + Name + 3-Dots Menu */}
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className={`w-7 h-7 rounded-full ${col.avatarBg} ${col.avatarText} font-bold text-[11px] flex items-center justify-center shrink-0`}
                                    >
                                      {lead.initials ||
                                        lead.fullName
                                          .split(" ")
                                          .map((p) => p[0])
                                          .slice(0, 2)
                                          .join("")
                                          .toUpperCase()}
                                    </div>
                                    <h4 className="text-xs font-bold text-[#0F172A] truncate max-w-[105px] group-hover:text-emerald-700 transition-colors">
                                      {lead.fullName}
                                    </h4>
                                  </div>

                                  {/* 3-Dots Action Button & Dropdown */}
                                  <div className="relative shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCardMenuId(isMenuOpen ? null : lead._id);
                                      }}
                                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                      title="Options"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {isMenuOpen && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-7 w-44 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 z-40 text-xs animate-fade-in space-y-0.5"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedLead(lead);
                                            setIsDrawerOpen(true);
                                            setActiveCardMenuId(null);
                                          }}
                                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 font-medium text-gray-700 flex items-center gap-2 cursor-pointer"
                                        >
                                          <ExternalLink className="w-3 h-3 text-gray-400" />
                                          <span>View Details</span>
                                        </button>

                                        {col.key !== "converted" && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              handleQuickAdvance(lead._id, col.key, e);
                                              setActiveCardMenuId(null);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2 cursor-pointer"
                                          >
                                            <ChevronRight className="w-3 h-3 text-emerald-600" />
                                            <span>Advance Stage</span>
                                          </button>
                                        )}

                                        {lead.phone && (
                                          <>
                                            <a
                                              href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={() => setActiveCardMenuId(null)}
                                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 font-medium flex items-center gap-2 cursor-pointer"
                                            >
                                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                                              <span>WhatsApp Chat</span>
                                            </a>
                                            <a
                                              href={`tel:${lead.phone}`}
                                              onClick={() => setActiveCardMenuId(null)}
                                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-50 font-medium text-gray-700 flex items-center gap-2 cursor-pointer"
                                            >
                                              <Phone className="w-3 h-3 text-gray-400" />
                                              <span>Call Lead</span>
                                            </a>
                                          </>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setLeadToMarkLost(lead);
                                            setActiveCardMenuId(null);
                                          }}
                                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2 cursor-pointer border-t border-gray-100"
                                        >
                                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                                          <span>Mark as Lost</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Middle: Clinical Service tag */}
                                <p className="text-[11px] text-[#64748B] font-medium truncate mb-2">
                                  {lead.serviceInterest}
                                </p>

                                {/* Bottom: Relative Time / Slot + Pill Badge */}
                                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#F1F5F9]">
                                  <span className="text-[#94A3B8] font-medium truncate max-w-[90px] flex items-center gap-1">
                                    {col.key === "appointment" && (
                                      <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                                    )}
                                    <span>{lead.relativeTime || "Just now"}</span>
                                  </span>
                                  <span
                                    className={`font-bold ${col.pillBg} ${col.pillText} px-2 py-0.5 rounded-full shrink-0`}
                                  >
                                    {col.pillLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Subtle drop placeholder if fewer than 4 leads */}
                          {columnLeads.length < 4 && (
                            <div className="border border-dashed border-gray-200/70 rounded-2xl p-2.5 flex items-center justify-center text-center text-gray-300 min-h-[50px]">
                              <span className="text-[10px] font-medium text-gray-400">Drop lead here</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Quick summary and View All Link */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
            <span className="text-[11px] text-gray-400">
              Showing active pipeline leads across 5 stages &bull; Drag to advance
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab?.("leads")}
              className="font-bold text-xs text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer self-end sm:self-auto"
            >
              <span>Explore All {data?.kpis?.totalLeads?.value || 128} Leads</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Section: Stacked Today's Tasks & Upcoming Appointments (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Today's Tasks */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">Today&apos;s Tasks</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab?.("tasks")}
                className="text-xs font-bold text-[#16A34A] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {(data?.todaysTasks || []).map((task) => {
                const isDone = completedTaskIds[task._id];
                return (
                  <div
                    key={task._id}
                    className={`flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer ${
                      isDone ? "opacity-60" : ""
                    }`}
                    onClick={() => handleToggleTask(task)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          isDone ? "bg-[#16A34A] border-[#16A34A] text-white" : "border-[#CBD5E1] bg-white group-hover:border-[#16A34A]"
                        }`}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>

                      <div className="flex items-center gap-2 min-w-0">
                        {task.icon === "mail" ? (
                          <Mail className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                        ) : task.icon === "calendar" ? (
                          <Calendar className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                        )}
                        <span className={`text-xs text-[#0F172A] font-medium truncate ${isDone ? "line-through text-gray-400" : ""}`}>
                          {task.title}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-[#64748B] shrink-0 ml-2 font-mono flex items-center gap-1">
                      <span>{task.time}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Upcoming Appointments */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">Upcoming Appointments</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab?.("appointments")}
                className="text-xs font-bold text-[#16A34A] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3.5">
              {(data?.upcomingAppointments || []).slice(0, 4).map((appt) => (
                <div key={appt._id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-[#0F172A] shrink-0 w-16">{appt.time}</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        appt.dotColor
                          ? ""
                          : appt.status === "confirmed"
                          ? "bg-[#16A34A]"
                          : "bg-[#F59E0B]"
                      }`}
                      style={appt.dotColor ? { backgroundColor: appt.dotColor } : undefined}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-[#0F172A] truncate leading-tight">{appt.patientName}</p>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">{appt.serviceName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        appt.status === "confirmed"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEF3C7] text-[#B45309]"
                      }`}
                    >
                      • {appt.status === "confirmed" ? "Confirmed" : "Pending"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (appt.meetingLink) {
                          window.open(appt.meetingLink, "_blank");
                        } else {
                          showNotification(`Consultation scheduled for ${appt.patientName}`);
                        }
                      }}
                      className="text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Leads Source Donut + Conversion Funnel Bars + Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Leads Source (Donut Chart) */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Leads Source</h3>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
              This Month ▾
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-2">
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* 6 Arc slices with dasharray */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#E2E8F0" strokeWidth="12" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#06B6D4" strokeWidth="12" strokeDasharray="78.8 238.8" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#22C55E" strokeWidth="12" strokeDasharray="66.8 238.8" strokeDashoffset="-78.8" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F97316" strokeWidth="12" strokeDasharray="38.2 238.8" strokeDashoffset="-145.6" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3B82F6" strokeWidth="12" strokeDasharray="33.4 238.8" strokeDashoffset="-183.8" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#38BDF8" strokeWidth="12" strokeDasharray="14.3 238.8" strokeDashoffset="-217.2" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#A855F7" strokeWidth="12" strokeDasharray="7.2 238.8" strokeDashoffset="-231.5" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-extrabold text-[#0F172A] leading-tight">
                  {data?.leadsSource.total || 128}
                </span>
                <span className="text-[10px] text-[#64748B] font-semibold">Total Leads</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-1.5 flex-1 w-full text-xs">
              {(data?.leadsSource.items || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 text-[11px] truncate">{item.label}</span>
                  </div>
                  <span className="font-bold text-gray-900 text-[11px] font-mono">
                    {item.count} <span className="text-gray-400 font-normal">({item.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Conversion Funnel (Bar Chart) */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <GitBranch className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Conversion Funnel</h3>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
              This Month ▾
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="relative pt-6 pb-2">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-gray-400 pt-2 pb-6">
              <div className="border-b border-gray-100 flex justify-between"><span>150</span></div>
              <div className="border-b border-gray-100 flex justify-between"><span>100</span></div>
              <div className="border-b border-gray-100 flex justify-between"><span>50</span></div>
              <div className="border-b border-gray-100 flex justify-between"><span>0</span></div>
            </div>

            {/* Bars */}
            <div className="h-40 flex items-end justify-between gap-3 sm:gap-4 px-6 relative z-10">
              {(data?.conversionFunnel || [
                { stage: "Leads", count: 128, color: "#3B82F6" },
                { stage: "Contacted", count: 86, color: "#22C55E" },
                { stage: "Interested", count: 46, color: "#EAB308" },
                { stage: "Appointments", count: 18, color: "#F43F5E" },
                { stage: "Converted", count: 32, color: "#10B981" },
              ]).map((st, idx) => {
                const maxVal = 150;
                const heightPercent = Math.min(100, Math.max(10, Math.round((st.count / maxVal) * 100)));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-bold text-gray-800 font-mono">{st.count}</span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 hover:opacity-90"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: st.color,
                      }}
                    />
                    <span className="text-[10px] text-[#64748B] font-semibold truncate w-full text-center mt-1">
                      {st.stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 3: Recent Activities */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">Recent Activities</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab?.("leads")}
              className="text-xs font-bold text-[#16A34A] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3.5 my-1">
            {(data?.recentActivities || []).map((act) => (
              <div key={act._id} className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#F1F5F9] text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                    {act.type === "call" ? (
                      <Phone className="w-3.5 h-3.5 text-[#16A34A]" />
                    ) : act.type === "appointment" ? (
                      <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
                    ) : act.type === "conversion" ? (
                      <UserCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                    ) : act.type === "followup" ? (
                      <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-[#06B6D4]" />
                    )}
                  </div>
                  <span className="text-[#0F172A] font-medium leading-relaxed truncate">{act.title}</span>
                </div>
                <span className="text-[10px] text-[#94A3B8] shrink-0 font-mono mt-0.5">{act.timeAgo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Lead Details Side Drawer */}
      <SalesLeadDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }}
        onLeadUpdated={fetchDashboardData}
        showNotification={showNotification}
      />

      {/* 6. + Add Lead Modal Dialog */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#CBD5E1] space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#0F172A]">Add New Inbound Lead</h3>
              </div>
              <button
                type="button"
                onClick={onCloseAddLeadModal}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.fullName}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, fullName: e.target.value })}
                  placeholder="e.g. Shalini Roy"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    placeholder="shalini@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Clinical Service</label>
                  <select
                    value={newLeadForm.serviceInterest}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, serviceInterest: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="PCOD Consultation">PCOD Consultation</option>
                    <option value="Skin Treatment">Skin Treatment</option>
                    <option value="Hair Fall Treatment">Hair Fall Treatment</option>
                    <option value="PCOS Program">PCOS Program</option>
                    <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
                    <option value="Fertility Consultation">Fertility Consultation</option>
                    <option value="General Consultation">General Consultation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Lead Source</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="website_enquiry">Website Enquiry</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="google_seo">Google / SEO</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Initial Medical / Inquiry Notes</label>
                <textarea
                  rows={2}
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  placeholder="Patient concerns, preferred timing, or special symptoms..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={onCloseAddLeadModal}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Inbound Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Mark as Lost Confirmation Modal (Strict reason mandatory) */}
      {leadToMarkLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#CBD5E1] space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Document Lost Lead Reason</h3>
                  <p className="text-[11px] text-[#64748B]">Required per clinical CRM governance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeadToMarkLost(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-xs">
                <span className="font-semibold text-gray-700">Lead: </span>
                <span className="font-bold text-[#0F172A]">{leadToMarkLost.fullName}</span>
                <span className="text-gray-400 mx-1.5">&bull;</span>
                <span className="text-gray-600">{leadToMarkLost.serviceInterest}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Select Reason for Loss *
                </label>
                <select
                  value={markLostReason}
                  onChange={(e) => setMarkLostReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  <option value="Price too high / Financial constraints">Price too high / Financial constraints</option>
                  <option value="Decided on alternate clinic / provider">Decided on alternate clinic / provider</option>
                  <option value="Unresponsive after 5+ contact attempts">Unresponsive after 5+ contact attempts</option>
                  <option value="Wrong number / Not interested in treatment">Wrong number / Not interested in treatment</option>
                  <option value="Location / Distance / Scheduling conflict">Location / Distance / Scheduling conflict</option>
                  <option value="Sought second opinion / Delayed decision">Sought second opinion / Delayed decision</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>

              {markLostReason === "Other" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Specific Reason Details *
                  </label>
                  <input
                    type="text"
                    required
                    value={customLostReason}
                    onChange={(e) => setCustomLostReason(e.target.value)}
                    placeholder="Enter reason details..."
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setLeadToMarkLost(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingLost || (markLostReason === "Other" && !customLostReason.trim())}
                onClick={handleConfirmMarkLost}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingLost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>Confirm Mark Lost</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

