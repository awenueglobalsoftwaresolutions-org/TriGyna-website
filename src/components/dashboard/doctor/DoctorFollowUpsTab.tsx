"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Search,
  Filter,
  Calendar,
  User,
  Plus,
  CheckCircle2,
  Phone,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface FollowUpItem {
  _id: string;
  recommendedDate: string;
  patientId: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone?: string;
  };
  reason: string;
  type: "appointment" | "call";
  status: "pending" | "scheduled" | "completed";
  instructions?: string;
  completionNotes?: string;
}

export function DoctorFollowUpsTab() {
  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);

  // New follow-up form state
  const [newPatientId, setNewPatientId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newType, setNewType] = useState<"appointment" | "call">("appointment");
  const [newInstructions, setNewInstructions] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFollowups = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data?: FollowUpItem[]; followups?: FollowUpItem[] }>(
        `/api/v1/doctor/follow-ups?status=${statusFilter}`
      );
      const list = (res as any).data?.followUps || (res as any).data?.followups || (Array.isArray((res as any).data) ? (res as any).data : ((res as any).followups || []));
      setFollowups(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load follow-ups", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, [statusFilter]);

  // Load patient dropdown when opening new modal
  useEffect(() => {
    if (newModalOpen) {
      api.get<{ data?: any[] }>(`/api/v1/doctor/patients`).then((res) => {
        const pList = (res as any).data?.patients || (Array.isArray((res as any).data) ? (res as any).data : []);
        setPatients(Array.isArray(pList) ? pList : []);
      });
    }
  }, [newModalOpen]);

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId || !newDate || !newReason) return;

    try {
      setIsSubmitting(true);
      await api.post(`/api/v1/doctor/follow-ups`, {
        patientId: newPatientId,
        recommendedDate: newDate,
        dueDate: newDate,
        reason: newReason,
        serviceName: newReason,
        type: newType,
        instructions: newInstructions,
        planInstructions: newInstructions || newReason,
      });
      setNewModalOpen(false);
      setNewReason("");
      setNewInstructions("");
      fetchFollowups();
    } catch (err) {
      console.error("Failed to create follow-up", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/api/v1/doctor/follow-ups/${id}`, {
        status: "completed",
        completionNotes: "Follow-up completed by treating clinician.",
      });
      fetchFollowups();
    } catch (err) {
      console.error("Failed to mark completed", err);
    }
  };

  const filtered = followups.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.patientId?.fullName?.toLowerCase().includes(q) ||
      f.reason?.toLowerCase().includes(q) ||
      f.patientId?.patientCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#154734]" /> Follow-ups & Continuity of Care
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Track recommended review dates, pending investigations, and post-consultation monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E1E9E3] rounded-xl text-xs font-semibold text-[#17251E]"
          >
            <option value="all">All Follow-ups</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>

          <button
            type="button"
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Recommend Follow-up
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by patient name, reason, or patient ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-2xl text-xs text-[#17251E] placeholder:text-gray-400 shadow-sm"
        />
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E1E9E3] text-[#65746B] text-xs font-semibold bg-[#FAFCFB]">
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Reason / Clinical Context</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E9E3]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-[#65746B]">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
                  Loading follow-ups...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-[#65746B]">
                  No follow-up recommendations found.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f._id} className="hover:bg-[#F9FCFA] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-xs text-[#17251E] whitespace-nowrap">
                    {f.recommendedDate}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <p className="font-semibold text-xs text-[#17251E]">{f.patientId?.fullName || "Patient"}</p>
                    <p className="text-[11px] text-[#65746B]">#{f.patientId?.patientCode || "TG00"}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#17251E] max-w-[240px]">
                    <p className="font-medium">{f.reason}</p>
                    {f.instructions && <p className="text-[11px] text-[#65746B] mt-0.5">{f.instructions}</p>}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs capitalize text-gray-600">
                    <span className="flex items-center gap-1.5">
                      {f.type === "call" ? <Phone className="w-3.5 h-3.5 text-gray-400" /> : <Calendar className="w-3.5 h-3.5 text-gray-400" />}
                      {f.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        f.status === "completed"
                          ? "bg-[#E7F3EA] text-[#287A4B]"
                          : f.status === "scheduled"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {f.status !== "completed" ? (
                      <button
                        type="button"
                        onClick={() => handleComplete(f._id)}
                        className="px-3 py-1 bg-white border border-[#E1E9E3] hover:bg-gray-50 text-xs font-semibold text-[#154734] rounded-lg transition-colors"
                      >
                        Mark Done
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recommend Follow-up Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-[#E1E9E3]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E1E9E3]">
              <h3 className="font-bold text-base text-[#17251E] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#154734]" /> Recommend Clinical Follow-up
              </h3>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-[#17251E] mb-1">Select Patient *</label>
                <select
                  required
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                >
                  <option value="">Choose an assigned patient...</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} (#{p.patientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#17251E] mb-1">Target Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#17251E] mb-1">Type *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                  >
                    <option value="appointment">Clinic Visit</option>
                    <option value="call">Teleconsultation / Call</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#17251E] mb-1">Reason for Follow-up *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Review blood glucose profiling and anomaly scan"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#17251E] mb-1">Clinical Instructions for Patient</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Bring fasting lab report, maintain food diary"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
                />
              </div>

              <div className="pt-3 border-t border-[#E1E9E3] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 border border-[#E1E9E3] text-gray-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl font-semibold transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save Recommendation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
