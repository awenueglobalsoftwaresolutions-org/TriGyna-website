"use client";

import React, { useState } from "react";
import {
  Clock,
  Search,
  RefreshCw,
  UserCheck,
  Stethoscope,
  CheckCircle2,
  Receipt,
  UserPlus,
  Calendar,
  Activity,
  Heart,
  Thermometer,
  Scale,
  X,
  Loader2,
  Phone,
  Video,
  Building,
} from "lucide-react";

export interface Patient {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  gender: string;
  age: number;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

export interface Doctor {
  _id: string;
  userId: {
    _id: string;
    fullName?: string;
    name?: string;
    phone?: string;
  };
  specialization: string[];
  consultationFee: number;
}

export interface Appointment {
  _id: string;
  appointmentCode: string;
  patientId: Patient;
  doctorId: Doctor;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  mode: string;
  status: "scheduled" | "checked_in" | "waiting" | "in_consultation" | "completed" | "cancelled" | "no_show";
  vitals?: {
    bloodPressure?: string;
    pulse?: number;
    weight?: number;
    temperature?: number;
  };
  checkedInAt?: string;
  paymentStatus?: string;
}

interface QueueDeskTabProps {
  appointments: Appointment[];
  doctors: Doctor[];
  isLoading: boolean;
  onRefresh: () => void;
  onStatusUpdate: (apptId: string, status: string, vitals?: Record<string, unknown>) => Promise<void>;
  onOpenQuickRegister: () => void;
  onOpenBookSlot: () => void;
  onOpenPosBill: (patientId?: string) => void;
}

export function QueueDeskTab({
  appointments,
  doctors,
  isLoading,
  onRefresh,
  onStatusUpdate,
  onOpenQuickRegister,
  onOpenBookSlot,
  onOpenPosBill,
}: QueueDeskTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");

  // Vitals Check-in Modal
  const [vitalsModalAppt, setVitalsModalAppt] = useState<Appointment | null>(null);
  const [vitalsForm, setVitalsForm] = useState({
    bloodPressure: "120/80",
    pulse: 76,
    weight: 62,
    temperature: 98.4,
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === "all" || appt.status === statusFilter;
    const matchesDoctor = doctorFilter === "all" || appt.doctorId?._id === doctorFilter;
    const name = appt.patientId?.fullName?.toLowerCase() || "";
    const phone = appt.patientId?.phone || "";
    const code = appt.appointmentCode?.toLowerCase() || "";
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || phone.includes(query) || code.includes(query);
    return matchesStatus && matchesDoctor && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "checked_in":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse";
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

  const handleConfirmCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalsModalAppt) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusUpdate(vitalsModalAppt._id, "checked_in", vitalsForm);
      setVitalsModalAppt(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Top Bar */}
      <div className="bg-gradient-to-r from-[#154734] via-[#1A533D] to-[#25684D] rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-2.5 backdrop-blur-xs border border-white/10">
              <Activity className="w-3.5 h-3.5 text-emerald-300" />
              Live Front Desk Operations • Koregaon Park Clinic
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
              OPD Waiting Room &amp; Patient Flow
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Real-time patient triage, token sequence progression, vitals recording at desk, and instant POS cashiering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenQuickRegister}
              className="px-4 py-2.5 rounded-xl bg-white text-[#154734] hover:bg-[#F3EFEA] text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#154734]" />
              New Patient Intake
            </button>
            <button
              onClick={onOpenBookSlot}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Book Appointment
            </button>
            <button
              onClick={() => onOpenPosBill()}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/20 backdrop-blur-xs cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              POS Billing
            </button>
          </div>
        </div>
      </div>

      {/* KPI Triage Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4.5 shadow-xs">
          <p className="text-[11px] text-[#758277] uppercase font-bold tracking-wider">
            Total Today Queue
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#154734]">
              {appointments.length}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active OPD
            </span>
          </div>
          <p className="text-[10px] text-[#758277] mt-1">Confirmed patient encounters</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200/80 bg-amber-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-amber-800 uppercase font-bold tracking-wider">
            Waiting in Lobby
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-600">
              {appointments.filter((a) => a.status === "checked_in").length}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Triage Ready
            </span>
          </div>
          <p className="text-[10px] text-amber-700/80 mt-1">Checked in &amp; vitals taken</p>
        </div>

        <div className="bg-white rounded-2xl border border-purple-200/80 bg-purple-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-purple-800 uppercase font-bold tracking-wider">
            In Doctor Room
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-purple-700">
              {appointments.filter((a) => a.status === "in_consultation").length}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              In Session
            </span>
          </div>
          <p className="text-[10px] text-purple-700/80 mt-1">Inside consultation suite</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">
            Completed Today
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#154734]">
              {appointments.filter((a) => a.status === "completed").length}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Discharged
            </span>
          </div>
          <p className="text-[10px] text-emerald-700/80 mt-1">Prescription &amp; bill settled</p>
        </div>
      </div>

      {/* Main Queue Table Card */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-xs overflow-hidden">
        {/* Table Filters Toolbar */}
        <div className="p-4.5 sm:p-5 border-b border-[#E8E2D6] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#154734]" />
              Live Waiting Room Queue &amp; Patient Status
            </h2>
            <p className="text-xs text-[#758277] mt-0.5">
              Sequence of appointments with instantaneous check-in, vitals log, and doctor room handover
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#758277]" />
              <input
                type="text"
                placeholder="Search patient, phone, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 bg-[#FAF8F5]"
              />
            </div>

            {/* Doctor Filter */}
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] text-[#17221D] focus:outline-none focus:border-[#154734]"
            >
              <option value="all">All Practitioners</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.userId?.fullName || d.userId?.name || "Consultant"}
                </option>
              ))}
            </select>

            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E2D6]">
              {[
                { key: "all", label: "All" },
                { key: "scheduled", label: "Scheduled" },
                { key: "checked_in", label: "Waiting" },
                { key: "in_consultation", label: "In Room" },
                { key: "completed", label: "Done" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    statusFilter === f.key
                      ? "bg-[#154734] text-white shadow-xs"
                      : "text-[#758277] hover:text-[#154734]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table Records */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E2D6] text-[11px] font-bold text-[#154734] uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Token</th>
                <th className="py-3 px-4">Time / Code</th>
                <th className="py-3 px-4">Patient Profile</th>
                <th className="py-3 px-4">Doctor &amp; Suite</th>
                <th className="py-3 px-4">Service &amp; Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D6]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[#758277]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2.5 text-[#154734]" />
                    <p className="font-semibold text-xs text-[#154734]">Syncing real-time patient queue...</p>
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[#758277]">
                    <Clock className="w-8 h-8 text-[#758277]/40 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-[#17221D]">No appointments in this view</p>
                    <p className="text-xs text-[#758277] mt-0.5">Change filters or schedule a new walk-in encounter.</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appt, idx) => {
                  const tokenNumber = idx + 1;
                  return (
                    <tr key={appt._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-mono font-bold text-xs bg-[#EAF5ED] text-[#154734] border border-[#D1E2D8]">
                          #{tokenNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <p className="font-bold text-[#154734] text-sm">{appt.startTime}</p>
                        <p className="text-[10px] text-[#758277] tracking-tight">{appt.appointmentCode}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#17221D] text-xs">
                          {appt.patientId?.fullName || "Walk-in Patient"}
                        </p>
                        <p className="text-[11px] text-[#758277] flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-[#758277]" />
                          <span>{appt.patientId?.phone || "No phone"}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{appt.patientId?.patientCode || "PAT"}</span>
                        </p>
                        {appt.vitals && (
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/60 inline-flex">
                            <Activity className="w-2.5 h-2.5" />
                            <span>BP: {appt.vitals.bloodPressure || "120/80"}</span>
                            <span>•</span>
                            <span>Pulse: {appt.vitals.pulse || 76} bpm</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#154734]">
                          Dr. {appt.doctorId?.userId?.fullName || appt.doctorId?.userId?.name || "Harshali Sutar"}
                        </p>
                        <p className="text-[10px] text-[#758277] flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          <span>OPD Consultation Suite 1</span>
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#17221D]">{appt.serviceName}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#758277] mt-0.5">
                          {appt.mode === "video" ? (
                            <>
                              <Video className="w-3 h-3 text-purple-600" />
                              <span className="text-purple-700 font-semibold">Video Consult</span>
                            </>
                          ) : (
                            <>
                              <Building className="w-3 h-3 text-[#154734]" />
                              <span>In-Person Visit</span>
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
                              onClick={() => setVitalsModalAppt(appt)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" />
                              Check In &amp; Vitals
                            </button>
                          )}

                          {appt.status === "checked_in" && (
                            <button
                              onClick={() => onStatusUpdate(appt._id, "in_consultation")}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Stethoscope className="w-3 h-3" />
                              Send to Doctor
                            </button>
                          )}

                          {appt.status === "in_consultation" && (
                            <button
                              onClick={() => onStatusUpdate(appt._id, "completed")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark Completed
                            </button>
                          )}

                          <button
                            onClick={() => onOpenPosBill(appt.patientId?._id)}
                            className="px-2.5 py-1 rounded-lg border border-[#E8E2D6] text-[#154734] hover:bg-[#EAF5ED] text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="Generate POS Bill"
                          >
                            <Receipt className="w-3 h-3" />
                            Bill POS
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
      </div>

      {/* Modal: Check-In & Vitals Capture */}
      {vitalsModalAppt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#154734]" />
                  Patient Triage &amp; Check-In
                </h3>
                <p className="text-xs text-[#758277] mt-0.5">
                  Confirm arrival of {vitalsModalAppt.patientId?.fullName} ({vitalsModalAppt.appointmentCode})
                </p>
              </div>
              <button
                onClick={() => setVitalsModalAppt(null)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckIn} className="space-y-3.5 text-xs">
              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E8E2D6] space-y-1">
                <p className="font-bold text-[#17221D]">
                  Doctor: Dr. {vitalsModalAppt.doctorId?.userId?.fullName || vitalsModalAppt.doctorId?.userId?.name || "Consultant"}
                </p>
                <p className="text-[11px] text-[#758277]">
                  Slot: {vitalsModalAppt.startTime} • Service: {vitalsModalAppt.serviceName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#154734] mb-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" />
                    Blood Pressure (BP)
                  </label>
                  <input
                    type="text"
                    required
                    value={vitalsForm.bloodPressure}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })}
                    placeholder="120/80"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-purple-500" />
                    Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    required
                    value={vitalsForm.pulse}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: Number(e.target.value) })}
                    placeholder="72"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#154734] mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-blue-500" />
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={vitalsForm.weight}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, weight: Number(e.target.value) })}
                    placeholder="62"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-500" />
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: Number(e.target.value) })}
                    placeholder="98.4"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setVitalsModalAppt(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirm Check-In
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
