"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Search,
  Filter,
  Clock,
  User,
  Stethoscope,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface AppointmentItem {
  _id: string;
  appointmentCode: string;
  startTime: string;
  endTime?: string;
  appointmentDate: string;
  patientId: {
    _id: string;
    fullName: string;
    age?: number;
    patientCode: string;
    phone?: string;
  };
  serviceName: string;
  mode: string;
  status: "scheduled" | "checked_in" | "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show";
  notes?: string;
}

interface DoctorAppointmentsTabProps {
  onOpenConsultation: (appointmentId: string, patientId: string) => void;
  onOpenPatientProfile: (patientId: string) => void;
}

export function DoctorAppointmentsTab({
  onOpenConsultation,
  onOpenPatientProfile,
}: DoctorAppointmentsTabProps) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data?: { appointments?: AppointmentItem[] }; appointments?: AppointmentItem[] }>(
        `/api/v1/doctor/appointments?date=${dateFilter}&status=${statusFilter}&search=${encodeURIComponent(search)}`
      );
      const list = (res as any).data?.appointments || (res as any).appointments || (Array.isArray((res as any).data) ? (res as any).data : []);
      setAppointments(list);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = appointments;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const renderBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E7F3EA] text-[#287A4B]">Completed</span>;
      case "in_consultation":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0284C7]">In Consultation</span>;
      case "waiting":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">Waiting</span>;
      case "checked_in":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0284C7]">Checked In</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Scheduled</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner and Filters */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#154734]" /> My Clinical Appointments
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Manage your daily consultation schedule, patient arrival states, and clinical visits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E1E9E3] rounded-xl text-xs font-medium text-[#17251E] shadow-sm"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E1E9E3] rounded-xl text-xs font-medium text-[#17251E] shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="checked_in">Checked In</option>
            <option value="waiting">Waiting</option>
            <option value="in_consultation">In Consultation</option>
            <option value="completed">Completed</option>
          </select>

          <button
            type="button"
            onClick={fetchAppointments}
            className="p-2 border border-[#E1E9E3] hover:bg-gray-50 rounded-xl text-gray-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by patient name, phone, or appointment code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-2xl text-xs text-[#17251E] placeholder:text-gray-400 shadow-sm"
        />
      </div>

      {/* Appointment Table */}
      <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E3] text-[#65746B] text-xs font-semibold bg-[#FAFCFB]">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Appt Code</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E3]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#65746B]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
                    Loading assigned appointments...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#65746B]">
                    No appointments matching current filters.
                  </td>
                </tr>
              ) : (
                paginated.map((appt) => {
                  const patient = appt.patientId || {};
                  return (
                    <tr key={appt._id} className="hover:bg-[#F9FCFA] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#17251E] whitespace-nowrap">
                        {appt.startTime}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#154734] font-semibold whitespace-nowrap">
                        #{appt.appointmentCode || "TG00"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onOpenPatientProfile(patient._id)}
                          className="font-semibold text-xs text-[#17251E] hover:text-[#154734] hover:underline text-left block"
                        >
                          {patient.fullName || "Patient"}
                        </button>
                        <span className="text-[11px] text-[#65746B]">
                          {patient.age ? `${patient.age} yrs` : ""} • #{patient.patientCode || "TG00"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#17251E] whitespace-nowrap">
                        {appt.serviceName}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 capitalize whitespace-nowrap">
                        {appt.mode}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderBadge(appt.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {appt.status === "completed" ? (
                            <button
                              type="button"
                              onClick={() => onOpenConsultation(appt._id, patient._id)}
                              className="px-3 py-1 text-xs font-semibold text-[#17251E] bg-white border border-[#E1E9E3] hover:bg-gray-50 rounded-lg"
                            >
                              View Notes
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenConsultation(appt._id, patient._id)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-[#154734] hover:bg-[#0E3828] rounded-lg"
                            >
                              {appt.status === "in_consultation" ? "Resume Visit" : "Start Visit"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenPatientProfile(patient._id)}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
                            title="Patient details"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#E1E9E3] bg-[#FAFCFB] flex items-center justify-between text-xs text-[#65746B]">
          <span>
            Total {filtered.length} appointments found
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg border border-[#E1E9E3] flex items-center justify-center disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold text-[#17251E]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-7 h-7 rounded-lg border border-[#E1E9E3] flex items-center justify-center disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
