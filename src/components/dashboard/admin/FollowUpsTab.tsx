"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Check,
  X,
  RefreshCw,
  Phone,
  Video,
  Building,
  MessageSquare,
  Filter,
  User,
  Stethoscope,
  ChevronRight,
  CalendarClock,
  FileCheck,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface FollowUpItem {
  _id: string;
  followUpCode: string;
  patientId?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
    email?: string;
  };
  doctorId?: {
    _id: string;
    userId?: {
      name: string;
      phone?: string;
    };
  };
  serviceName: string;
  dueDate: string;
  scheduledTime?: string;
  mode: "call" | "whatsapp" | "in_person" | "video";
  status: "scheduled" | "in_progress" | "completed" | "missed" | "cancelled";
  planInstructions?: string;
  outcomeNotes?: string;
  createdAt: string;
}

interface OptionItem {
  _id: string;
  fullName?: string;
  name?: string;
  patientCode?: string;
  phone?: string;
  userId?: { name: string };
}

export function FollowUpsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [patients, setPatients] = useState<OptionItem[]>([]);
  const [doctors, setDoctors] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState<{ id: string; status: string; notes: string } | null>(null);

  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    serviceName: "Constitutional Homoeopathy Follow-up",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    scheduledTime: "11:30",
    mode: "call" as FollowUpItem["mode"],
    planInstructions: "Assess menstrual regulation, symptom progression, and adjust potency if needed.",
  });

  const loadFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await api.get<{ followUps: FollowUpItem[] }>(`/clinical/follow-ups?${params.toString()}`);
      if (res.data?.followUps) {
        setFollowUps(res.data.followUps);
      }
    } catch {
      showNotification("Failed to load care follow-ups", true);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showNotification]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [patRes, docRes] = await Promise.all([
        api.get<{ patients: OptionItem[] }>("/patients?limit=50"),
        api.get<{ doctors: OptionItem[] }>("/doctors?status=active"),
      ]);
      if (patRes.data?.patients) setPatients(patRes.data.patients);
      if (docRes.data?.doctors) setDoctors(docRes.data.doctors);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadFollowUps();
    loadDropdowns();
  }, [loadFollowUps, loadDropdowns]);

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.dueDate) {
      showNotification("Please select a patient and due date", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ followUp: FollowUpItem }>("/clinical/follow-ups", {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        serviceName: form.serviceName,
        dueDate: form.dueDate,
        scheduledTime: form.scheduledTime,
        mode: form.mode,
        planInstructions: form.planInstructions,
      });

      if (res.success) {
        showNotification(`Follow-up ${res.data?.followUp.followUpCode || ""} scheduled successfully!`);
        setIsAddModalOpen(false);
        loadFollowUps();
      } else {
        showNotification(res.message || "Failed to schedule follow-up", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error creating follow-up", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const res = await api.patch<{ followUp: FollowUpItem }>(`/clinical/follow-ups/${id}`, {
        status,
        outcomeNotes: notes,
      });
      if (res.success) {
        showNotification(`Follow-up marked as ${status}`);
        setOutcomeModal(null);
        loadFollowUps();
      } else {
        showNotification(res.message || "Update failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error updating follow-up", true);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const dueTodayCount = followUps.filter((f) => f.dueDate?.startsWith(todayStr) && f.status === "scheduled").length;
  const completedCount = followUps.filter((f) => f.status === "completed").length;
  const missedCount = followUps.filter((f) => f.status === "missed").length;

  const filtered = followUps.filter((f) => {
    const code = f.followUpCode?.toLowerCase() || "";
    const pName = f.patientId?.fullName?.toLowerCase() || "";
    const pPhone = f.patientId?.phone || "";
    const doc = f.doctorId?.userId?.name?.toLowerCase() || "";
    const q = search.toLowerCase();
    return code.includes(q) || pName.includes(q) || pPhone.includes(q) || doc.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#154734]/10 text-[#154734] flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-[#18231D]">Follow-up & Recovery Management</h2>
                <p className="text-xs text-[#68756D] mt-0.5">
                  Post-consultation symptom reviews, regimen adjustments, and holistic recovery tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (patients.length > 0 && !form.patientId) {
                  setForm((prev) => ({ ...prev, patientId: patients[0]._id }));
                }
                if (doctors.length > 0 && !form.doctorId) {
                  setForm((prev) => ({ ...prev, doctorId: doctors[0]._id }));
                }
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Follow-up</span>
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#E2E9E3]">
          <div className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#68756D] uppercase tracking-wider">Total Enqueued</span>
              <p className="text-xl font-bold font-mono text-[#18231D] mt-1">{followUps.length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-[#18231D] flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wider">Due Today</span>
              <p className="text-xl font-bold font-mono text-amber-900 mt-1">{dueTodayCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">Completed</span>
              <p className="text-xl font-bold font-mono text-emerald-900 mt-1">{completedCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-red-50/60 border border-red-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-red-800 uppercase tracking-wider">Missed / Overdue</span>
              <p className="text-xl font-bold font-mono text-red-900 mt-1">{missedCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 pt-4 border-t border-[#E2E9E3] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code, patient name, phone, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none bg-white text-[#18231D]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
            <button
              onClick={loadFollowUps}
              title="Refresh list"
              className="p-2 border border-[#E2E9E3] rounded-xl hover:bg-gray-50 text-[#154734] cursor-pointer transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
            <span>Loading follow-up schedules...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-2">
            <CalendarClock className="w-8 h-8 text-gray-300" />
            <p className="font-medium text-[#18231D]">No care follow-up records found</p>
            <p className="text-[11px] text-[#68756D]">Try adjusting your search criteria or schedule a new follow-up.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Due Date &amp; Slot</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Plan / Outcome</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {filtered.map((item) => (
                    <tr key={item._id} className="hover:bg-[#F7F9F7]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#154734]">{item.followUpCode}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#18231D]">{item.patientId?.fullName || "Patient"}</div>
                        <div className="text-[11px] text-[#68756D] font-mono mt-0.5">
                          {item.patientId?.patientCode} • {item.patientId?.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#18231D] font-medium">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-[#154734]" />
                          <span>{item.doctorId?.userId?.name || "Assigned Consultant"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-[#18231D]">
                          {new Date(item.dueDate).toISOString().split("T")[0]}
                        </div>
                        <div className="text-[11px] text-[#68756D]">{item.scheduledTime || "11:00 AM"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px] flex items-center gap-1 w-fit">
                          {item.mode === "call" && <Phone className="w-3 h-3 text-[#154734]" />}
                          {item.mode === "whatsapp" && <MessageSquare className="w-3 h-3 text-emerald-600" />}
                          {item.mode === "video" && <Video className="w-3 h-3 text-blue-600" />}
                          {item.mode === "in_person" && <Building className="w-3 h-3 text-amber-600" />}
                          <span>{item.mode}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#68756D] max-w-xs">
                        <span className="line-clamp-2">
                          {item.outcomeNotes || item.planInstructions || "Routine care check"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            item.status === "completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.status === "missed"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => setOutcomeModal({ id: item._id, status: "completed", notes: "" })}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] cursor-pointer transition-colors"
                                title="Mark Follow-up Done"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(item._id, "missed")}
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[11px] cursor-pointer transition-colors"
                                title="Mark Follow-up Missed"
                              >
                                Missed
                              </button>
                            </>
                          )}
                          {item.status === "completed" && (
                            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden divide-y divide-[#E2E9E3]">
              {filtered.map((item) => (
                <div key={item._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#154734]">{item.followUpCode}</span>
                      <h4 className="font-semibold text-sm text-[#18231D] mt-0.5">{item.patientId?.fullName || "Patient"}</h4>
                      <p className="text-[11px] text-[#68756D] font-mono">{item.patientId?.patientCode} • {item.patientId?.phone}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.status === "completed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : item.status === "missed"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F7F9F7] p-2.5 rounded-xl border border-[#E2E9E3]">
                    <div>
                      <span className="text-[#68756D] block">Due Date & Time</span>
                      <span className="font-mono font-medium text-[#18231D]">
                        {new Date(item.dueDate).toISOString().split("T")[0]} {item.scheduledTime || "11:00 AM"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#68756D] block">Mode</span>
                      <span className="font-medium text-[#18231D] capitalize flex items-center gap-1 mt-0.5">
                        {item.mode === "call" && <Phone className="w-3 h-3 text-[#154734]" />}
                        {item.mode === "whatsapp" && <MessageSquare className="w-3 h-3 text-emerald-600" />}
                        {item.mode === "video" && <Video className="w-3 h-3 text-blue-600" />}
                        {item.mode === "in_person" && <Building className="w-3 h-3 text-amber-600" />}
                        {item.mode}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-[#E2E9E3]/60">
                      <span className="text-[#68756D] block">Consultant</span>
                      <span className="font-medium text-[#18231D]">{item.doctorId?.userId?.name || "Assigned Consultant"}</span>
                    </div>
                  </div>

                  {item.status === "scheduled" && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setOutcomeModal({ id: item._id, status: "completed", notes: "" })}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer text-center"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item._id, "missed")}
                        className="px-4 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-semibold text-xs cursor-pointer text-center"
                      >
                        Missed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL: SCHEDULE FOLLOW-UP */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#154734]/10 text-[#154734] flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#18231D]">Schedule Care Follow-up</h3>
                  <p className="text-xs text-[#68756D]">Set up clinical check-in or recovery review</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Select Patient *</label>
                <select
                  required
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:ring-1 focus:ring-[#154734] focus:outline-none"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map((pat) => (
                    <option key={pat._id} value={pat._id}>
                      {pat.fullName} ({pat.patientCode} • {pat.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Attending Doctor (Optional)</label>
                <select
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:ring-1 focus:ring-[#154734] focus:outline-none"
                >
                  <option value="">-- Clinic Team / Shared Care --</option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.userId?.name || "Doctor"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1.5">Time Slot</label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none font-mono text-[#18231D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Communication Mode</label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value as FollowUpItem["mode"] })}
                  className="w-full px-3 py-2.5 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:ring-1 focus:ring-[#154734] focus:outline-none"
                >
                  <option value="call">Phone Call Follow-up</option>
                  <option value="whatsapp">WhatsApp Care Check</option>
                  <option value="video">Online Video Review</option>
                  <option value="in_person">In-Clinic Visit</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1.5">Clinical Protocol / Plan Instructions</label>
                <textarea
                  rows={3}
                  value={form.planInstructions}
                  onChange={(e) => setForm({ ...form, planInstructions: e.target.value })}
                  placeholder="Review symptomatic relief, check medication compliance..."
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none text-[#18231D]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E9E3]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-60 flex items-center gap-2 transition-colors shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isSubmitting ? "Scheduling..." : "Schedule Follow-up"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETE OUTCOME */}
      {outcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setOutcomeModal(null)} />
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl p-6 max-w-md w-full shadow-2xl z-10 animate-fade-in">
            <h3 className="text-base font-serif font-bold text-[#18231D] mb-1.5">Record Follow-up Outcome</h3>
            <p className="text-xs text-[#68756D] mb-4">
              Document clinical progress and patient response before marking completed.
            </p>
            <textarea
              rows={4}
              value={outcomeModal.notes}
              onChange={(e) => setOutcomeModal({ ...outcomeModal, notes: e.target.value })}
              placeholder="Patient reported significant symptom relief; adherence confirmed..."
              className="w-full px-3 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none mb-4 text-[#18231D]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOutcomeModal(null)}
                className="px-3.5 py-2 border border-[#E2E9E3] rounded-xl text-xs text-[#68756D] hover:bg-gray-50 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(outcomeModal.id, "completed", outcomeModal.notes)}
                className="px-5 py-2 bg-[#154734] text-white rounded-xl text-xs font-semibold hover:bg-[#0E3828] cursor-pointer shadow-xs transition-colors"
              >
                Save &amp; Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
