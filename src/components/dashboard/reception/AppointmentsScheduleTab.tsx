"use client";

import React, { useState } from "react";
import {
  Calendar,
  Search,
  Plus,
  Video,
  Building,
  X,
  AlertCircle,
  Loader2,
  CalendarDays,
  Phone,
  Ban,
  RefreshCw,
} from "lucide-react";
import { Patient, Doctor, Appointment } from "./QueueDeskTab";

interface AppointmentsScheduleTabProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  isLoading: boolean;
  onRefresh: () => void;
  onBookAppointment: (formData: Record<string, unknown>) => Promise<void>;
  onStatusUpdate: (apptId: string, status: string) => Promise<void>;
  onCancelAppointment: (apptId: string, reason: string) => Promise<void>;
  onOpenPosBill: (patientId?: string) => void;
}

export function AppointmentsScheduleTab({
  appointments,
  patients,
  doctors,
  isLoading,
  onRefresh,
  onBookAppointment,
  onStatusUpdate,
  onCancelAppointment,
  onOpenPosBill,
}: AppointmentsScheduleTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({
    patientId: "",
    doctorId: doctors[0]?._id || "",
    serviceName: "Homoeopathic Clinical Consultation",
    appointmentDate: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    mode: "in_person",
    notes: "",
  });

  // Cancel Modal State
  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState("Patient requested cancellation / rescheduling");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleOpenBooking = () => {
    setBookingForm((b) => ({
      ...b,
      doctorId: b.doctorId || doctors[0]?._id || "",
      appointmentDate: selectedDate || new Date().toISOString().split("T")[0],
    }));
    setBookingError(null);
    setIsBookModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patientId || !bookingForm.doctorId) {
      setBookingError("Please select both a registered patient and doctor.");
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);
    try {
      await onBookAppointment(bookingForm);
      setIsBookModalOpen(false);
      setBookingForm({
        patientId: "",
        doctorId: doctors[0]?._id || "",
        serviceName: "Homoeopathic Clinical Consultation",
        appointmentDate: selectedDate || new Date().toISOString().split("T")[0],
        startTime: "10:00",
        mode: "in_person",
        notes: "",
      });
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Appointment booking failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalAppt) return;
    setIsCancelling(true);
    try {
      await onCancelAppointment(cancelModalAppt._id, cancellationReason);
      setCancelModalAppt(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    // Date match: appointmentDate can be YYYY-MM-DD or ISO timestamp
    const apptDate = appt.appointmentDate?.split("T")[0];
    const matchesDate = !selectedDate || apptDate === selectedDate;
    const matchesDoctor = doctorFilter === "all" || appt.doctorId?._id === doctorFilter;
    const matchesMode = modeFilter === "all" || appt.mode === modeFilter;
    const matchesStatus = statusFilter === "all" || appt.status === statusFilter;

    const name = appt.patientId?.fullName?.toLowerCase() || "";
    const phone = appt.patientId?.phone || "";
    const code = appt.appointmentCode?.toLowerCase() || "";
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || phone.includes(query) || code.includes(query);

    return matchesDate && matchesDoctor && matchesMode && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "checked_in":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold";
      case "in_consultation":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold";
      case "completed":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5ED] text-[#154734] text-xs font-semibold mb-2 border border-[#D1E2D8]">
            <CalendarDays className="w-3.5 h-3.5" />
            Central Clinic Schedule &amp; Slot Management
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17221D]">
            Appointments &amp; Practitioner Availability
          </h2>
          <p className="text-xs text-[#758277] mt-0.5 max-w-xl">
            Atomic slot reservation, collision prevention, doctor room allocation, and instant status management across clinic visits and telemedicine.
          </p>
        </div>

        <button
          onClick={handleOpenBooking}
          className="px-4.5 py-2.5 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Schedule New Appointment
        </button>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-4.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Quick Date Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDate === todayStr
                ? "bg-[#154734] text-white shadow-xs"
                : "bg-[#FAF8F5] border border-[#E8E2D6] text-[#758277] hover:text-[#154734]"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDate === tomorrowStr
                ? "bg-[#154734] text-white shadow-xs"
                : "bg-[#FAF8F5] border border-[#E8E2D6] text-[#758277] hover:text-[#154734]"
            }`}
          >
            Tomorrow
          </button>
          <button
            onClick={() => setSelectedDate("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedDate === ""
                ? "bg-[#154734] text-white shadow-xs"
                : "bg-[#FAF8F5] border border-[#E8E2D6] text-[#758277] hover:text-[#154734]"
            }`}
          >
            All Dates
          </button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#E8E2D6] bg-[#FAF8F5] text-[#17221D] focus:outline-none focus:border-[#154734]"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#758277]" />
            <input
              type="text"
              placeholder="Search patient or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 bg-[#FAF8F5]"
            />
          </div>

          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] text-[#17221D] focus:outline-none"
          >
            <option value="all">All Doctors</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                Dr. {d.userId?.fullName || d.userId?.name || "Consultant"}
              </option>
            ))}
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] text-[#17221D] focus:outline-none"
          >
            <option value="all">All Modes</option>
            <option value="in_person">Clinic Visit</option>
            <option value="video">Telemedicine</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] text-[#17221D] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="checked_in">Waiting</option>
            <option value="in_consultation">In Room</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Refresh Schedule"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Appointments List / Table */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E2D6] text-[11px] font-bold text-[#154734] uppercase tracking-wider">
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Appointment Code</th>
                <th className="py-3 px-4">Patient Profile</th>
                <th className="py-3 px-4">Practitioner</th>
                <th className="py-3 px-4">Consultation Service</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D6]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#758277]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2.5 text-[#154734]" />
                    <p className="font-semibold text-xs text-[#154734]">Syncing appointment schedule...</p>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#758277]">
                    <Calendar className="w-8 h-8 text-[#758277]/40 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-[#17221D]">No appointments found</p>
                    <p className="text-xs text-[#758277] mt-0.5">Select another date or book a new slot.</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appt) => (
                  <tr key={appt._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#154734]">
                      <p>{appt.appointmentDate?.split("T")[0]}</p>
                      <p className="text-xs font-semibold text-[#17221D]">{appt.startTime}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-[#758277]">
                      {appt.appointmentCode}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#17221D]">{appt.patientId?.fullName || "Walk-in"}</p>
                      <p className="text-[11px] text-[#758277] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#758277]" />
                        <span>{appt.patientId?.phone}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">{appt.patientId?.patientCode}</span>
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#154734]">
                        Dr. {appt.doctorId?.userId?.fullName || appt.doctorId?.userId?.name || "Harshali Sutar"}
                      </p>
                      <p className="text-[10px] text-[#758277]">Fee: ₹{appt.doctorId?.consultationFee || 800}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#17221D]">{appt.serviceName}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                        {appt.mode === "video" ? (
                          <>
                            <Video className="w-3.5 h-3.5 text-purple-600" />
                            <span className="text-purple-700">Video</span>
                          </>
                        ) : (
                          <>
                            <Building className="w-3.5 h-3.5 text-[#154734]" />
                            <span className="text-[#154734]">In-Person</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] border capitalize ${getStatusBadge(appt.status)}`}>
                        {appt.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {appt.status === "scheduled" && (
                          <button
                            onClick={() => onStatusUpdate(appt._id, "checked_in")}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            Check In
                          </button>
                        )}

                        {appt.status === "checked_in" && (
                          <button
                            onClick={() => onStatusUpdate(appt._id, "in_consultation")}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            Send In
                          </button>
                        )}

                        <button
                          onClick={() => onOpenPosBill(appt.patientId?._id)}
                          className="px-2.5 py-1 rounded-lg border border-[#E8E2D6] text-[#154734] hover:bg-[#EAF5ED] text-[11px] font-semibold transition-all cursor-pointer"
                          title="Generate POS Bill"
                        >
                          Bill
                        </button>

                        {appt.status !== "cancelled" && appt.status !== "completed" && (
                          <button
                            onClick={() => setCancelModalAppt(appt)}
                            className="p-1 rounded-lg border border-transparent text-[#758277] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Cancel Appointment"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Schedule Appointment */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#154734]" />
                  Schedule Patient Appointment
                </h3>
                <p className="text-xs text-[#758277] mt-0.5">
                  Reserve conflict-free consultation slot with clinical practitioner
                </p>
              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#154734] mb-1">Select Patient *</label>
                <select
                  required
                  value={bookingForm.patientId}
                  onChange={(e) => setBookingForm({ ...bookingForm, patientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                >
                  <option value="">-- Choose registered patient --</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.patientCode}) • {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Select Practitioner *</label>
                <select
                  required
                  value={bookingForm.doctorId}
                  onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                >
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.userId?.fullName || d.userId?.name || "Consultant"} (Fee: ₹{d.consultationFee})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Service / Reason for Visit</label>
                <select
                  value={bookingForm.serviceName}
                  onChange={(e) => setBookingForm({ ...bookingForm, serviceName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                >
                  <option value="Homoeopathic Clinical Consultation">Homoeopathic Clinical Consultation</option>
                  <option value="Gynaecology Specialist Review">Gynaecology Specialist Review</option>
                  <option value="PCOD & Hormonal Health Protocol">PCOD &amp; Hormonal Health Protocol</option>
                  <option value="Fertility Counselling & Workup">Fertility Counselling &amp; Workup</option>
                  <option value="Postnatal Follow-up & Wellness">Postnatal Follow-up &amp; Wellness</option>
                  <option value="Routine Follow-up & Refill">Routine Follow-up &amp; Refill</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.appointmentDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, appointmentDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Time Slot *</label>
                  <select
                    value={bookingForm.startTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    {[
                      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
                      "12:00", "12:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"
                    ].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Consultation Mode</label>
                <select
                  value={bookingForm.mode}
                  onChange={(e) => setBookingForm({ ...bookingForm, mode: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                >
                  <option value="in_person">Clinic Visit (In-Person)</option>
                  <option value="video">Telemedicine Video Consult</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Reception Clinical Notes</label>
                <textarea
                  rows={2}
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="Patient reports acute pain / first visit / referred by..."
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Reserving Slot...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Appointment */}
      {cancelModalAppt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <h3 className="text-base font-serif font-bold text-rose-800 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                Cancel Appointment
              </h3>
              <button
                onClick={() => setCancelModalAppt(null)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-bold">
                {cancelModalAppt.patientId?.fullName} ({cancelModalAppt.appointmentCode})
              </p>
              <p className="text-[11px] text-rose-700">
                Slot: {cancelModalAppt.appointmentDate?.split("T")[0]} at {cancelModalAppt.startTime}
              </p>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#154734] mb-1">Reason for Cancellation *</label>
                <textarea
                  rows={2}
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancelModalAppt(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
