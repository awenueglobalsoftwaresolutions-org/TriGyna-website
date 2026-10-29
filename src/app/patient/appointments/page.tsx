"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Loader2,
  CalendarCheck,
  CalendarX,
  User,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface AppointmentRecord {
  _id: string;
  appointmentCode: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  mode: string;
  status: "scheduled" | "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show";
  paymentStatus: "paid" | "unpaid" | "refunded";
  notes?: string;
  doctorId?: {
    _id: string;
    qualifications?: string;
    consultationFee?: number;
    userId?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
}

interface Doctor {
  _id: string;
  qualifications: string;
  consultationFee: number;
  userId: {
    _id: string;
    name: string;
  };
}

interface SlotInfo {
  startTime: string;
  endTime?: string;
  isAvailable: boolean;
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  // Booking Modal State
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedService, setSelectedService] = useState("Homoeopathy Consultation");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState("10:00");
  const [selectedMode, setSelectedMode] = useState("Online Video Consultation");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [doctorIsOnLeave, setDoctorIsOnLeave] = useState(false);
  const [doctorLeaveDetails, setDoctorLeaveDetails] = useState<any>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Cancellation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Rescheduling State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<AppointmentRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotInfo[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleDoctorOnLeave, setRescheduleDoctorOnLeave] = useState(false);
  const [rescheduleLeaveDetails, setRescheduleLeaveDetails] = useState<any>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ appointments: AppointmentRecord[] }>("/patient/me/appointments");
      if (res.success && res.data) {
        setAppointments(res.data.appointments || []);
      }
    } catch {
      setError("Failed to load your appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get<{ doctors: Doctor[] }>("/doctors");
      if (res.success && res.data?.doctors) {
        setDoctors(res.data.doctors);
        if (res.data.doctors.length > 0 && !selectedDoctor) {
          setSelectedDoctor(res.data.doctors[0]._id);
        }
      }
    } catch {
      // Fallback
    }
  };

  const fetchAvailability = async (docId: string, date: string) => {
    if (!docId || !date) return;
    setLoadingAvailability(true);
    try {
      const res = await api.get<{
        isOnLeave?: boolean;
        leaveDetails?: any;
        slots?: SlotInfo[];
      }>(`/appointments/availability?doctorId=${docId}&date=${date}`);
      if (res.success && res.data) {
        setDoctorIsOnLeave(Boolean(res.data.isOnLeave));
        setDoctorLeaveDetails(res.data.leaveDetails || null);
        const slots = res.data.slots || [];
        setAvailableSlots(slots);
        const firstAvail = slots.find((s) => s.isAvailable);
        if (firstAvail) {
          setSelectedSlot(firstAvail.startTime);
        } else {
          setSelectedSlot("");
        }
      }
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const fetchRescheduleAvailability = async (docId: string, date: string) => {
    if (!docId || !date) return;
    setLoadingRescheduleSlots(true);
    setRescheduleError(null);
    try {
      const res = await api.get<{
        isOnLeave?: boolean;
        leaveDetails?: any;
        slots?: SlotInfo[];
      }>(`/appointments/availability?doctorId=${docId}&date=${date}`);
      if (res.success && res.data) {
        setRescheduleDoctorOnLeave(Boolean(res.data.isOnLeave));
        setRescheduleLeaveDetails(res.data.leaveDetails || null);
        const slots = res.data.slots || [];
        setRescheduleSlots(slots);
        const firstAvail = slots.find((s) => s.isAvailable);
        if (firstAvail) {
          setRescheduleSlot(firstAvail.startTime);
        } else {
          setRescheduleSlot("");
        }
      }
    } catch {
      setRescheduleSlots([]);
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailability(selectedDoctor, selectedDate);
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    const docId = appointmentToReschedule?.doctorId?._id;
    if (rescheduleModalOpen && docId && rescheduleDate) {
      fetchRescheduleAvailability(docId, rescheduleDate);
    }
  }, [rescheduleModalOpen, appointmentToReschedule, rescheduleDate]);

  // Filter appointments by tab
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingList = appointments.filter(
    (a) => ["scheduled", "checked_in", "in_consultation"].includes(a.status)
  );
  const completedList = appointments.filter((a) => a.status === "completed");
  const cancelledList = appointments.filter((a) => ["cancelled", "no_show"].includes(a.status));

  const currentDisplayList =
    activeTab === "upcoming"
      ? upcomingList
      : activeTab === "completed"
      ? completedList
      : cancelledList;

  // Handle Book Appointment Submission
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    setBookingInProgress(true);
    setError(null);

    try {
      const res = await api.post<any>("/appointments", {
        doctorId: selectedDoctor,
        serviceName: selectedService,
        appointmentDate: selectedDate,
        startTime: selectedSlot,
        mode: selectedMode,
        notes: intakeNotes || "Booked online via Patient Self-Service Portal",
      });

      if (res.success) {
        setBookingSuccessMsg(`Appointment booked successfully! Reference code: ${res.data?.appointmentCode || "TG-A-NEW"}`);
        setTimeout(() => {
          setBookModalOpen(false);
          setBookingSuccessMsg(null);
          setIntakeNotes("");
          fetchAppointments();
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || "Slot unavailable or conflict detected. Please select another slot.");
    } finally {
      setBookingInProgress(false);
    }
  };

  // Handle Cancel Appointment Submission
  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;
    setCancelling(true);
    try {
      const res = await api.post<any>(`/appointments/${appointmentToCancel._id}/cancel`, {
        reason: cancelReason || "Patient requested cancellation via portal",
      });

      if (res.success) {
        setCancelModalOpen(false);
        setAppointmentToCancel(null);
        setCancelReason("");
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err?.message || "Cancellation failed. Late cancellation policies may apply.");
    } finally {
      setCancelling(false);
    }
  };

  // Handle Reschedule Appointment Submission
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentToReschedule || !rescheduleDate || !rescheduleSlot) return;
    if (rescheduleDoctorOnLeave) {
      setRescheduleError("Clinician is on approved leave on this date. Please choose another date.");
      return;
    }
    setRescheduling(true);
    setRescheduleError(null);
    try {
      const res = await api.post<any>(`/appointments/${appointmentToReschedule._id}/reschedule`, {
        appointmentDate: rescheduleDate,
        startTime: rescheduleSlot,
      });

      if (res.success) {
        setRescheduleModalOpen(false);
        setAppointmentToReschedule(null);
        fetchAppointments();
      }
    } catch (err: any) {
      setRescheduleError(err?.message || "Rescheduling failed. Slot may no longer be available.");
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            My Appointments
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            View scheduled visits, check available slots, and manage consultations
          </p>
        </div>

        <button
          onClick={() => setBookModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-[#E4EEE7]">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === "upcoming"
              ? "border-[#075B35] text-[#075B35]"
              : "border-transparent text-[#68766F] hover:text-[#14251F]"
          }`}
        >
          Upcoming ({upcomingList.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === "completed"
              ? "border-[#075B35] text-[#075B35]"
              : "border-transparent text-[#68766F] hover:text-[#14251F]"
          }`}
        >
          Past & Completed ({completedList.length})
        </button>
        <button
          onClick={() => setActiveTab("cancelled")}
          className={`pb-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === "cancelled"
              ? "border-[#075B35] text-[#075B35]"
              : "border-transparent text-[#68766F] hover:text-[#14251F]"
          }`}
        >
          Cancelled ({cancelledList.length})
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-16 text-center text-[#68766F] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#075B35] animate-spin mb-2" />
          <p className="text-xs">Fetching clinical appointments...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAppointments} className="font-semibold underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && currentDisplayList.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E4EEE7] p-12 text-center">
          <Calendar className="w-12 h-12 text-[#68766F]/40 mx-auto mb-3" />
          <h3 className="text-base font-serif font-bold text-[#14251F]">
            No {activeTab} appointments found
          </h3>
          <p className="text-xs text-[#68766F] mt-1 max-w-sm mx-auto">
            {activeTab === "upcoming"
              ? "You do not have any upcoming visits booked. Schedule a consultation with a certified practitioner."
              : "No appointments match this category."}
          </p>
          {activeTab === "upcoming" && (
            <button
              onClick={() => setBookModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          )}
        </div>
      )}

      {/* Appointment Cards List */}
      {!loading && currentDisplayList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {currentDisplayList.map((appt) => {
            const isUpcoming = ["scheduled", "checked_in"].includes(appt.status);
            const isOnline = appt.mode.includes("Online") || appt.mode.includes("Video");

            return (
              <div
                key={appt._id}
                className="bg-white rounded-2xl border border-[#E4EEE7] p-5 shadow-xs flex flex-col justify-between hover:border-[#C6E7D2] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F5F2]">
                    <span className="text-[11px] font-mono font-bold text-[#075B35] bg-[#EDF8F1] px-2.5 py-0.5 rounded-full">
                      {appt.appointmentCode}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                        appt.status === "completed"
                          ? "bg-[#EDF8F1] text-[#075B35]"
                          : appt.status === "cancelled"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {appt.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2">
                    <h3 className="text-base font-bold text-[#14251F]">{appt.serviceName}</h3>
                    <p className="text-xs font-medium text-[#556960] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#075B35]" />
                      <span>{appt.doctorId?.userId?.name || "Dr. Harshali Sutar"}</span>
                      <span className="text-[11px] text-[#8C9892]">
                        ({appt.doctorId?.qualifications || "BHMS, MD"})
                      </span>
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[#68766F] pt-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#075B35]" />
                        <span>{appt.appointmentDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#075B35]" />
                        <span>{appt.startTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        {isOnline ? (
                          <Video className="w-3.5 h-3.5 text-[#075B35]" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-[#075B35]" />
                        )}
                        <span>{appt.mode}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#F0F5F2] flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#68766F]">
                    Payment:{" "}
                    <span
                      className={`font-semibold capitalize ${
                        appt.paymentStatus === "paid" ? "text-[#075B35]" : "text-amber-700"
                      }`}
                    >
                      {appt.paymentStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUpcoming && isOnline && (
                      <Link
                        href={`/patient/consultations?room=${appt.appointmentCode}`}
                        className="px-3.5 py-1.5 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Call</span>
                      </Link>
                    )}

                    {isUpcoming && appt.status === "scheduled" && (
                      <button
                        onClick={() => {
                          setAppointmentToReschedule(appt);
                          setRescheduleModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-[#EDF8F1] text-gray-700 hover:text-[#075B35] text-xs font-semibold rounded-lg border border-gray-200 transition-colors"
                      >
                        Reschedule
                      </button>
                    )}

                    {isUpcoming && (
                      <button
                        onClick={() => {
                          setAppointmentToCancel(appt);
                          setCancelModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-semibold rounded-lg border border-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Booking Modal */}
      {/* ========================================================================= */}
      {bookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F5F2]">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#14251F]">
                  Book New Consultation
                </h3>
                <p className="text-xs text-[#68766F]">Select your service, clinician, and slot</p>
              </div>
              <button
                onClick={() => setBookModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccessMsg ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-[#075B35] mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-[#14251F]">{bookingSuccessMsg}</h4>
                <p className="text-xs text-[#68766F]">Updating your clinical schedule...</p>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="py-4 space-y-4 text-xs">
                {/* Service Selection */}
                <div>
                  <label className="font-bold text-[#14251F] block mb-1.5">Consultation Service</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F] focus:outline-none focus:ring-2 focus:ring-[#075B35]/20"
                  >
                    <option value="Homoeopathy Consultation">Homoeopathy Initial Consultation</option>
                    <option value="PCOS Management">PCOS Management & Follow-up</option>
                    <option value="Women's Wellness & PCOD">Women&apos;s Wellness &amp; Hormonal Balance</option>
                    <option value="Diet & Nutrition Review">Diet & Clinical Nutrition Review</option>
                  </select>
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="font-bold text-[#14251F] block mb-1.5">Select Doctor</label>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F] focus:outline-none focus:ring-2 focus:ring-[#075B35]/20"
                    required
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.userId?.name} ({d.qualifications || "MBBS/MD"}) - ₹{d.consultationFee || 700}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mode Selection */}
                <div>
                  <label className="font-bold text-[#14251F] block mb-1.5">Consultation Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMode("Online Video Consultation")}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                        selectedMode === "Online Video Consultation"
                          ? "border-[#075B35] bg-[#EDF8F1] text-[#075B35] font-bold"
                          : "border-gray-200 bg-white text-[#68766F]"
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>Video (Online)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMode("In-Clinic Consultation")}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                        selectedMode === "In-Clinic Consultation"
                          ? "border-[#075B35] bg-[#EDF8F1] text-[#075B35] font-bold"
                          : "border-gray-200 bg-white text-[#68766F]"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>In-Clinic Visit</span>
                    </button>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="font-bold text-[#14251F] block mb-1.5">Date</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F] focus:outline-none focus:ring-2 focus:ring-[#075B35]/20"
                    required
                  />
                </div>

                {/* Leave Warning Banner */}
                {doctorIsOnLeave && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold block">Doctor On Approved Leave</span>
                      <p className="text-[11px] text-amber-700">
                        Doctor is on approved {doctorLeaveDetails?.leaveType || "HRMS"} leave on this date. Booking is unavailable. Please select another date.
                      </p>
                    </div>
                  </div>
                )}

                {/* Available Slot Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-[#14251F]">Available Time Slot</label>
                    {loadingAvailability && (
                      <span className="text-[11px] text-[#075B35] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
                      </span>
                    )}
                  </div>

                  {availableSlots.length === 0 && !loadingAvailability ? (
                    <p className="text-gray-500 py-2">No slots available for the selected date.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedSlot === slot.startTime;
                        const disabled = !slot.isAvailable || doctorIsOnLeave;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSlot(slot.startTime)}
                            className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold cursor-pointer transition ${
                              disabled
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                                : isSelected
                                ? "bg-[#075B35] text-white border-[#075B35]"
                                : "bg-white text-[#68766F] border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {slot.startTime}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Health concern intake note */}
                <div>
                  <label className="font-bold text-[#14251F] block mb-1.5">Chief Concern / Symptom Note</label>
                  <textarea
                    rows={2}
                    value={intakeNotes}
                    onChange={(e) => setIntakeNotes(e.target.value)}
                    placeholder="Briefly describe your symptoms or reason for visit..."
                    className="w-full p-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F] focus:outline-none focus:ring-2 focus:ring-[#075B35]/20 text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={bookingInProgress || doctorIsOnLeave || !selectedSlot}
                    className="w-full py-3 bg-[#075B35] hover:bg-[#064A2D] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingInProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validating Slot & Reserving...</span>
                      </>
                    ) : (
                      <span>Confirm & Book Appointment</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Reschedule Modal */}
      {/* ========================================================================= */}
      {rescheduleModalOpen && appointmentToReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-[#075B35]">Reschedule Appointment</h3>
                <p className="text-[11px] text-gray-500">
                  {appointmentToReschedule.appointmentCode} &bull; {appointmentToReschedule.serviceName}
                </p>
              </div>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="py-4 text-xs space-y-3.5">
              {rescheduleError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <span>{rescheduleError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 block mb-1">New Appointment Date:</label>
                <input
                  type="date"
                  min={todayStr}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#075B35]/20"
                  required
                />
              </div>

              {rescheduleDoctorOnLeave && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">Doctor On Leave</span>
                    <p className="text-[11px] text-amber-700">
                      Doctor is on approved {rescheduleLeaveDetails?.leaveType || "HRMS"} leave on this date.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-700">New Available Slot:</label>
                  {loadingRescheduleSlots && (
                    <span className="text-[10px] text-[#075B35] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {rescheduleSlots.map((slot) => {
                    const isSelected = rescheduleSlot === slot.startTime;
                    const disabled = !slot.isAvailable || rescheduleDoctorOnLeave;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={disabled}
                        onClick={() => setRescheduleSlot(slot.startTime)}
                        className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold cursor-pointer transition ${
                          disabled
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                            : isSelected
                            ? "bg-[#075B35] text-white border-[#075B35]"
                            : "bg-white text-[#68766F] border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling || rescheduleDoctorOnLeave || !rescheduleSlot}
                  className="flex-1 py-2 bg-[#075B35] hover:bg-[#064A2D] text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rescheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Confirm Reschedule</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Cancellation Modal */}
      {/* ========================================================================= */}
      {cancelModalOpen && appointmentToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-red-600">Cancel Appointment</h3>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 text-xs space-y-3">
              <p className="text-gray-600">
                Are you sure you want to cancel appointment <strong>{appointmentToCancel.appointmentCode}</strong> on{" "}
                <strong>{appointmentToCancel.appointmentDate}</strong>?
              </p>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Reason for cancellation:</label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Change of schedule, personal reason..."
                  className="w-full p-2.5 rounded-lg border border-gray-200 text-xs"
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                Note: In accordance with our 24-hour notice policy, refunds are processed according to our clinical guidelines.
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-gray-100">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2 bg-gray-100 rounded-lg font-semibold text-xs"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Confirm Cancel</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
