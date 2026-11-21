"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  Calendar,
  Clock,
  Ban,
  Search,
  Filter,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  Check,
  Loader2,
  X,
  Phone,
  Mail,
  User,
  HeartPulse,
  AlertCircle,
  ShieldCheck,
  GitMerge,
  Edit3,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import { PatientDirectoryHeader } from "./patients/PatientDirectoryHeader";
import { PatientKpiCards, PatientKpiData } from "./patients/PatientKpiCards";
import { PatientDetailPanel, PatientRecord } from "./patients/PatientDetailPanel";
import { RegisterPatientModal } from "./patients/RegisterPatientModal";
import { EditPatientModal } from "./patients/EditPatientModal";
import { PatientMergeModal } from "./patients/PatientMergeModal";
import { PatientFullProfileModal } from "./patients/PatientFullProfileModal";
import { QuickBookAppointmentModal } from "./patients/QuickBookAppointmentModal";

export function PatientsTab({
  showNotification,
}: {
  showNotification: (msg: string, isErr?: boolean) => void;
}) {
  // 1. Data States
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [kpiData, setKpiData] = useState<PatientKpiData | undefined>(undefined);
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    active: 0,
    new: 0,
    with_appointments: 0,
    followup_due: 0,
    inactive: 0,
  });

  // 2. Loading & Async States
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 3. Tab, Filter & Search States
  const [activeTab, setActiveTab] = useState<
    "all" | "active" | "new" | "with_appointments" | "followup_due" | "inactive"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("all");
  const [clinicalFocusFilter, setClinicalFocusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  // 4. Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // 5. Selection & Row Action States
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // 6. Modal Dialog States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [mergingPatient, setMergingPatient] = useState<PatientRecord | null>(null);
  const [fullProfilePatient, setFullProfilePatient] = useState<PatientRecord | null>(null);
  const [bookingPatient, setBookingPatient] = useState<PatientRecord | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load KPI Statistics & Tab Counts
  const loadStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const res = await api.get<{ kpis: PatientKpiData; tabCounts: any }>("/patients/stats");
      if (res.success && res.data) {
        setKpiData(res.data.kpis);
        if (res.data.tabCounts) {
          setTabCounts(res.data.tabCounts);
        }
      }
    } catch {
      // Ignore non-blocking stats error
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load Patients Directory
  const loadPatients = useCallback(async () => {
    try {
      setIsLoadingPatients(true);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      params.append("tab", activeTab);

      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (genderFilter !== "all") params.append("gender", genderFilter);
      if (bloodGroupFilter !== "all") params.append("bloodGroup", bloodGroupFilter);
      if (clinicalFocusFilter !== "all") params.append("clinicalFocus", clinicalFocusFilter);

      const res = await api.get<{
        patients: PatientRecord[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/patients?${params.toString()}`);

      if (res.success && res.data) {
        setPatients(res.data.patients || []);
        setTotalPatients(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);

        // Auto-select first patient on desktop if none selected
        if (!selectedPatient && res.data.patients && res.data.patients.length > 0) {
          setSelectedPatient(res.data.patients[0]);
        }
      }
    } catch {
      showNotification("Could not load patients list", true);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [
    page,
    limit,
    activeTab,
    debouncedSearch,
    genderFilter,
    bloodGroupFilter,
    clinicalFocusFilter,
    selectedPatient,
    showNotification,
  ]);

  // Initial Load & triggers
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const baseUrl = getBaseUrl();
      const token = getToken();
      const params = new URLSearchParams();
      params.append("tab", activeTab);
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (genderFilter !== "all") params.append("gender", genderFilter);
      if (bloodGroupFilter !== "all") params.append("bloodGroup", bloodGroupFilter);

      const cleanEndpoint = `/patients/export?${params.toString()}`;
      const url = `${baseUrl.replace(/\/+$/, "")}${cleanEndpoint}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Export request failed");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `trigyna_patients_directory_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showNotification("Patient directory exported to CSV successfully");
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to export patients", true);
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle Row Selection
  const handleSelectAll = () => {
    if (selectedRowIds.length === patients.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(patients.map((p) => p._id));
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper for Blood Group Badge styling
  const renderBloodGroupBadge = (bg?: string) => {
    if (!bg) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-gray-100 text-gray-600 border border-gray-200">
          N/A
        </span>
      );
    }

    const map: Record<string, string> = {
      "O+": "bg-rose-50 text-rose-700 border-rose-200",
      "A+": "bg-emerald-50 text-emerald-700 border-emerald-200",
      "B+": "bg-blue-50 text-blue-700 border-blue-200",
      "O-": "bg-pink-50 text-pink-700 border-pink-200",
      "AB+": "bg-purple-50 text-purple-700 border-purple-200",
      "A-": "bg-teal-50 text-teal-700 border-teal-200",
      "B-": "bg-indigo-50 text-indigo-700 border-indigo-200",
      "AB-": "bg-violet-50 text-violet-700 border-violet-200",
    };

    const style = map[bg] || "bg-gray-100 text-gray-700 border-gray-200";
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${style}`}>
        {bg}
      </span>
    );
  };

  // Helper for Clinical Focus & Subtag
  const renderClinicalFocus = (medHistory?: string, allergies?: string[]) => {
    let title = "General Consultation";
    let subtag = "Allergy";
    let tagStyle = "bg-amber-50 text-amber-800 border-amber-200";

    if (medHistory) {
      const parts = medHistory.split("|").map((s) => s.trim());
      title = parts[0] || "General Consultation";
      if (parts[1]) {
        subtag = parts[1];
      } else if (title.includes("PCOS") || title.includes("Menopause")) {
        subtag = "Hormonal";
      } else if (title.includes("Fertility")) {
        subtag = "Preconception";
      } else if (allergies && allergies.length > 0) {
        subtag = "Allergy";
      } else {
        subtag = "General";
      }
    }

    if (subtag.toLowerCase().includes("hormon")) {
      tagStyle = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (subtag.toLowerCase().includes("metabol")) {
      tagStyle = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (subtag.toLowerCase().includes("preconception")) {
      tagStyle = "bg-orange-50 text-orange-800 border-orange-200";
    } else if (subtag.toLowerCase().includes("allergy")) {
      tagStyle = "bg-amber-50 text-amber-800 border-amber-200";
    } else {
      tagStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    return (
      <div>
        <p className="font-semibold text-xs text-[#111827] line-clamp-1">{title}</p>
        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium border mt-0.5 ${tagStyle}`}>
          {subtag}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* 1. Header & Register CTA */}
      <PatientDirectoryHeader
        onRegisterClick={() => setIsRegisterModalOpen(true)}
        onExportClick={handleExportCsv}
        onRefreshClick={() => {
          loadStats();
          loadPatients();
        }}
        isExporting={isExporting}
      />

      {/* 2. Four Dynamic KPI Cards */}
      <PatientKpiCards kpis={kpiData} isLoading={isLoadingStats} />

      {/* 3. Horizontal Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
            activeTab === "all"
              ? "bg-[#087A50] text-white shadow-xs"
              : "bg-white text-[#64748B] hover:text-[#111827] border border-[#E5EAF0]"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Patients ({tabCounts.all})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("active");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
            activeTab === "active"
              ? "bg-[#087A50] text-white shadow-xs"
              : "bg-white text-[#64748B] hover:text-[#111827] border border-[#E5EAF0]"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Active ({tabCounts.active})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("new");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
            activeTab === "new"
              ? "bg-[#087A50] text-white shadow-xs"
              : "bg-white text-[#64748B] hover:text-[#111827] border border-[#E5EAF0]"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New ({tabCounts.new})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("with_appointments");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
            activeTab === "with_appointments"
              ? "bg-[#087A50] text-white shadow-xs"
              : "bg-white text-[#64748B] hover:text-[#111827] border border-[#E5EAF0]"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>With Appointments ({tabCounts.with_appointments})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("followup_due");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
            activeTab === "followup_due"
              ? "bg-[#087A50] text-white shadow-xs"
              : "bg-white text-[#64748B] hover:text-[#111827] border border-[#E5EAF0]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Follow-up Due ({tabCounts.followup_due})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("inactive");
            setPage(1);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
            activeTab === "inactive"
              ? "bg-[#087A50] text-white shadow-xs"
              : "bg-white text-[#64748B] hover:text-[#111827] border border-[#E5EAF0]"
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Inactive ({tabCounts.inactive})</span>
        </button>
      </div>

      {/* 4. Search and Advanced Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, code (TG-P-...), or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl text-[#111827] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087A50] focus:border-[#087A50] transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Action Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:border-[#087A50] cursor-pointer"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>

          {/* Blood Group Filter */}
          <select
            value={bloodGroupFilter}
            onChange={(e) => {
              setBloodGroupFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:border-[#087A50] cursor-pointer font-mono"
          >
            <option value="all">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          {/* Clinical Focus Filter */}
          <select
            value={clinicalFocusFilter}
            onChange={(e) => {
              setClinicalFocusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:border-[#087A50] cursor-pointer"
          >
            <option value="all">All Clinical Focus</option>
            <option value="General Consultation">General Consultation</option>
            <option value="PCOS Care">PCOS Care</option>
            <option value="Fertility Care">Fertility Care</option>
            <option value="Menopause Care">Menopause Care</option>
            <option value="Skin & Hair">Skin &amp; Hair</option>
            <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
          </select>

          {/* Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isAdvancedFilterOpen || genderFilter !== "all" || bloodGroupFilter !== "all"
                ? "bg-emerald-50 text-[#087A50] border-[#087A50]"
                : "bg-white text-[#64748B] border-[#E5EAF0] hover:bg-gray-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-[#F8FAFC] p-0.5 rounded-xl border border-[#E5EAF0]">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-white text-[#087A50] shadow-2xs" : "text-[#94A3B8] hover:text-[#111827]"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-white text-[#087A50] shadow-2xs" : "text-[#94A3B8] hover:text-[#111827]"
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Drawer / Indicator */}
      {isAdvancedFilterOpen && (
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#E5EAF0] p-4 text-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#111827] uppercase tracking-wider text-[11px]">
              Active Filters &amp; Sorting Controls
            </span>
            <button
              type="button"
              onClick={() => {
                setGenderFilter("all");
                setBloodGroupFilter("all");
                setClinicalFocusFilter("all");
                setSearchTerm("");
                setActiveTab("all");
              }}
              className="text-[#087A50] hover:underline font-semibold"
            >
              Reset All Filters
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[#64748B]">
            <span className="p-1.5 px-3 rounded-lg bg-white border border-[#E5EAF0]">
              Showing {patients.length} records matching current criteria
            </span>
          </div>
        </div>
      )}

      {/* 5. Main Split View: Left Table + Right Persistent Patient Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* Left Side: Patient Directory Table */}
        <div className={`w-full transition-all duration-300 ${selectedPatient ? "lg:flex-1 min-w-0" : "w-full"}`}>
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xs overflow-hidden flex flex-col">
            {isLoadingPatients ? (
              <div className="py-20 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-[#087A50]" />
                <span className="text-xs font-medium">Fetching real patient directory...</span>
              </div>
            ) : patients.length === 0 ? (
              <div className="py-20 text-center text-[#64748B] flex flex-col items-center justify-center p-6">
                <User className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-[#111827]">No patient records match the selected criteria</p>
                <p className="text-xs text-[#64748B] mt-1">Try clearing search filters or registering a new patient.</p>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Register Patient
                </button>
              </div>
            ) : (
              <>
                {/* Table View */}
                {viewMode === "list" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="border-b border-[#E5EAF0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-3.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedRowIds.length === patients.length && patients.length > 0}
                              onChange={handleSelectAll}
                              className="rounded-md border-[#D5E5DA] text-[#087A50] focus:ring-[#087A50] cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-3.5 whitespace-nowrap">PATIENT CODE</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">PATIENT (NAME &amp; AGE)</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">CONTACT</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">BLOOD GROUP</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">CLINICAL FOCUS</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">REGISTERED</th>
                          <th className="py-3 px-3.5 text-right whitespace-nowrap">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EAF0]/80">
                        {patients.map((p) => {
                          const isSelected = selectedPatient?._id === p._id;
                          const isChecked = selectedRowIds.includes(p._id);

                          return (
                            <tr
                              key={p._id}
                              onClick={() => setSelectedPatient(p)}
                              className={`transition-colors cursor-pointer group ${
                                isSelected
                                  ? "bg-[#EAF5ED]/50 hover:bg-[#EAF5ED]/70"
                                  : "hover:bg-[#F8FAFC]"
                              }`}
                            >
                              {/* Checkbox */}
                              <td
                                className="py-3.5 px-3.5 text-center"
                                onClick={(e) => handleSelectRow(p._id, e)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="rounded-md border-[#D5E5DA] text-[#087A50] focus:ring-[#087A50] cursor-pointer"
                                />
                              </td>

                              {/* Patient Code */}
                              <td className="py-3.5 px-3.5 whitespace-nowrap">
                                <span className="font-mono font-bold text-xs text-[#087A50] bg-[#EAF5ED] px-2 py-0.5 rounded-md border border-[#D5E5DA]">
                                  {p.patientCode}
                                </span>
                              </td>

                              {/* Name & Age */}
                              <td className="py-3.5 px-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[#087A50] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-gray-200">
                                    {p.fullName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")
                                      .toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#111827] text-xs group-hover:text-[#087A50] transition-colors truncate max-w-[150px]">
                                      {p.fullName}
                                    </p>
                                    <p className="text-[11px] text-[#64748B] capitalize">
                                      {p.gender} • {p.age || 44} Yrs
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="py-3.5 px-3.5 font-mono whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-[#111827] text-[11px] font-semibold">
                                  <Phone className="w-3 h-3 text-[#087A50]" />
                                  <span>{p.phone}</span>
                                </div>
                                {p.email && (
                                  <div className="flex items-center gap-1 text-[10px] text-[#64748B] font-sans truncate max-w-[150px]">
                                    <Mail className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{p.email}</span>
                                  </div>
                                )}
                              </td>

                              {/* Blood Group */}
                              <td className="py-3.5 px-3.5 whitespace-nowrap">
                                {renderBloodGroupBadge(p.bloodGroup)}
                              </td>

                              {/* Clinical Focus */}
                              <td className="py-3.5 px-3.5 min-w-[150px]">
                                {renderClinicalFocus(p.medicalHistory, p.allergies)}
                              </td>

                              {/* Registered Date */}
                              <td className="py-3.5 px-3.5 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                                {p.createdAt
                                  ? new Date(p.createdAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "31 Oct 2026"}
                              </td>

                              {/* Actions Column */}
                              <td
                                className="py-3.5 px-3.5 text-right whitespace-nowrap relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View / Select Button */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPatient(p)}
                                    title="View Overview"
                                    className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:text-[#087A50] hover:bg-emerald-50 transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* More Options Dropdown Toggle */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenActionMenuId(openActionMenuId === p._id ? null : p._id)
                                    }
                                    title="More Options"
                                    className="p-1.5 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] hover:bg-gray-100 transition-colors cursor-pointer"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Action Popup Menu */}
                                  {openActionMenuId === p._id && (
                                    <div className="absolute right-3.5 top-10 w-44 bg-white rounded-xl shadow-xl border border-[#E5EAF0] py-1 z-30 animate-fade-in text-xs text-left">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedPatient(p);
                                          setFullProfilePatient(p);
                                          setOpenActionMenuId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-[#111827] hover:bg-[#F8FAFC] flex items-center gap-2"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-[#087A50]" />
                                        <span>Full EHR Profile</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPatient(p);
                                          setOpenActionMenuId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-[#111827] hover:bg-[#F8FAFC] flex items-center gap-2"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Edit Details</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBookingPatient(p);
                                          setOpenActionMenuId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-[#111827] hover:bg-[#F8FAFC] flex items-center gap-2"
                                      >
                                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Book Appointment</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMergingPatient(p);
                                          setOpenActionMenuId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-[#111827] hover:bg-[#F8FAFC] flex items-center gap-2"
                                      >
                                        <GitMerge className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Duplicate Merge</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Grid Card View */
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {patients.map((p) => {
                      const isSelected = selectedPatient?._id === p._id;
                      return (
                        <div
                          key={p._id}
                          onClick={() => setSelectedPatient(p)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                            isSelected
                              ? "border-[#087A50] bg-emerald-50/30 shadow-xs"
                              : "border-[#E5EAF0] bg-white hover:border-[#087A50]/50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-full bg-[#087A50] text-white flex items-center justify-center font-bold text-xs">
                                {p.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div>
                                <span className="font-mono font-bold text-[10px] text-[#087A50] bg-[#EAF5ED] px-1.5 py-0.2 rounded border border-[#D5E5DA]">
                                  {p.patientCode}
                                </span>
                                <h4 className="font-bold text-xs text-[#111827] mt-0.5">{p.fullName}</h4>
                                <p className="text-[11px] text-[#64748B] capitalize">
                                  {p.gender} • {p.age || 44} Yrs
                                </p>
                              </div>
                            </div>
                            {renderBloodGroupBadge(p.bloodGroup)}
                          </div>

                          <div className="pt-2 border-t border-[#E5EAF0]/60 flex items-center justify-between text-[11px] text-[#64748B]">
                            <span className="font-mono text-[#087A50] font-semibold">{p.phone}</span>
                            <span className="font-mono">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Table Footer / Pagination */}
                <div className="p-3.5 sm:p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
                  {/* Total info */}
                  <div>
                    Showing{" "}
                    <span className="font-semibold text-[#111827]">
                      {patients.length > 0 ? (page - 1) * limit + 1 : 0}–
                      {Math.min(page * limit, totalPatients)}
                    </span>{" "}
                    of <span className="font-semibold text-[#111827]">{totalPatients}</span> patients
                  </div>

                  {/* Limit per page & page buttons */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setPage(1);
                        }}
                        className="px-2 py-1 bg-[#F8FAFC] border border-[#E5EAF0] rounded-lg text-xs text-[#111827] cursor-pointer"
                      >
                        <option value="10">10 per page</option>
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPage(num)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            page === num
                              ? "bg-[#087A50] text-white"
                              : "border border-[#E5EAF0] text-[#64748B] hover:bg-gray-50"
                          }`}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1 rounded-lg border border-[#E5EAF0] text-[#64748B] hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Selected Patient Profile Panel */}
        {selectedPatient && (
          <div className="w-full lg:w-[380px] xl:w-[410px] 2xl:w-[440px] shrink-0 sticky top-4">
            <PatientDetailPanel
              patient={selectedPatient}
              onClose={() => setSelectedPatient(null)}
              onEditClick={(p) => setEditingPatient(p)}
              onBookAppointmentClick={(p) => setBookingPatient(p)}
              onViewFullProfileClick={(p) => setFullProfilePatient(p)}
              onMergeClick={(p) => setMergingPatient(p)}
            />
          </div>
        )}
      </div>

      {/* 6. Modals */}
      {/* A. Register New Patient */}
      <RegisterPatientModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={(newP) => {
          loadStats();
          loadPatients();
          setSelectedPatient(newP);
        }}
        showNotification={showNotification}
      />

      {/* B. Edit Patient Profile */}
      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          isOpen={!!editingPatient}
          onClose={() => setEditingPatient(null)}
          onSuccess={(updated) => {
            loadStats();
            loadPatients();
            if (selectedPatient?._id === updated._id) {
              setSelectedPatient(updated);
            }
          }}
          showNotification={showNotification}
        />
      )}

      {/* C. Duplicate Merge Safety */}
      {mergingPatient && (
        <PatientMergeModal
          canonicalPatient={mergingPatient}
          isOpen={!!mergingPatient}
          onClose={() => setMergingPatient(null)}
          onSuccess={() => {
            loadStats();
            loadPatients();
          }}
          showNotification={showNotification}
        />
      )}

      {/* D. Full EHR Profile Modal */}
      {fullProfilePatient && (
        <PatientFullProfileModal
          patient={fullProfilePatient}
          isOpen={!!fullProfilePatient}
          onClose={() => setFullProfilePatient(null)}
          onEditClick={(p) => {
            setFullProfilePatient(null);
            setEditingPatient(p);
          }}
          onBookAppointmentClick={(p) => {
            setFullProfilePatient(null);
            setBookingPatient(p);
          }}
        />
      )}

      {/* E. Quick Book Appointment */}
      {bookingPatient && (
        <QuickBookAppointmentModal
          patient={bookingPatient}
          isOpen={!!bookingPatient}
          onClose={() => setBookingPatient(null)}
          onSuccess={() => {
            loadStats();
            loadPatients();
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}
