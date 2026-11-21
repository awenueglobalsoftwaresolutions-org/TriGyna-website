"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  Video,
  Building,
  MoreVertical,
  Eye,
  Check,
  X,
  Stethoscope,
  Send,
  CalendarClock,
  SlidersHorizontal,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import {
  FollowUpItem,
  FollowUpStats,
  CalendarResponse,
  UpcomingItem,
  OptionItem,
} from "./followups/types";
import { FollowUpHeader } from "./followups/FollowUpHeader";
import { FollowUpKpiCards } from "./followups/FollowUpKpiCards";
import { FollowUpCalendarWidget } from "./followups/FollowUpCalendarWidget";
import { FollowUpUpcomingWidget } from "./followups/FollowUpUpcomingWidget";
import { FollowUpStatusTabs } from "./followups/FollowUpStatusTabs";
import { FollowUpFilterToolbar } from "./followups/FollowUpFilterToolbar";
import { FollowUpDetailDrawer } from "./followups/FollowUpDetailDrawer";
import { ScheduleFollowUpModal, ScheduleFormData } from "./followups/ScheduleFollowUpModal";
import { CompleteFollowUpModal, CompleteFormData } from "./followups/CompleteFollowUpModal";
import { RescheduleFollowUpModal } from "./followups/RescheduleFollowUpModal";
import { MarkMissedModal } from "./followups/MarkMissedModal";
import { SendReminderModal } from "./followups/SendReminderModal";

export function FollowUpsTab({
  showNotification,
}: {
  showNotification: (msg: string, isErr?: boolean) => void;
}) {
  // Main Data States
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [upcomingList, setUpcomingList] = useState<UpcomingItem[]>([]);
  const [patients, setPatients] = useState<OptionItem[]>([]);
  const [doctors, setDoctors] = useState<OptionItem[]>([]);

  // Loading & Pagination States
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & View States
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const format = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${format(firstDay)} - ${format(lastDay)}`;
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Modals & Drawers States
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [completeModalItem, setCompleteModalItem] = useState<FollowUpItem | null>(null);
  const [rescheduleModalItem, setRescheduleModalItem] = useState<FollowUpItem | null>(null);
  const [missedModalItem, setMissedModalItem] = useState<FollowUpItem | null>(null);
  const [reminderModalItem, setReminderModalItem] = useState<FollowUpItem | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Load Follow-ups from Backend
  const loadFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeTab && activeTab !== "all") params.append("tab", activeTab);
      if (doctorFilter && doctorFilter !== "all") params.append("doctorId", doctorFilter);
      if (modeFilter && modeFilter !== "all") params.append("mode", modeFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());
      if (selectedCalendarDate) params.append("date", selectedCalendarDate);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await api.get<{
        followUps: FollowUpItem[];
        total: number;
        page: number;
        totalPages: number;
        stats: FollowUpStats;
      }>(`/clinical/follow-ups?${params.toString()}`);

      if (res.data) {
        setFollowUps(res.data.followUps || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: unknown) {
      showNotification("Failed to load follow-up records", true);
    } finally {
      setIsLoading(false);
    }
  }, [
    activeTab,
    doctorFilter,
    modeFilter,
    statusFilter,
    search,
    selectedCalendarDate,
    page,
    limit,
    showNotification,
  ]);

  // Load KPI Stats, Calendar & Upcoming Widgets
  const loadWidgetsData = useCallback(async () => {
    try {
      const [statsRes, calRes, upcomingRes] = await Promise.all([
        api.get<FollowUpStats>("/clinical/follow-ups/stats"),
        api.get<CalendarResponse>("/clinical/follow-ups/calendar?year=2026&month=10"),
        api.get<{ upcoming: UpcomingItem[] }>("/clinical/follow-ups/upcoming"),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (calRes.data) setCalendarData(calRes.data);
      if (upcomingRes.data?.upcoming) setUpcomingList(upcomingRes.data.upcoming);
    } catch {
      // Ignore background widget fetch issues
    }
  }, []);

  // Load Dropdowns (Patients & Doctors)
  const loadDropdowns = useCallback(async () => {
    try {
      const [patRes, docRes] = await Promise.all([
        api.get<{ patients: OptionItem[] }>("/patients?limit=100"),
        api.get<{ doctors: OptionItem[] }>("/doctors?status=active"),
      ]);
      if (patRes.data?.patients) setPatients(patRes.data.patients);
      if (docRes.data?.doctors) setDoctors(docRes.data.doctors);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    loadDropdowns();
    loadWidgetsData();
  }, [loadDropdowns, loadWidgetsData]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  // Handle Close Action Menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".action-menu-container")) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Handlers for Modals & Workflows
  const handleScheduleSubmit = async (formData: ScheduleFormData) => {
    try {
      const res = await api.post<{ followUp: FollowUpItem }>("/clinical/follow-ups", formData);
      if (res.success) {
        showNotification(
          `Follow-up ${res.data?.followUp.followUpCode || ""} scheduled successfully!`
        );
        loadFollowUps();
        loadWidgetsData();
      } else {
        showNotification(res.message || "Failed to schedule follow-up", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error creating follow-up", true);
    }
  };

  const handleCompleteSubmit = async (data: CompleteFormData) => {
    if (!completeModalItem) return;
    try {
      const res = await api.post<{ followUp: FollowUpItem }>(
        `/clinical/follow-ups/${completeModalItem._id}/complete`,
        data
      );
      if (res.success) {
        showNotification(`Follow-up ${completeModalItem.followUpCode} completed successfully!`);
        loadFollowUps();
        loadWidgetsData();
      } else {
        showNotification(res.message || "Completion failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error completing follow-up", true);
    }
  };

  const handleRescheduleSubmit = async (
    newDate: string,
    newTime: string,
    reason: string,
    mode?: string
  ) => {
    if (!rescheduleModalItem) return;
    try {
      const res = await api.post<{ followUp: FollowUpItem }>(
        `/clinical/follow-ups/${rescheduleModalItem._id}/reschedule`,
        { newDate, newTime, reason, mode }
      );
      if (res.success) {
        showNotification(`Follow-up ${rescheduleModalItem.followUpCode} rescheduled successfully!`);
        loadFollowUps();
        loadWidgetsData();
      } else {
        showNotification(res.message || "Reschedule failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error rescheduling follow-up", true);
    }
  };

  const handleMarkMissedSubmit = async (reason: string) => {
    if (!missedModalItem) return;
    try {
      const res = await api.post<{ followUp: FollowUpItem }>(
        `/clinical/follow-ups/${missedModalItem._id}/mark-missed`,
        { reason }
      );
      if (res.success) {
        showNotification(`Follow-up ${missedModalItem.followUpCode} marked as missed`);
        loadFollowUps();
        loadWidgetsData();
      } else {
        showNotification(res.message || "Failed to mark missed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error marking missed", true);
    }
  };

  const handleSendReminderSubmit = async (channel: "whatsapp" | "email", customMessage: string) => {
    if (!reminderModalItem) return;
    try {
      const res = await api.post(
        `/clinical/follow-ups/${reminderModalItem._id}/remind`,
        { channel, customMessage }
      );
      if (res.success) {
        showNotification(`Reminder dispatched via ${channel.toUpperCase()}`);
        loadFollowUps();
      } else {
        showNotification(res.message || "Failed to send reminder", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error sending reminder", true);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const token = getToken();
      const params = new URLSearchParams();
      if (activeTab !== "all") params.append("status", activeTab);
      if (doctorFilter !== "all") params.append("doctorId", doctorFilter);
      if (modeFilter !== "all") params.append("mode", modeFilter);
      if (search.trim()) params.append("search", search.trim());

      const url = `${getBaseUrl()}/clinical/follow-ups/export?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `trigyna-followups-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showNotification("Follow-up CSV exported successfully!");
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Export failed", true);
    } finally {
      setIsExporting(false);
    }
  };

  // Checkbox Selection
  const toggleSelectAll = () => {
    if (selectedRows.size === followUps.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(followUps.map((f) => f._id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Helpers for UI display
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getAvatarStyle = (name: string) => {
    const charCode = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    const styles = [
      "bg-emerald-100 text-[#087A50] border-emerald-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-rose-100 text-rose-700 border-rose-200",
    ];
    return styles[charCode % styles.length];
  };

  const formatDueDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate().toString().padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (doctorFilter !== "all") count++;
    if (modeFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (selectedCalendarDate) count++;
    return count;
  }, [doctorFilter, modeFilter, statusFilter, selectedCalendarDate]);

  const handleResetFilters = () => {
    setDoctorFilter("all");
    setModeFilter("all");
    setStatusFilter("all");
    setSelectedCalendarDate(null);
    setSearch("");
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <FollowUpHeader
        onScheduleClick={() => setIsScheduleModalOpen(true)}
        onExportClick={handleExportCsv}
        isExporting={isExporting}
      />

      {/* 2. Top Grid: KPI Cards + Calendar Widget + Upcoming Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* KPI Cards (4 in 2x2 grid) */}
        <div className="lg:col-span-5">
          <FollowUpKpiCards
            stats={stats}
            onCardClick={(tabKey) => {
              setActiveTab(tabKey);
              setPage(1);
            }}
          />
        </div>

        {/* Calendar Widget */}
        <div className="lg:col-span-3">
          <FollowUpCalendarWidget
            calendarData={calendarData}
            selectedDate={selectedCalendarDate}
            onSelectDate={(date) => {
              setSelectedCalendarDate(date);
              setPage(1);
            }}
          />
        </div>

        {/* Upcoming (Next 7 Days) Widget */}
        <div className="lg:col-span-4">
          <FollowUpUpcomingWidget
            upcomingList={upcomingList}
            onViewAllClick={() => {
              setActiveTab("upcoming");
              setSelectedCalendarDate(null);
              setPage(1);
            }}
            onItemClick={(id) => {
              const item = followUps.find((f) => f._id === id);
              if (item) {
                setSelectedFollowUp(item);
                setIsDetailDrawerOpen(true);
              }
            }}
          />
        </div>
      </div>

      {/* 3. Status Tabs Navigation */}
      <div className="pt-1">
        <FollowUpStatusTabs
          activeTab={activeTab}
          onTabChange={(tabKey) => {
            setActiveTab(tabKey);
            setPage(1);
          }}
          stats={stats}
        />
      </div>

      {/* 4. Filters & Search Toolbar */}
      <FollowUpFilterToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        doctorFilter={doctorFilter}
        onDoctorFilterChange={(val) => {
          setDoctorFilter(val);
          setPage(1);
        }}
        modeFilter={modeFilter}
        onModeFilterChange={(val) => {
          setModeFilter(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        doctors={doctors}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
      />

      {/* 5. Main Follow-ups Table / Grid View */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#087A50]" />
            <span>Loading follow-up schedules &amp; recovery records...</span>
          </div>
        ) : followUps.length === 0 ? (
          <div className="py-20 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-2">
            <CalendarClock className="w-10 h-10 text-gray-300 stroke-1" />
            <p className="font-semibold text-sm text-[#111827]">No follow-up records found</p>
            <p className="text-[11px] text-[#64748B] max-w-sm">
              No follow-ups match your active filter criteria. Try resetting filters or schedule a new
              follow-up.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 text-xs font-semibold text-[#087A50] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* Desktop & Tablet Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] bg-[#F8FAF9] text-[#64748B] font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === followUps.length && followUps.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-[#087A50] focus:ring-[#087A50]"
                    />
                  </th>
                  <th className="py-3 px-3.5">Follow-up Code</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Due Date &amp; Time</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Plan / Outcome</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {followUps.map((item) => {
                  const pName = item.patientId?.fullName || "Patient";
                  const pCode = item.patientId?.patientCode || "TG0000";
                  const pPhone = item.patientId?.phone || "";
                  const docName = item.doctorId?.userId?.name || "Dr. Ananya Sharma";
                  const isChecked = selectedRows.has(item._id);

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-[#F8FAF9]/80 transition-colors ${
                        isChecked ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(item._id)}
                          className="rounded text-[#087A50] focus:ring-[#087A50]"
                        />
                      </td>

                      {/* Follow-up Code */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <span className="inline-block bg-[#E8F5E9] text-[#087A50] border border-emerald-200/80 font-bold text-xs px-2.5 py-1 rounded-lg">
                          {item.followUpCode}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${getAvatarStyle(
                              pName
                            )}`}
                          >
                            {getInitials(pName)}
                          </div>
                          <div>
                            <span className="font-bold text-[#111827] block text-xs">{pName}</span>
                            <span className="text-[11px] text-[#64748B] font-mono block mt-0.5">
                              {pCode} {pPhone ? `• ${pPhone}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#111827] font-medium">
                          <Stethoscope className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                          <span className="truncate">{docName}</span>
                        </div>
                      </td>

                      {/* Due Date & Time */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                          <Calendar className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                          <span>{formatDueDate(item.dueDate)}</span>
                        </div>
                        <div className="text-[11px] text-[#64748B] ml-5 mt-0.5">
                          {item.scheduledTime || "11:00 AM"}
                        </div>
                      </td>

                      {/* Mode Badge */}
                      <td className="py-3.5 px-4">
                        {item.mode.toLowerCase().includes("video") ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] text-[11px] font-semibold whitespace-nowrap">
                            <Video className="w-3.5 h-3.5 text-[#2563EB]" />
                            <span>Video Consultation</span>
                          </span>
                        ) : item.mode.toLowerCase().includes("clinic") ||
                          item.mode.toLowerCase().includes("person") ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] text-[11px] font-semibold whitespace-nowrap">
                            <Building className="w-3.5 h-3.5 text-[#EA580C]" />
                            <span>In-Clinic Consultation</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] text-[11px] font-semibold whitespace-nowrap">
                            <Phone className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span>Phone Follow-Up</span>
                          </span>
                        )}
                      </td>

                      {/* Plan / Outcome */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-[#475569] text-xs leading-relaxed">
                          {item.outcomeNotes ||
                            item.outcome ||
                            item.planInstructions ||
                            "Care review pending."}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                            item.status === "completed"
                              ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                              : item.status === "missed"
                              ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                              : item.status === "overdue"
                              ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]"
                              : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 relative action-menu-container">
                          {/* Eye button for detail drawer */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFollowUp(item);
                              setIsDetailDrawerOpen(true);
                            }}
                            title="View Full Follow-up Details"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#087A50] hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 3-dots action dropdown */}
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuOpenId(
                                actionMenuOpenId === item._id ? null : item._id
                              )
                            }
                            title="More Actions"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#111827] hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Action Popover Menu */}
                          {actionMenuOpenId === item._id && (
                            <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-xl shadow-lg border border-[#E5EAF0] py-1 text-left text-xs animate-in fade-in duration-100">
                              {item.status !== "completed" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    setCompleteModalItem(item);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Complete Follow-up</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setRescheduleModalItem(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-[#111827] flex items-center gap-2"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reschedule Slot</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setReminderModalItem(item);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-[#111827] flex items-center gap-2"
                              >
                                <Send className="w-3.5 h-3.5 text-[#087A50]" />
                                <span>Send Reminder</span>
                              </button>
                              {item.status !== "missed" && item.status !== "completed" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    setMissedModalItem(item);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2 border-t border-[#F1F5F9]"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Mark Missed</span>
                                </button>
                              )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {followUps.map((item) => {
              const pName = item.patientId?.fullName || "Patient";
              const pCode = item.patientId?.patientCode || "TG0000";
              const docName = item.doctorId?.userId?.name || "Dr. Ananya Sharma";

              return (
                <div
                  key={item._id}
                  className="bg-white border border-[#E5EAF0] rounded-2xl p-4 space-y-3 hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <span className="bg-[#E8F5E9] text-[#087A50] font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {item.followUpCode}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.status === "completed"
                          ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                          : item.status === "missed"
                          ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                          : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarStyle(
                        pName
                      )}`}
                    >
                      {getInitials(pName)}
                    </div>
                    <div>
                      <span className="font-bold text-[#111827] text-xs block">{pName}</span>
                      <span className="text-[11px] text-[#64748B] font-mono">{pCode}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-gray-50 rounded-xl space-y-1.5 text-xs border border-gray-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B]">Consultant:</span>
                      <span className="font-medium text-[#111827]">{docName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B]">Due Date:</span>
                      <span className="font-mono text-[#111827] font-semibold">
                        {formatDueDate(item.dueDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B]">Slot:</span>
                      <span className="text-[#111827]">{item.scheduledTime || "11:00 AM"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFollowUp(item);
                        setIsDetailDrawerOpen(true);
                      }}
                      className="text-xs text-[#087A50] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                    {item.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => setCompleteModalItem(item)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg hover:bg-emerald-100 cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Table Pagination Footer */}
        <div className="p-4 border-t border-[#E5EAF0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing{" "}
            <span className="font-semibold text-[#111827]">
              {total === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-semibold text-[#111827]">{total}</span> follow-ups
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-xs border border-[#E5EAF0] rounded-lg bg-white text-[#111827] focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5EAF0] hover:bg-gray-50 text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      page === p
                        ? "bg-[#087A50] text-white shadow-2xs"
                        : "text-[#111827] hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5EAF0] hover:bg-gray-50 text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Slide-over Detail Drawer */}
      <FollowUpDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedFollowUp(null);
        }}
        followUp={selectedFollowUp}
        onCompleteClick={() => {
          if (selectedFollowUp) setCompleteModalItem(selectedFollowUp);
        }}
        onRescheduleClick={() => {
          if (selectedFollowUp) setRescheduleModalItem(selectedFollowUp);
        }}
        onSendReminderClick={() => {
          if (selectedFollowUp) setReminderModalItem(selectedFollowUp);
        }}
      />

      {/* 8. Schedule Follow-up Modal */}
      <ScheduleFollowUpModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSubmit={handleScheduleSubmit}
        patients={patients}
        doctors={doctors}
      />

      {/* 9. Complete Follow-up Modal */}
      <CompleteFollowUpModal
        isOpen={Boolean(completeModalItem)}
        onClose={() => setCompleteModalItem(null)}
        followUp={completeModalItem}
        onComplete={handleCompleteSubmit}
      />

      {/* 10. Reschedule Follow-up Modal */}
      <RescheduleFollowUpModal
        isOpen={Boolean(rescheduleModalItem)}
        onClose={() => setRescheduleModalItem(null)}
        followUp={rescheduleModalItem}
        onReschedule={handleRescheduleSubmit}
      />

      {/* 11. Mark Missed Modal */}
      <MarkMissedModal
        isOpen={Boolean(missedModalItem)}
        onClose={() => setMissedModalItem(null)}
        followUp={missedModalItem}
        onConfirm={handleMarkMissedSubmit}
      />

      {/* 12. Send Reminder Modal */}
      <SendReminderModal
        isOpen={Boolean(reminderModalItem)}
        onClose={() => setReminderModalItem(null)}
        followUp={reminderModalItem}
        onSend={handleSendReminderSubmit}
      />
    </div>
  );
}
