"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Stethoscope,
  Search,
  Filter,
  Lock,
  FileEdit,
  Calendar,
  Clock,
  User,
  Users,
  Eye,
  FileText,
  Plus,
  RotateCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Printer,
  Download,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { NewConsultationModal } from "./consultations/NewConsultationModal";
import { FinalizedRecordModal } from "./consultations/FinalizedRecordModal";
import { ConsultationAmendmentModal } from "./consultations/ConsultationAmendmentModal";
import { PatientQuickProfileModal } from "./consultations/PatientQuickProfileModal";

export interface ConsultationItem {
  _id: string;
  consultationCode?: string;
  consultationDate?: string;
  appointmentId?: {
    _id: string;
    appointmentCode: string;
    appointmentDate: string;
    startTime: string;
    serviceName: string;
    mode?: string;
    meetingUrl?: string;
    meetingProvider?: string;
    status?: string;
  };
  patientId: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone?: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    allergies?: string[];
    medicalHistory?: string[];
  };
  diagnosis?: string;
  treatmentPlan?: string;
  chiefComplaints?: string;
  examinationNotes?: string;
  isFinalized: boolean;
  status: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  amendments?: any[];
}

export interface ConsultationSummaryKPIs {
  totalConsultations: number;
  draftConsultations: number;
  finalizedConsultations: number;
  thisWeek: number;
  uniquePatients: number;
  totalTrend: string;
  draftTrend: string;
  finalizedTrend: string;
  thisWeekTrend: string;
  uniquePatientsTrend: string;
  statusCounts: {
    all: number;
    drafts: number;
    finalized: number;
  };
}

interface DoctorConsultationsTabProps {
  onOpenConsultation: (appointmentId: string, patientId: string, consultationId?: string) => void;
}

// Generate consistent avatar pastel colors matching reference screenshot
function getPatientAvatarTheme(name: string) {
  const themes = [
    { bg: "bg-[#E9D5FF]", text: "text-[#6B21A8]" }, // Lavender/Purple (SK)
    { bg: "bg-[#DCFCE7]", text: "text-[#15803D]" }, // Mint/Green (PK)
    { bg: "bg-[#FEF08A]", text: "text-[#854D0E]" }, // Amber/Yellow (AM)
    { bg: "bg-[#FECDD3]", text: "text-[#9F1239]" }, // Rose/Pink (RS)
    { bg: "bg-[#BAE6FD]", text: "text-[#0369A1]" }, // Sky/Blue (PR)
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % themes.length;
  return themes[index];
}

function getInitials(name: string) {
  if (!name) return "PT";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DoctorConsultationsTab({ onOpenConsultation }: DoctorConsultationsTabProps) {
  // Directory & Pagination State
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({ all: 0, drafts: 0, finalized: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [activeTab, setActiveTab] = useState<"all" | "drafts" | "finalized">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter Dropdown Menus
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [diagDropdownOpen, setDiagDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [diagnosesCatalog, setDiagnosesCatalog] = useState<string[]>([]);
  const [diagSearch, setDiagSearch] = useState("");

  // KPI Summary State
  const [kpis, setKpis] = useState<ConsultationSummaryKPIs>({
    totalConsultations: 0,
    draftConsultations: 0,
    finalizedConsultations: 0,
    thisWeek: 0,
    uniquePatients: 0,
    totalTrend: "0 this month",
    draftTrend: "0 from last week",
    finalizedTrend: "0 this month",
    thisWeekTrend: "0 vs. last week",
    uniquePatientsTrend: "0 this month",
    statusCounts: { all: 0, drafts: 0, finalized: 0 },
  });
  const [kpiLoading, setKpiLoading] = useState(true);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Action Menus State
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Modals State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedViewRecordId, setSelectedViewRecordId] = useState<string | null>(null);
  const [amendmentTargetId, setAmendmentTargetId] = useState<string | null>(null);
  const [selectedPatientProfileId, setSelectedPatientProfileId] = useState<string | null>(null);

  // Outside click refs
  const dateRef = useRef<HTMLDivElement>(null);
  const diagRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
      if (diagRef.current && !diagRef.current.contains(e.target as Node)) {
        setDiagDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (!(e.target as HTMLElement).closest(".action-menu-container")) {
        setOpenActionId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch KPI Summary
  const fetchSummary = useCallback(async () => {
    try {
      setKpiLoading(true);
      const res = await api.get<{ data?: ConsultationSummaryKPIs }>(
        "/api/v1/doctor/consultations/summary"
      );
      if (res && (res as any).data) {
        setKpis((res as any).data);
        if ((res as any).data.statusCounts) {
          setTabCounts((res as any).data.statusCounts);
        }
      }
    } catch (err) {
      console.warn("Could not load consultation KPIs", err);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  // Fetch Diagnoses Catalog
  const fetchDiagnosesCatalog = useCallback(async () => {
    try {
      const res = await api.get<{ data?: { diagnoses?: string[] } }>(
        "/api/v1/doctor/consultations/diagnoses"
      );
      const list = (res as any).data?.diagnoses || [];
      setDiagnosesCatalog(list);
    } catch (err) {
      console.warn("Could not load diagnoses catalog", err);
    }
  }, []);

  // Fetch Consultations Directory
  const fetchConsultations = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));

      if (activeTab !== "all") {
        params.set("tab", activeTab);
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      if (dateRange !== "all") {
        params.set("dateRange", dateRange);
      }
      if (selectedDiagnosis !== "all") {
        params.set("diagnosis", selectedDiagnosis);
      }

      const res = await api.get<{
        data?: {
          consultations?: ConsultationItem[];
          total?: number;
          counts?: { all: number; drafts: number; finalized: number };
        };
      }>(`/api/v1/doctor/consultations?${params.toString()}`);

      const data = (res as any).data || {};
      const list = data.consultations || [];
      const total = data.total ?? list.length;

      setConsultations(list);
      setTotalCount(total);
      if (data.counts) {
        setTabCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to fetch consultations", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, limit, activeTab, statusFilter, debouncedSearch, dateRange, selectedDiagnosis]);

  useEffect(() => {
    fetchSummary();
    fetchDiagnosesCatalog();
  }, [fetchSummary, fetchDiagnosesCatalog]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSummary();
    fetchConsultations();
  };

  const handleTabChange = (tab: "all" | "drafts" | "finalized") => {
    setActiveTab(tab);
    setPage(1);
    setSelectedIds([]);
  };

  // Checkbox helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(consultations.map((c) => c._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export CSV
  const handleExportCSV = async (onlySelected = false) => {
    try {
      const payload: any = {};
      if (onlySelected && selectedIds.length > 0) {
        payload.selectedIds = selectedIds;
      } else {
        payload.tab = activeTab;
        if (statusFilter !== "all") payload.status = statusFilter;
        if (selectedDiagnosis !== "all") payload.diagnosis = selectedDiagnosis;
      }

      const res = await fetch("/api/v1/doctor/consultations/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trigyna_consultations_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("CSV Export error", err);
    }
  };

  // Filter labels
  const dateRangeLabels: Record<string, string> = {
    all: "Date Range",
    today: "Today",
    yesterday: "Yesterday",
    last7days: "Last 7 Days",
    last30days: "Last 30 Days",
    thisMonth: "This Month",
    lastMonth: "Last Month",
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIdx = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, totalCount);

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-300">
      {/* 1. Header with exact layout and segmented control */}
      <div className="bg-white p-6 rounded-3xl border border-[#E1EAE4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F7F2] text-[#064B38] flex items-center justify-center shrink-0 border border-[#C2E8DC] shadow-sm">
            <Stethoscope className="w-6 h-6 text-[#064B38]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-[#17251F]">
              Consultations & Clinical Records
            </h1>
            <p className="text-xs text-[#718078] mt-0.5">
              Review, create, and finalize clinical evaluations, treatment plans, and consultation notes.
            </p>
          </div>
        </div>

        {/* Segmented status control */}
        <div className="flex items-center bg-[#F2F7F4] p-1.5 rounded-full border border-[#E1EAE4] text-xs font-semibold self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeTab === "all"
                ? "bg-[#064B38] text-white shadow-sm"
                : "text-[#718078] hover:text-[#17251F]"
            }`}
          >
            All ({tabCounts.all})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("drafts")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeTab === "drafts"
                ? "bg-[#064B38] text-white shadow-sm"
                : "text-[#718078] hover:text-[#17251F]"
            }`}
          >
            Drafts ({tabCounts.drafts})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("finalized")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeTab === "finalized"
                ? "bg-[#064B38] text-white shadow-sm"
                : "text-[#718078] hover:text-[#17251F]"
            }`}
          >
            Finalized ({tabCounts.finalized})
          </button>
        </div>
      </div>

      {/* 2. Five Real-Time KPI Cards Matching Reference Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Consultations */}
        <div
          onClick={() => handleTabChange("all")}
          className="bg-white rounded-2xl border border-[#E1EAE4] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#E6F7F2] text-[#07543D] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#07543D]" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-[#17251F] group-hover:text-[#064B38] transition-colors">
              {kpiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.totalConsultations}
            </h3>
            <p className="text-xs font-medium text-[#718078]">Total Consultations</p>
          </div>
          {kpis.totalTrend && (
            <p className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1 mt-2.5">
              <span>↑</span> {kpis.totalTrend}
            </p>
          )}
        </div>

        {/* Card 2: Draft Consultations */}
        <div
          onClick={() => handleTabChange("drafts")}
          className="bg-white rounded-2xl border border-[#E1EAE4] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-[#D97706]" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-[#17251F] group-hover:text-[#D97706] transition-colors">
              {kpiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.draftConsultations}
            </h3>
            <p className="text-xs font-medium text-[#718078]">Draft Consultations</p>
          </div>
          {kpis.draftTrend && (
            <p className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1 mt-2.5">
              <span>↓</span> {kpis.draftTrend}
            </p>
          )}
        </div>

        {/* Card 3: Finalized Consultations */}
        <div
          onClick={() => handleTabChange("finalized")}
          className="bg-white rounded-2xl border border-[#E1EAE4] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#16A34A]" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-[#17251F] group-hover:text-[#16A34A] transition-colors">
              {kpiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.finalizedConsultations}
            </h3>
            <p className="text-xs font-medium text-[#718078]">Finalized Consultations</p>
          </div>
          {kpis.finalizedTrend && (
            <p className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1 mt-2.5">
              <span>↑</span> {kpis.finalizedTrend}
            </p>
          )}
        </div>

        {/* Card 4: This Week */}
        <div
          onClick={() => {
            setDateRange("last7days");
            setPage(1);
          }}
          className="bg-white rounded-2xl border border-[#E1EAE4] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] text-[#8B5CF6] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#8B5CF6]" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-[#17251F] group-hover:text-[#8B5CF6] transition-colors">
              {kpiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.thisWeek}
            </h3>
            <p className="text-xs font-medium text-[#718078]">This Week</p>
          </div>
          {kpis.thisWeekTrend && (
            <p className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1 mt-2.5">
              <span>↑</span> {kpis.thisWeekTrend}
            </p>
          )}
        </div>

        {/* Card 5: Unique Patients */}
        <div className="bg-white rounded-2xl border border-[#E1EAE4] p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#EF4444]" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-[#17251F]">
              {kpiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpis.uniquePatients}
            </h3>
            <p className="text-xs font-medium text-[#718078]">Unique Patients</p>
          </div>
          {kpis.uniquePatientsTrend && (
            <p className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1 mt-2.5">
              <span>↑</span> {kpis.uniquePatientsTrend}
            </p>
          )}
        </div>
      </div>

      {/* 3. Search and Filter Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-[#E1EAE4] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter consultations by patient name, diagnosis, or patient ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent text-xs text-[#17251F] placeholder:text-gray-400 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right dropdown controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Date Range Dropdown */}
          <div className="relative" ref={dateRef}>
            <button
              type="button"
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border border-[#E1EAE4] bg-white hover:bg-gray-50 text-xs font-medium text-[#17251F] flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-[#718078]" />
              <span>{dateRangeLabels[dateRange] || "Date Range"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-2xl border border-[#E1EAE4] shadow-xl py-1.5 z-30 text-xs animate-in fade-in-50 duration-150">
                {Object.entries(dateRangeLabels).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDateRange(key);
                      setDateDropdownOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 flex items-center justify-between hover:bg-[#F2F7F4] ${
                      dateRange === key ? "font-bold text-[#064B38]" : "text-[#17251F]"
                    }`}
                  >
                    <span>{label}</span>
                    {dateRange === key && <Check className="w-3.5 h-3.5 text-[#064B38]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Diagnosis / Condition Dropdown */}
          <div className="relative" ref={diagRef}>
            <button
              type="button"
              onClick={() => setDiagDropdownOpen(!diagDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border border-[#E1EAE4] bg-white hover:bg-gray-50 text-xs font-medium text-[#17251F] flex items-center gap-1.5 transition-colors shadow-sm max-w-[200px]"
            >
              <span className="truncate">
                {selectedDiagnosis === "all" ? "Diagnosis / Condition" : selectedDiagnosis}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>

            {diagDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-2xl border border-[#E1EAE4] shadow-xl p-2 z-30 text-xs animate-in fade-in-50 duration-150 space-y-1.5">
                <input
                  type="text"
                  placeholder="Search condition..."
                  value={diagSearch}
                  onChange={(e) => setDiagSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F2F7F4] rounded-lg text-xs outline-none"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiagnosis("all");
                      setDiagDropdownOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#F2F7F4] ${
                      selectedDiagnosis === "all" ? "font-bold text-[#064B38]" : "text-[#17251F]"
                    }`}
                  >
                    <span>All Diagnoses</span>
                    {selectedDiagnosis === "all" && <Check className="w-3.5 h-3.5 text-[#064B38]" />}
                  </button>
                  {diagnosesCatalog
                    .filter((d) => d.toLowerCase().includes(diagSearch.toLowerCase()))
                    .map((diag, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedDiagnosis(diag);
                          setDiagDropdownOpen(false);
                          setPage(1);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#F2F7F4] truncate ${
                          selectedDiagnosis === diag ? "font-bold text-[#064B38]" : "text-[#17251F]"
                        }`}
                      >
                        <span className="truncate">{diag}</span>
                        {selectedDiagnosis === diag && <Check className="w-3.5 h-3.5 text-[#064B38] shrink-0" />}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border border-[#E1EAE4] bg-white hover:bg-gray-50 text-xs font-medium text-[#17251F] flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>{statusFilter === "all" ? "Status" : statusFilter === "draft" ? "Draft" : "Finalized"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-2xl border border-[#E1EAE4] shadow-xl py-1 z-30 text-xs animate-in fade-in-50 duration-150">
                {[
                  { key: "all", label: "All Statuses" },
                  { key: "draft", label: "Draft" },
                  { key: "finalized", label: "Finalized" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(key);
                      setStatusDropdownOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 flex items-center justify-between hover:bg-[#F2F7F4] ${
                      statusFilter === key ? "font-bold text-[#064B38]" : "text-[#17251F]"
                    }`}
                  >
                    <span>{label}</span>
                    {statusFilter === key && <Check className="w-3.5 h-3.5 text-[#064B38]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh clinical encounters"
            className="p-2 rounded-xl border border-[#E1EAE4] bg-white hover:bg-gray-50 text-[#718078] hover:text-[#17251F] transition-colors shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#064B38]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Bulk actions banner */}
      {selectedIds.length > 0 && (
        <div className="bg-[#064B38] text-white p-3 rounded-2xl flex items-center justify-between text-xs animate-in fade-in-50 duration-200">
          <span className="font-semibold">{selectedIds.length} consultation(s) selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportCSV(true)}
              className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Selected (CSV)
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 rounded-xl hover:bg-white/10 text-white/80 font-medium transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* 4. Consultation List Table Container */}
      <div className="bg-white rounded-3xl border border-[#E1EAE4] shadow-sm overflow-hidden">
        {/* Table Top Header Bar */}
        <div className="p-5 border-b border-[#E1EAE4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#064B38]" />
            <h2 className="text-base font-bold text-[#17251F]">
              Consultation List ({totalCount})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="bg-[#064B38] hover:bg-[#0B4F3A] text-white px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Consultation
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E1EAE4] text-[#718078] font-semibold bg-[#FAFCFB]">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={consultations.length > 0 && selectedIds.length === consultations.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#064B38] focus:ring-[#064B38]"
                  />
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap">
                  <span className="flex items-center gap-1">Date & Time ⇅</span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap">
                  <span className="flex items-center gap-1">Patient ⇅</span>
                </th>
                <th className="py-3.5 px-4">Diagnosis / Assessment</th>
                <th className="py-3.5 px-4">Treatment Plan</th>
                <th className="py-3.5 px-4 whitespace-nowrap">
                  <span className="flex items-center gap-1">Status ⇅</span>
                </th>
                <th className="py-3.5 px-4 whitespace-nowrap">Last Updated</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1EAE4]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-[#718078]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064B38] mb-2" />
                    Loading clinical consultations...
                  </td>
                </tr>
              ) : consultations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-[#718078]">
                    No consultations found matching current filter or search criteria.
                  </td>
                </tr>
              ) : (
                consultations.map((cons) => {
                  const pt: any = cons.patientId || {};
                  const appt: any = cons.appointmentId || {};
                  const theme = getPatientAvatarTheme(pt.fullName || "PT");
                  const initials = getInitials(pt.fullName || "PT");
                  const isSelected = selectedIds.includes(cons._id);

                  // Date & Time formatting
                  const rawDate = cons.consultationDate || cons.createdAt;
                  const dateStr = rawDate
                    ? new Date(rawDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "11 Jan 2026";
                  const timeStr = appt.startTime || "Recorded";

                  // Last updated formatting
                  const lastUpdatedStr = cons.updatedAt
                    ? new Date(cons.updatedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }) +
                      ", " +
                      new Date(cons.updatedAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "Just now";

                  return (
                    <tr
                      key={cons._id}
                      className={`hover:bg-[#F9FCFA] transition-colors ${
                        isSelected ? "bg-[#F2F7F4]/50" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(cons._id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#064B38] focus:ring-[#064B38]"
                        />
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-xs text-[#17251F]">{dateStr}</p>
                        <p className="text-[11px] text-[#718078]">{timeStr}</p>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full ${theme.bg} ${theme.text} font-bold text-xs flex items-center justify-center shrink-0`}
                          >
                            {initials}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedPatientProfileId(pt._id)}
                              className="font-semibold text-xs text-[#17251F] hover:underline hover:text-[#064B38] text-left block"
                            >
                              {pt.fullName || "Patient"}
                            </button>
                            <p className="text-[11px] text-[#718078]">
                              #{pt.patientCode || "TG-10235"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Diagnosis / Assessment */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p
                          className="text-xs text-[#17251F] font-medium truncate"
                          title={cons.diagnosis || "Draft in progress"}
                        >
                          {cons.diagnosis || "Draft in progress"}
                        </p>
                      </td>

                      {/* Treatment Plan */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <p
                          className="text-xs text-[#718078] truncate"
                          title={cons.treatmentPlan || "Pending review"}
                        >
                          {cons.treatmentPlan || "Pending review"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cons.isFinalized ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A]">
                            <Lock className="w-3.5 h-3.5" /> Finalized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
                            <FileEdit className="w-3.5 h-3.5" /> Draft
                          </span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#718078] text-xs">
                        {lastUpdatedStr}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {cons.isFinalized ? (
                            <button
                              type="button"
                              onClick={() => setSelectedViewRecordId(cons._id)}
                              className="bg-white border border-[#E1EAE4] hover:bg-gray-50 text-[#17251F] px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Record
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenConsultation(
                                  appt._id || (cons.appointmentId as any),
                                  pt._id,
                                  cons._id
                                )
                              }
                              className="bg-[#064B38] hover:bg-[#0B4F3A] text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors"
                            >
                              Resume Draft
                            </button>
                          )}

                          {/* Context Menu Three-Dots */}
                          <div className="relative action-menu-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionId(openActionId === cons._id ? null : cons._id);
                              }}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openActionId === cons._id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-2xl border border-[#E1EAE4] shadow-xl py-1.5 z-40 text-xs text-left animate-in fade-in-50 duration-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    if (cons.isFinalized) {
                                      setSelectedViewRecordId(cons._id);
                                    } else {
                                      onOpenConsultation(
                                        appt._id || (cons.appointmentId as any),
                                        pt._id,
                                        cons._id
                                      );
                                    }
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#F2F7F4] flex items-center gap-2 text-[#17251F]"
                                >
                                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{cons.isFinalized ? "View Record" : "View Consultation"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    setSelectedPatientProfileId(pt._id);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#F2F7F4] flex items-center gap-2 text-[#17251F]"
                                >
                                  <User className="w-3.5 h-3.5 text-gray-400" />
                                  <span>View Patient Profile</span>
                                </button>

                                {cons.isFinalized && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        setSelectedViewRecordId(cons._id);
                                      }}
                                      className="w-full text-left px-3.5 py-1.5 hover:bg-[#F2F7F4] flex items-center gap-2 text-[#17251F]"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-gray-400" />
                                      <span>Print Record</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        setAmendmentTargetId(cons._id);
                                      }}
                                      className="w-full text-left px-3.5 py-1.5 hover:bg-[#F2F7F4] flex items-center gap-2 text-[#D97706]"
                                    >
                                      <FileEdit className="w-3.5 h-3.5" />
                                      <span>Add Amendment</span>
                                    </button>
                                  </>
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

        {/* 5. Pagination Footer Matching Reference Screenshot */}
        <div className="p-4 border-t border-[#E1EAE4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#718078]">
          <div>
            Showing {startIdx} to {endIdx} of {totalCount} consultations
          </div>

          {/* Page numbers */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#E1EAE4] hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(6, totalPages) }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                type="button"
                onClick={() => setPage(pNum)}
                className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                  page === pNum
                    ? "bg-[#064B38] text-white shadow-sm"
                    : "hover:bg-gray-100 text-[#17251F]"
                }`}
              >
                {pNum}
              </button>
            ))}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#E1EAE4] hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Records per page selector */}
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-transparent border border-[#E1EAE4] focus:border-[#064B38] rounded-xl px-2.5 py-1 text-xs text-[#17251F] outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* New Consultation Modal */}
      <NewConsultationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onStartConsultation={(appointmentId, patientId, consultationId) => {
          onOpenConsultation(appointmentId, patientId, consultationId);
        }}
      />

      {/* Finalized Record Modal */}
      <FinalizedRecordModal
        isOpen={!!selectedViewRecordId}
        onClose={() => setSelectedViewRecordId(null)}
        consultationId={selectedViewRecordId}
        onOpenAmendment={(id) => setAmendmentTargetId(id)}
      />

      {/* Amendment Modal */}
      <ConsultationAmendmentModal
        isOpen={!!amendmentTargetId}
        onClose={() => setAmendmentTargetId(null)}
        consultationId={amendmentTargetId}
        onAmendmentSuccess={() => {
          fetchConsultations();
          fetchSummary();
        }}
      />

      {/* Patient Profile Modal */}
      <PatientQuickProfileModal
        isOpen={!!selectedPatientProfileId}
        onClose={() => setSelectedPatientProfileId(null)}
        patientId={selectedPatientProfileId}
      />
    </div>
  );
}
