"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Loader2,
  Stethoscope,
  X,
  Video,
  Building,
  RefreshCw,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface AppointmentItem {
  _id: string;
  appointmentCode: string;
  patientId?: {
    _id: string;
    fullName: string;
    phone: string;
    patientCode: string;
    age?: number;
    gender?: string;
  };
  doctorId?: {
    _id: string;
    userId?: {
      name: string;
    };
  };
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  mode: string;
  status: "scheduled" | "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show";
  notes?: string;
  createdAt: string;
}

interface DoctorOption {
  _id: string;
  userId?: { name: string };
  consultationFee: number;
}

interface PatientOption {
  _id: string;
  fullName: string;
  patientCode: string;
  phone: string;
}

export function AppointmentsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    serviceName: "Constitutional Homoeopathic Consultation",
    appointmentDate: new Date().toISOString().split("T")[0],
    startTime: "11:00",
    mode: "In-Clinic Consultation",
    notes: "",
  });

  const loadAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);

      const res = await api.get<{ appointments: AppointmentItem[] }>(`/appointments?${params.toString()}`);
      if (res.data?.appointments) {
        setAppointments(res.data.appointments);
      }
    } catch {
      showNotification("Failed to fetch appointments", true);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, dateFilter, showNotification]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [docRes, patRes] = await Promise.all([
        api.get<{ doctors: DoctorOption[] }>("/doctors?status=active"),
        api.get<{ patients: PatientOption[] }>("/patients?limit=50"),
      ]);
      if (docRes.data?.doctors) setDoctors(docRes.data.doctors);
      if (patRes.data?.patients) setPatients(patRes.data.patients);
    } catch {
      // silently fallback
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isMounted) return;
      await Promise.allSettled([loadAppointments(), loadDropdowns()]);
    })();
    return () => {
      isMounted = false;
    };
  }, [loadAppointments, loadDropdowns]);

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const res = await api.patch<{ appointment: AppointmentItem }>(`/appointments/${appointmentId}/status`, {
        status: newStatus,
      });
      if (res.success) {
        showNotification(`Appointment marked as ${newStatus.replace("_", " ")}`);
        loadAppointments();
      } else {
        showNotification(res.message || "Status update failed", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error updating status", true);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId || !form.appointmentDate || !form.startTime) {
      showNotification("Please fill in Patient, Doctor, Date and Time slot", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ appointment: AppointmentItem }>("/appointments", {
        patientId: form.patientId,
        doctorId: form.doctorId,
        serviceName: form.serviceName,
        appointmentDate: form.appointmentDate,
        startTime: form.startTime,
        mode: form.mode,
        notes: form.notes,
        bookingSource: "admin_portal",
      });

      if (res.success) {
        showNotification(`Appointment booked successfully (${res.data?.appointment.appointmentCode})`);
        setIsBookModalOpen(false);
        loadAppointments();
      } else {
        showNotification(res.message || "Failed to book appointment", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error booking appointment", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    const code = app.appointmentCode?.toLowerCase() || "";
    const pName = app.patientId?.fullName?.toLowerCase() || "";
    const pPhone = app.patientId?.phone || "";
    const dName = app.doctorId?.userId?.name?.toLowerCase() || "";
    const q = search.toLowerCase();
    return code.includes(q) || pName.includes(q) || pPhone.includes(q) || dName.includes(q);
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter((a) => a.appointmentDate === todayStr);
  const scheduledCount = appointments.filter((a) => a.status === "scheduled" || a.status === "checked_in").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const selectedDoctorObj = doctors.find((d) => d._id === form.doctorId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#154734]/10 text-[#154734]">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#18231D]">Appointments &amp; Schedule</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#68756D] mt-1">
            Centralized consultation booking, OPD intake, practitioner slots, and attendance.
          </p>
        </div>

        <button
          onClick={() => {
            if (doctors.length > 0 && !form.doctorId) {
              setForm((prev) => ({ ...prev, doctorId: doctors[0]._id }));
            }
            if (patients.length > 0 && !form.patientId) {
              setForm((prev) => ({ ...prev, patientId: patients[0]._id }));
            }
            setIsBookModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* 2. KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Total Enqueued</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : appointments.length}
            </p>
            <span className="text-[11px] text-[#154734] font-medium mt-0.5 inline-block">Consultation Registry</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF5ED] text-[#154734] flex items-center justify-center border border-[#D5E5DA]">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Today&apos;s Schedule</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : todayAppointments.length}
            </p>
            <span className="text-[11px] text-[#3568A8] font-medium mt-0.5 inline-block">Current Clinic Shift</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3568A8] flex items-center justify-center border border-blue-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Waiting / In-Progress</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : scheduledCount}
            </p>
            <span className="text-[11px] text-amber-800 font-medium mt-0.5 inline-block">Scheduled / Checked-in</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Completed</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : completedCount}
            </p>
            <span className="text-[11px] text-[#287A4B] font-medium mt-0.5 inline-block">Prescriptions Finalized</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#287A4B] flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#68756D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code (TG-A-...), patient name, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] placeholder:text-[#68756D] focus:bg-white focus:outline-none focus:border-[#154734] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] focus:outline-none focus:border-[#154734] font-mono"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] focus:outline-none focus:border-[#154734]"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="checked_in">Checked In</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          <button
            onClick={() => {
              setDateFilter("");
              setStatusFilter("all");
              setSearch("");
              loadAppointments();
            }}
            className="p-2 border border-[#E2E9E3] rounded-xl hover:bg-[#F7F9F7] text-[#68756D] cursor-pointer transition-colors"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <span className="text-xs text-[#68756D] font-mono ml-auto">
            {filteredAppointments.length} matching appointments
          </span>
        </div>
      </div>

      {/* 4. Appointments Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#68756D] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
            <span className="text-xs">Loading appointments database...</span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-16 text-center text-[#68756D] flex flex-col items-center justify-center p-6">
            <Calendar className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-[#18231D]">No appointments found</p>
            <p className="text-xs text-[#68756D] mt-0.5">No slots match your active filters or search terms.</p>
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
                    <th className="py-3 px-4">Practitioner</th>
                    <th className="py-3 px-4">Date &amp; Slot</th>
                    <th className="py-3 px-4">Consultation Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {filteredAppointments.map((app) => (
                    <tr key={app._id} className="hover:bg-[#F7F9F7]/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#154734]">
                        <span className="bg-[#EAF5ED] px-2 py-0.5 rounded-md border border-[#D5E5DA]">
                          {app.appointmentCode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#18231D]">{app.patientId?.fullName || "Walk-in Patient"}</div>
                        <div className="text-[10px] text-[#68756D] font-mono">
                          {app.patientId?.patientCode} • {app.patientId?.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#18231D] flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-[#154734]" />
                          <span>{app.doctorId?.userId?.name || "Assigned Consultant"}</span>
                        </div>
                        <div className="text-[10px] text-[#68756D]">{app.serviceName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold text-[#18231D]">{app.appointmentDate}</div>
                        <div className="text-[11px] text-[#154734] font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#6B8F5B]" />
                          <span>
                            {app.startTime} {app.endTime ? `- ${app.endTime}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#18231D]">
                          {app.mode?.includes("Video") || app.mode?.includes("Online") ? (
                            <>
                              <Video className="w-3.5 h-3.5 text-blue-600" />
                              <span>Video</span>
                            </>
                          ) : (
                            <>
                              <Building className="w-3.5 h-3.5 text-emerald-600" />
                              <span>In-Clinic</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            app.status === "completed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : app.status === "checked_in"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : app.status === "cancelled" || app.status === "no_show"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {app.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {app.status === "scheduled" && (
                            <button
                              onClick={() => handleUpdateStatus(app._id, "checked_in")}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] cursor-pointer border border-blue-200 transition-colors"
                              title="Patient Arrived / Check-in"
                            >
                              Check In
                            </button>
                          )}
                          {(app.status === "scheduled" || app.status === "checked_in") && (
                            <button
                              onClick={() => handleUpdateStatus(app._id, "completed")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#287A4B] hover:bg-emerald-100 font-bold text-[10px] cursor-pointer border border-emerald-200 transition-colors"
                              title="Mark Consultation Completed"
                            >
                              Complete
                            </button>
                          )}
                          {app.status !== "cancelled" && app.status !== "completed" && (
                            <button
                              onClick={() => handleUpdateStatus(app._id, "cancelled")}
                              className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
                              title="Cancel Appointment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[#E2E9E3]">
              {filteredAppointments.map((app) => (
                <div key={app._id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#154734] bg-[#EAF5ED] px-2 py-0.5 rounded-md border border-[#D5E5DA]">
                        {app.appointmentCode}
                      </span>
                      <h4 className="text-sm font-bold text-[#18231D] mt-1">
                        {app.patientId?.fullName || "Walk-in Patient"}
                      </h4>
                      <p className="text-[11px] text-[#68756D]">
                        {app.doctorId?.userId?.name || "Consultant"} • {app.serviceName}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        app.status === "completed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : app.status === "checked_in"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {app.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E2E9E3]/60">
                    <span className="font-mono text-[11px] text-[#154734] font-semibold">
                      {app.appointmentDate} @ {app.startTime}
                    </span>
                    <div className="flex items-center gap-1">
                      {app.status === "scheduled" && (
                        <button
                          onClick={() => handleUpdateStatus(app._id, "checked_in")}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200"
                        >
                          Check In
                        </button>
                      )}
                      {(app.status === "scheduled" || app.status === "checked_in") && (
                        <button
                          onClick={() => handleUpdateStatus(app._id, "completed")}
                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 5. Book Appointment Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2E9E3] max-w-md w-full shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F7F9F7] border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#154734]/10 text-[#154734]">
                  <Calendar className="w-4 h-4" />
                </span>
                <h3 className="text-base font-serif font-bold text-[#154734]">Book Patient Appointment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#18231D] mb-1">Select Registered Patient *</label>
                <select
                  required
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none focus:border-[#154734]"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((pat) => (
                    <option key={pat._id} value={pat._id}>
                      {pat.fullName} ({pat.patientCode} • {pat.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1">Select Consultant Practitioner *</label>
                <select
                  required
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none focus:border-[#154734]"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.userId?.name || "Consultant"} (Fee: ₹{doc.consultationFee})
                    </option>
                  ))}
                </select>
                {selectedDoctorObj && (
                  <p className="text-[11px] text-[#154734] mt-1 font-mono">
                    Standard Consultation Fee: ₹{selectedDoctorObj.consultationFee}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1">Clinical Service / Concern</label>
                <input
                  type="text"
                  value={form.serviceName}
                  onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Time Slot *</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1">Consultation Mode</label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none focus:border-[#154734]"
                >
                  <option value="In-Clinic Consultation">In-Clinic Consultation (Flagship Centre)</option>
                  <option value="Video Teleconsultation">Video Teleconsultation (Google Meet / Zoom)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1">Patient Symptoms / Reception Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Follow-up consultation for PCOS regimen review..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E9E3]">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Confirming..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
