"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Video,
  Building2,
  Plus,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface AppointmentRow {
  _id: string;
  appointmentCode: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  mode: string;
  status: string;
  paymentStatus: string;
  patientId?: { fullName: string; patientCode: string; phone?: string };
  doctorId?: { specialization: string[]; userId?: { name: string } };
}

interface CatalogueBookingsTabProps {
  onQuickBook?: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function CatalogueBookingsTab({
  onQuickBook,
  showNotification,
}: CatalogueBookingsTabProps) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ appointments: AppointmentRow[] }>("/appointments?limit=50");
      if (res.data?.appointments) {
        setAppointments(res.data.appointments);
      }
    } catch {
      showNotification("Failed to load appointment bookings", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      !search.trim() ||
      a.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      a.appointmentCode.toLowerCase().includes(search.toLowerCase()) ||
      a.patientId?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorId?.userId?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Search and Action Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by appointment #, patient, service, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="checked_in">Checked In</option>
            <option value="in_consultation">In Consultation</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={loadAppointments}
            className="p-2 border border-[#E5EAF0] rounded-xl hover:bg-gray-50 text-[#087A50] cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {onQuickBook && (
          <button
            onClick={onQuickBook}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#087A50] hover:bg-[#066341] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Book Appointment</span>
          </button>
        )}
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-16 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
          <span>Loading bookings...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-12 text-center text-xs text-[#64748B]">
          No bookings match your current criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[#64748B] font-semibold border-b border-[#E5EAF0]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Consultant Doctor</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Delivery Mode</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Session Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {filtered.map((appt) => (
                  <tr key={appt._id} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#087A50]">
                      {appt.appointmentCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#111827]">
                      {appt.patientId?.fullName || "Patient"}
                    </td>
                    <td className="py-3 px-4 text-[#334155] font-medium">
                      {appt.serviceName}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      Dr. {appt.doctorId?.userId?.name || "Clinic Specialist"}
                    </td>
                    <td className="py-3 px-4 text-[#475569]">
                      <div className="font-semibold">{appt.appointmentDate}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {appt.startTime} - {appt.endTime || "11:00"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        {appt.mode.includes("Online") ? (
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{appt.mode.replace(" Consultation", "")}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          appt.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {appt.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          appt.status === "completed"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : appt.status === "scheduled"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {appt.status === "completed" ? "Consumed Credit" : appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

