"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Search,
  Loader2,
  Calendar,
  CheckCircle2,
  Video,
  Phone,
  Building2,
  Check,
  AlertCircle,
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
  };
  doctorId?: {
    _id: string;
    userId?: {
      name: string;
    };
  };
  serviceName: string;
  dueDate: string;
  scheduledTime?: string;
  mode: string;
  interval?: string;
  status: "scheduled" | "completed" | "missed" | "rescheduled" | "planned" | "pending";
  planInstructions?: string;
  outcome?: string;
}

interface FollowUpsViewProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function FollowUpsView({ showNotification }: FollowUpsViewProps) {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await api.get<{ followUps: FollowUpItem[]; total: number }>(
        `/clinical/follow-ups?${params.toString()}`
      );
      if (res.data?.followUps) {
        setFollowUps(res.data.followUps);
      }
    } catch {
      showNotification("Failed to load patient follow-ups", true);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showNotification]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const handleComplete = async (fuId: string) => {
    const outcome = window.prompt("Document clinical outcome for this follow-up:");
    if (!outcome || !outcome.trim()) return;

    try {
      await api.patch(`/clinical/follow-ups/${fuId}`, {
        status: "completed",
        outcome: outcome.trim(),
      });
      showNotification("Follow-up marked as completed!");
      loadFollowUps();
    } catch {
      showNotification("Failed to update follow-up", true);
    }
  };

  const filtered = followUps.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const pName = f.patientId?.fullName?.toLowerCase() || "";
    const pCode = f.patientId?.patientCode?.toLowerCase() || "";
    const code = f.followUpCode?.toLowerCase() || "";
    const sName = f.serviceName?.toLowerCase() || "";
    return pName.includes(q) || pCode.includes(q) || code.includes(q) || sName.includes(q);
  });

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search follow-ups by patient, code, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-[#E5EAF0] rounded-xl px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
          >
            <option value="all">All Follow-up Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
          </select>
          <span className="text-xs text-[#64748B] font-mono shrink-0">
            {filtered.length} follow-ups
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
            <span className="text-xs">Loading clinical follow-ups...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[#64748B] text-xs">
            No clinical follow-ups found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Follow-up Code</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Practitioner</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Due Date &amp; Time</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {filtered.map((fu) => {
                  const isOverdue =
                    fu.status !== "completed" && new Date(fu.dueDate) < new Date();
                  return (
                    <tr key={fu._id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#087A50]">
                        {fu.followUpCode}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#111827] block truncate max-w-[150px]">
                          {fu.patientId?.fullName || "Patient"}
                        </span>
                        <span className="text-[10px] text-[#64748B] font-mono block">
                          {fu.patientId?.patientCode}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#111827]">
                        {fu.doctorId?.userId?.name || "Dr. TriGyna"}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0] font-semibold">
                          {fu.serviceName}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#111827] block font-mono">
                          {new Date(fu.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-[#64748B] block">
                          {fu.scheduledTime || "11:30 AM - 12:00 PM"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          {fu.mode.includes("Video") ? (
                            <Video className="w-3.5 h-3.5 text-[#087A50]" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{fu.mode}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Overdue
                          </span>
                        ) : fu.status === "completed" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 capitalize">
                            {fu.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {fu.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => handleComplete(fu._id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#E9F8F0] text-[#087A50] hover:bg-[#D5E5DA] cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

