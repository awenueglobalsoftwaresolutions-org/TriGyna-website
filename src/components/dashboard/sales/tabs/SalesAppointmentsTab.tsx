"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Phone,
  Search,
  Filter,
  User,
  Stethoscope,
  X,
  Copy,
  Check,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface AppointmentItem {
  _id: string;
  appointmentCode: string;
  patientId?: { _id: string; fullName: string; phone?: string; email?: string };
  doctorId?: { _id: string; userId?: { name: string }; specialization?: string[] };
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  mode: string;
  status: string;
  meetingLink?: string;
  meetingProvider?: string;
  meetingStatus?: string;
}

interface Doctor {
  _id: string;
  userId?: { name: string };
  specialization?: string[];
}

interface Patient {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
}

interface SalesAppointmentsTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
}

export function SalesAppointmentsTab({ showNotification }: SalesAppointmentsTabProps) {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bookForm, setBookForm] = useState({
    patientId: "",
    doctorId: "",
    serviceName: "PCOD Consultation",
    appointmentDate: new Date().toISOString().split("T")[0],
    startTime: "11:00",
    mode: "Online Video Consultation",
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ appointments: AppointmentItem[] }>("/appointments?limit=100");
      if (res.data?.appointments) {
        setAppointments(res.data.appointments);
      }
    } catch {
      showNotification("Failed to load appointments schedule", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load doctors & patients for booking
  const loadMetaForBooking = async () => {
    setIsBookModalOpen(true);
    try {
      const [docRes, patRes] = await Promise.allSettled([
        api.get<{ doctors: Doctor[] }>("/doctors"),
        api.get<{ patients: Patient[] }>("/patients?limit=50"),
      ]);
      if (docRes.status === "fulfilled" && docRes.value.data?.doctors) {
        setDoctors(docRes.value.data.doctors);
        if (docRes.value.data.doctors.length > 0 && !bookForm.doctorId) {
          setBookForm((prev) => ({ ...prev, doctorId: docRes.value.data!.doctors[0]._id }));
        }
      }
      if (patRes.status === "fulfilled" && patRes.value.data?.patients) {
        setPatients(patRes.value.data.patients);
        if (patRes.value.data.patients.length > 0 && !bookForm.patientId) {
          setBookForm((prev) => ({ ...prev, patientId: patRes.value.data!.patients[0]._id }));
        }
      }
    } catch {
      // Fallback
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.patientId || !bookForm.doctorId || !bookForm.appointmentDate || !bookForm.startTime) {
      showNotification("Please select patient, doctor, date, and start time", true);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/appointments", bookForm);
      showNotification("Doctor consultation scheduled successfully!");
      setIsBookModalOpen(false);
      fetchAppointments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error booking appointment";
      showNotification(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMeetingLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
    showNotification("Video consultation link copied to clipboard");
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = a.patientId?.fullName?.toLowerCase() || "";
        const code = a.appointmentCode?.toLowerCase() || "";
        const srv = a.serviceName?.toLowerCase() || "";
        if (!pName.includes(q) && !code.includes(q) && !srv.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Consultation Appointments Schedule</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            View scheduled specialist appointments, verified video links (Meet/Zoom), and consultation statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMetaForBooking}
          className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Book Specialist Appointment</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Appointments" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === f.id
                  ? "bg-[#16A34A] text-white shadow-xs font-bold"
                  : "bg-[#F8FAFC] text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, patient, service..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          />
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-7 h-7 text-[#16A34A] animate-spin mb-2" />
            <p className="text-xs text-gray-500">Loading appointments from database...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-16 text-center text-xs text-gray-500">
            No appointments found in this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F172A]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Slot &amp; Code</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Doctor Specialist</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Video Link</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAppointments.map((appt) => {
                  const doctorName = appt.doctorId?.userId?.name || "Dr. Ananya Sharma";
                  const patientName = appt.patientId?.fullName || "Patient";
                  const hasLink = !!appt.meetingLink;
                  return (
                    <tr key={appt._id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-5 font-medium">
                        <span className="font-bold text-[#0F172A] block">{appt.startTime}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">{appt.appointmentDate}</span>
                        <span className="text-[10px] text-[#16A34A] font-mono font-bold">{appt.appointmentCode}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#DCFCE7] text-[#15803D] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {patientName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-800 block">{patientName}</span>
                            <span className="text-[10px] text-gray-400">{appt.patientId?.phone || "No phone"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-gray-800 font-semibold">
                          <Stethoscope className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span>{doctorName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-700 font-medium">
                        {appt.serviceName}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasLink ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={appt.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Video className="w-3 h-3" />
                              <span>Join Call</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyMeetingLink(appt.meetingLink!, appt._id)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                              title="Copy Link"
                            >
                              {copiedId === appt._id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Link Pending</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            appt.status === "scheduled" || appt.status === "confirmed"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : appt.status === "completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {appt.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <a
                          href={`tel:${appt.patientId?.phone || ""}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#16A34A] hover:bg-gray-100 inline-flex items-center"
                          title="Call Patient"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">Book Specialist Consultation</h3>
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Patient *</label>
                <select
                  value={bookForm.patientId}
                  onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                >
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.phone}) - {p.patientCode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Consulting Specialist *</label>
                <select
                  value={bookForm.doctorId}
                  onChange={(e) => setBookForm({ ...bookForm, doctorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                >
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.userId?.name || "Specialist"} - {d.specialization?.join(", ") || "Gynecology"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookForm.appointmentDate}
                    onChange={(e) => setBookForm({ ...bookForm, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Time Slot *</label>
                  <select
                    value={bookForm.startTime}
                    onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                  >
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:30">02:30 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:30">05:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Consultation Service</label>
                <select
                  value={bookForm.serviceName}
                  onChange={(e) => setBookForm({ ...bookForm, serviceName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-800"
                >
                  <option value="PCOD Consultation">PCOD Consultation</option>
                  <option value="Skin Treatment">Skin Treatment</option>
                  <option value="Hair Fall Treatment">Hair Fall Treatment</option>
                  <option value="PCOS Program">PCOS Program</option>
                  <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
                  <option value="Fertility Consultation">Fertility Consultation</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#15803D]"
                >
                  {isSubmitting ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

