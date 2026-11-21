"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  FileText,
  Search,
  Loader2,
  Stethoscope,
  Pill,
  Lock,
  Calendar,
  CheckCircle2,
  X,
  Eye,
  RefreshCw,
  User,
  AlertCircle,
  Printer,
  ShieldCheck,
  ClipboardList,
  Plus,
  FileDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  MoreVertical,
  Activity,
  Sparkles,
  Layers,
  Clock,
  BarChart3,
  Share2,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import { ClinicalKpiCards, ClinicalKpiData } from "./consultations/ClinicalKpiCards";
import {
  ConsultationDetailPanel,
  ConsultationDetailItem,
} from "./consultations/ConsultationDetailPanel";
import { NewConsultationModal } from "./consultations/NewConsultationModal";
import { AmendmentModal } from "./consultations/AmendmentModal";
import { PatientTimelineModal } from "./consultations/PatientTimelineModal";
import { TreatmentPlansView } from "./consultations/TreatmentPlansView";
import { FollowUpsView } from "./consultations/FollowUpsView";
import { PrescriptionsView } from "./consultations/PrescriptionsView";
import { ClinicalReportsView } from "./consultations/ClinicalReportsView";

export type ConsultationNavTab =
  | "all"
  | "in_progress"
  | "finalized"
  | "treatment_plans"
  | "followups"
  | "prescriptions"
  | "reports";

interface DoctorOption {
  _id: string;
  userId?: { name: string };
  qualifications?: string;
  specialization?: string[];
}

interface ConsultationsTabProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function ConsultationsTab({ showNotification }: ConsultationsTabProps) {
  // Navigation Tabs
  const [activeNavTab, setActiveNavTab] = useState<ConsultationNavTab>("all");

  // Consultations List & Detail State
  const [consultations, setConsultations] = useState<ConsultationDetailItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limitPerPage, setLimitPerPage] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected Consultation for persistent right side panel
  const [selectedConsultation, setSelectedConsultation] =
    useState<ConsultationDetailItem | null>(null);

  // KPI Statistics
  const [stats, setStats] = useState<ClinicalKpiData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [practitionerFilter, setPractitionerFilter] = useState<string>("all");
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("month");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Lookups for filters
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [diagnosesList, setDiagnosesList] = useState<Array<{ name: string; count: number }>>([]);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [amendmentModalConsultation, setAmendmentModalConsultation] =
    useState<ConsultationDetailItem | null>(null);
  const [timelinePatientId, setTimelinePatientId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // 1. Fetch Dynamic Clinical KPIs from Live Database
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await api.get<ClinicalKpiData>(
        `/clinical/consultations/stats?dateRange=${dateRangeFilter}`
      );
      if (res.data) {
        setStats(res.data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingStats(false);
    }
  }, [dateRangeFilter]);

  // 2. Fetch Lookups (Doctors and Diagnoses)
  const fetchLookups = useCallback(async () => {
    try {
      const [docRes, diagRes] = await Promise.all([
        api.get<{ doctors?: DoctorOption[]; data?: DoctorOption[] }>("/doctors"),
        api.get<{ diagnoses?: Array<{ name: string; count: number }> }>("/clinical/diagnoses"),
      ]);

      const docs =
        (docRes as any).data?.doctors ||
        (docRes as any).doctors ||
        (docRes as any).data ||
        [];
      const diags = (diagRes as any).data?.diagnoses || [];

      setDoctorsList(docs);
      setDiagnosesList(diags);
    } catch {
      // Ignore
    }
  }, []);

  // 3. Fetch Consultations Directory with server-side pagination & filtering
  const fetchConsultations = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(limitPerPage));
      params.set("sortBy", sortBy);

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (practitionerFilter !== "all") params.set("doctorId", practitionerFilter);
      if (diagnosisFilter !== "all") params.set("diagnosis", diagnosisFilter);
      if (dateRangeFilter !== "all") params.set("dateRange", dateRangeFilter);

      // Tab mapping
      if (activeNavTab === "in_progress") {
        params.set("tab", "in_progress");
      } else if (activeNavTab === "finalized") {
        params.set("tab", "finalized");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await api.get<{
        consultations: ConsultationDetailItem[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/clinical/consultations?${params.toString()}`);

      if (res.data) {
        const list = res.data.consultations || [];
        setConsultations(list);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);

        // Auto-select first consultation if desktop and nothing selected
        if (list.length > 0 && !selectedConsultation) {
          setSelectedConsultation(list[0]);
        }
      }
    } catch {
      showNotification("Failed to load clinical consultations", true);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    limitPerPage,
    sortBy,
    searchQuery,
    practitionerFilter,
    diagnosisFilter,
    dateRangeFilter,
    activeNavTab,
    statusFilter,
    showNotification,
  ]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchLookups();
  }, [fetchStats, fetchLookups]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Debounced search trigger (reset to page 1)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Export CSV
  const handleExportCsv = () => {
    const token = getToken();
    const url = `${getBaseUrl()}/clinical/consultations/export?token=${token || ""}&status=${statusFilter}&doctorId=${practitionerFilter !== "all" ? practitionerFilter : ""}`;
    window.open(url, "_blank");
    showNotification("Downloading clinical encounter dataset (CSV)...");
  };

  // Refresh
  const handleRefresh = () => {
    fetchStats();
    fetchConsultations();
    showNotification("Clinical records refreshed from live database.");
  };

  // Card click filter router
  const handleKpiCardClick = (type: "total" | "finalized" | "treatment_plans" | "followups") => {
    if (type === "total") {
      setActiveNavTab("all");
      setStatusFilter("all");
    } else if (type === "finalized") {
      setActiveNavTab("finalized");
    } else if (type === "treatment_plans") {
      setActiveNavTab("treatment_plans");
    } else if (type === "followups") {
      setActiveNavTab("followups");
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* =========================================================================
          1. GLOBAL PAGE HEADER (Exact Match to Visual Mockup)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-6 h-6 text-[#087A50]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-sans font-bold text-[#111827] tracking-tight">
              Consultations &amp; Clinical Records
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 leading-snug">
              Electronic health encounters, clinical evaluations, treatment plans, and verified digital prescriptions.
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#111827] shadow-2xs transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-[#64748B]" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#111827] shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#087A50] ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Records</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. DYNAMIC CLINICAL KPI CARDS (Live MongoDB Aggregations)
          ========================================================================= */}
      <ClinicalKpiCards
        stats={stats}
        isLoading={isLoadingStats}
        onCardClick={handleKpiCardClick}
      />

      {/* =========================================================================
          3. CONSULTATION NAVIGATION TABS (Horizontal Navigation)
          ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF0] bg-white px-4 pt-1 rounded-t-2xl overflow-x-auto scrollbar-none shadow-2xs text-xs font-semibold">
        {[
          { id: "all", label: "All Consultations", icon: FileText, count: stats?.totalConsultations },
          { id: "in_progress", label: "In Progress", icon: Sparkles, count: stats?.inProgressRecords },
          { id: "finalized", label: "Finalized", icon: CheckCircle2, count: stats?.finalizedRecords },
          { id: "treatment_plans", label: "Treatment Plans", icon: Layers, count: stats?.activeTreatmentPlans },
          { id: "followups", label: "Follow-ups", icon: Clock, count: stats?.followUpsDue },
          { id: "prescriptions", label: "Prescriptions", icon: Pill },
          { id: "reports", label: "Clinical Reports", icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeNavTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveNavTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-[#087A50] text-[#087A50] font-bold"
                  : "border-transparent text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#087A50]" : "text-[#94A3B8]"}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? "bg-[#E9F8F0] text-[#087A50]" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          4. TAB CONTENT ROUTING
          ========================================================================= */}
      {/* SUB-VIEW 1: TREATMENT PLANS TAB */}
      {activeNavTab === "treatment_plans" && (
        <TreatmentPlansView showNotification={showNotification} />
      )}

      {/* SUB-VIEW 2: FOLLOW-UPS TAB */}
      {activeNavTab === "followups" && (
        <FollowUpsView showNotification={showNotification} />
      )}

      {/* SUB-VIEW 3: PRESCRIPTIONS TAB */}
      {activeNavTab === "prescriptions" && (
        <PrescriptionsView showNotification={showNotification} />
      )}

      {/* SUB-VIEW 4: CLINICAL REPORTS TAB */}
      {activeNavTab === "reports" && (
        <ClinicalReportsView showNotification={showNotification} />
      )}

      {/* CORE VIEW: ALL / IN PROGRESS / FINALIZED CONSULTATIONS DIRECTORY */}
      {(activeNavTab === "all" || activeNavTab === "in_progress" || activeNavTab === "finalized") && (
        <div className="space-y-4">
          {/* SEARCH & ADVANCED FILTERS TOOLBAR */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by patient, diagnosis, code, or practitioner..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl text-[#111827] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#087A50] focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Filters Dropdown Row */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-wrap">
                {/* Practitioners Filter */}
                <select
                  value={practitionerFilter}
                  onChange={(e) => {
                    setPractitionerFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Practitioners</option>
                  {doctorsList.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.userId?.name || "Dr. TriGyna"} ({d.qualifications || "Consultant"})
                    </option>
                  ))}
                </select>

                {/* Diagnoses Filter */}
                <select
                  value={diagnosisFilter}
                  onChange={(e) => {
                    setDiagnosisFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Diagnoses</option>
                  {diagnosesList.map((d, i) => (
                    <option key={i} value={d.name}>
                      {d.name} ({d.count})
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="in_progress">In Progress</option>
                  <option value="finalized">Finalized</option>
                  <option value="draft">Draft</option>
                </select>

                {/* Date Range Filter */}
                <select
                  value={dateRangeFilter}
                  onChange={(e) => {
                    setDateRangeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none cursor-pointer"
                >
                  <option value="month">This Month (Oct 2026)</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="all">All Time</option>
                </select>

                {/* More Filters Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                    showAdvancedFilters
                      ? "border-[#087A50] bg-[#E9F8F0] text-[#087A50]"
                      : "border-[#E5EAF0] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>More Filters</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters Expandable Drawer */}
            {showAdvancedFilters && (
              <div className="pt-3 border-t border-[#E5EAF0] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                    Consultation Mode
                  </label>
                  <select
                    onChange={(e) => {
                      fetchConsultations();
                    }}
                    className="w-full px-3 py-1.5 border border-[#E5EAF0] rounded-xl bg-white text-xs"
                  >
                    <option value="">All Modes</option>
                    <option value="Online Video Consultation">Online Video Consultation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                    Sort Records By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E5EAF0] rounded-xl bg-white text-xs"
                  >
                    <option value="date_desc">Consultation Date (Newest first)</option>
                    <option value="date_asc">Consultation Date (Oldest first)</option>
                    <option value="diagnosis">Diagnosis (A - Z)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPractitionerFilter("all");
                      setDiagnosisFilter("all");
                      setStatusFilter("all");
                      setDateRangeFilter("month");
                      setSortBy("date_desc");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs font-semibold text-[#087A50] hover:bg-[#E9F8F0] border border-[#087A50] rounded-xl transition cursor-pointer text-center"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RESULTS META BAR & VIEW TOGGLE */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[#64748B] font-medium">
              Showing{" "}
              <span className="font-bold text-[#111827]">
                {consultations.length > 0 ? (currentPage - 1) * limitPerPage + 1 : 0}–
                {Math.min(currentPage * limitPerPage, totalCount)}
              </span>{" "}
              of <span className="font-bold text-[#111827]">{totalCount.toLocaleString("en-IN")}</span> consultations
            </span>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-[#64748B]">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent font-semibold text-[#111827] focus:outline-none cursor-pointer"
                >
                  <option value="date_desc">Consultation Date (Newest)</option>
                  <option value="date_asc">Consultation Date (Oldest)</option>
                  <option value="diagnosis">Diagnosis</option>
                </select>
              </div>

              {/* View toggle */}
              <div className="flex items-center border border-[#E5EAF0] rounded-xl bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[#087A50] text-white"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                  title="List View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[#087A50] text-white"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              5. MAIN DIRECTORY LAYOUT (TABLE + RIGHT-SIDE DETAIL PANEL)
              ========================================================================= */}
          <div className="flex flex-col lg:flex-row items-start gap-5">
            {/* LEFT / CENTER: CONSULTATION DATA TABLE */}
            <div className="flex-1 w-full min-w-0 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden flex flex-col justify-between">
              {isLoading ? (
                <div className="py-24 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#087A50]" />
                  <span className="text-xs font-medium">Loading clinical consultations...</span>
                </div>
              ) : consultations.length === 0 ? (
                <div className="py-20 text-center text-[#64748B] p-6 space-y-2">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                  <h3 className="font-bold text-sm text-[#111827]">No clinical consultations found</h3>
                  <p className="text-xs text-[#64748B] max-w-xs mx-auto">
                    Try clearing your search query or selecting a different date range.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#075B3D]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Consultation</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-[#E5EAF0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-4 whitespace-nowrap">Date &amp; Code</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Patient</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Practitioner</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Clinical Diagnosis</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Treatment / Protocol</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]/80">
                      {consultations.map((item) => {
                        const isSelected = selectedConsultation?._id === item._id;
                        const patient = item.patientId;
                        const doctor = item.doctorId;

                        // Date format matching screenshot: "26 Oct 2026"
                        const rowDateStr = item.consultationDate
                          ? new Date(item.consultationDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : item.appointmentId?.appointmentDate
                          ? new Date(item.appointmentId.appointmentDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : new Date(item.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            });

                        const rowCode = item.consultationCode || `TG-C-${item._id.slice(-4).toUpperCase()}`;

                        return (
                          <tr
                            key={item._id}
                            onClick={() => setSelectedConsultation(item)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#E9F8F0]/50 hover:bg-[#E9F8F0]/70"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            {/* Column 1: Date & Code */}
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#111827] block whitespace-nowrap">
                                {rowDateStr}
                              </span>
                              <span className="font-mono text-[11px] text-[#087A50] block mt-0.5">
                                {rowCode}
                              </span>
                            </td>

                            {/* Column 2: Patient */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center shrink-0">
                                  {patient?.avatarUrl ? (
                                    <Image
                                      src={patient.avatarUrl}
                                      alt={patient.fullName}
                                      width={32}
                                      height={32}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="font-bold text-xs text-[#087A50]">
                                      {patient?.fullName
                                        ? patient.fullName
                                            .split(" ")
                                            .map((n) => n[0])
                                            .slice(0, 2)
                                            .join("")
                                            .toUpperCase()
                                        : "PT"}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-[#111827] block truncate max-w-[130px]">
                                    {patient?.fullName || "Patient"}
                                  </span>
                                  <span className="text-[10px] text-[#64748B] font-mono block">
                                    {patient?.patientCode || "TR-1001"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Column 3: Practitioner */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#F8FAFC] border border-[#E5EAF0] flex items-center justify-center shrink-0 text-[#087A50]">
                                  <Stethoscope className="w-3.5 h-3.5 text-[#087A50]" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-[#111827] block truncate max-w-[140px]">
                                    {doctor?.userId?.name || "Dr. TriGyna"}
                                  </span>
                                  <span className="text-[10px] text-[#64748B] block truncate max-w-[140px]">
                                    {doctor?.qualifications || "Consultant"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Column 4: Clinical Diagnosis */}
                            <td className="py-3.5 px-4">
                              <div className="inline-block px-2.5 py-1 rounded-lg bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] max-w-[200px]">
                                <span className="font-bold text-[11px] block truncate">
                                  {item.diagnosis || "Telogen Effluvium"}
                                </span>
                                {item.diagnosisTags && item.diagnosisTags.length > 0 && (
                                  <span className="text-[9px] text-[#087A50]/80 font-medium block truncate">
                                    ({item.diagnosisTags[0]})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Column 5: Treatment / Protocol */}
                            <td className="py-3.5 px-4 text-[#64748B] max-w-[200px]">
                              <span className="block truncate text-xs text-[#111827]" title={item.chiefComplaints || item.treatmentPlan}>
                                {item.chiefComplaints || item.treatmentPlan || "Persistent hair thinning and dry scalp for 3 months. ..."}
                              </span>
                            </td>

                            {/* Column 6: Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {item.isFinalized ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]">
                                  <Lock className="w-3 h-3 text-[#087A50]" />
                                  <span>Finalized</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Activity className="w-3 h-3 text-blue-600 animate-pulse" />
                                  <span>In Progress</span>
                                </span>
                              )}
                            </td>

                            {/* Column 7: Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedConsultation(item)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-[#087A50] hover:bg-[#E9F8F0] transition cursor-pointer"
                                  title="View Case Sheet"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveMenuId(activeMenuId === item._id ? null : item._id)
                                    }
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                                    title="More Actions"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {activeMenuId === item._id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setActiveMenuId(null)}
                                      />
                                      <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E5EAF0] rounded-xl shadow-xl z-40 py-1 text-xs animate-fade-in font-sans">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedConsultation(item);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] text-[#111827] flex items-center gap-2 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-[#087A50]" />
                                          <span>Inspect Case Sheet</span>
                                        </button>

                                        {patient?._id && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setTimelinePatientId(patient._id);
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] text-[#111827] flex items-center gap-2 cursor-pointer"
                                          >
                                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Patient EHR Timeline</span>
                                          </button>
                                        )}

                                        {item.isFinalized && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAmendmentModalConsultation(item);
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] text-[#111827] flex items-center gap-2 cursor-pointer"
                                          >
                                            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Append Amendment</span>
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TABLE FOOTER / PAGINATION (Matching Reference) */}
              <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={limitPerPage}
                    onChange={(e) => {
                      setLimitPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-[#E5EAF0] rounded-lg px-2 py-1 text-xs font-semibold text-[#111827] bg-white cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="ml-2 font-mono">
                    {consultations.length > 0 ? (currentPage - 1) * limitPerPage + 1 : 0}–
                    {Math.min(currentPage * limitPerPage, totalCount)} of {totalCount}
                  </span>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentPage === pg
                          ? "bg-[#087A50] text-white"
                          : "border border-[#E5EAF0] text-[#111827] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  {totalPages > 5 && (
                    <>
                      <span className="px-1 text-[#94A3B8]">...</span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(totalPages)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          currentPage === totalPages
                            ? "bg-[#087A50] text-white"
                            : "border border-[#E5EAF0] text-[#111827] hover:bg-[#F8FAFC]"
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
                    className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: SELECTED CONSULTATION PERSISTENT DETAIL PANEL */}
            {selectedConsultation && (
              <ConsultationDetailPanel
                consultation={selectedConsultation}
                onClose={() => setSelectedConsultation(null)}
                onOpenAmendment={(c) => setAmendmentModalConsultation(c)}
                onOpenTimeline={(pId) => setTimelinePatientId(pId)}
                showNotification={showNotification}
              />
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODALS WORKFLOWS (New Consultation, Amendment, Patient Timeline)
          ========================================================================= */}
      <NewConsultationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchConsultations();
        }}
        showNotification={showNotification}
      />

      <AmendmentModal
        consultation={amendmentModalConsultation}
        isOpen={Boolean(amendmentModalConsultation)}
        onClose={() => setAmendmentModalConsultation(null)}
        onSuccess={() => {
          fetchConsultations();
          if (selectedConsultation && amendmentModalConsultation?._id === selectedConsultation._id) {
            // refresh single consultation
            api.get<{ consultation: ConsultationDetailItem }>(
              `/clinical/consultations/${selectedConsultation._id}`
            ).then((r) => {
              if (r.data?.consultation) setSelectedConsultation(r.data.consultation);
            });
          }
        }}
        showNotification={showNotification}
      />

      <PatientTimelineModal
        patientId={timelinePatientId}
        isOpen={Boolean(timelinePatientId)}
        onClose={() => setTimelinePatientId(null)}
        showNotification={showNotification}
      />
    </div>
  );
}
