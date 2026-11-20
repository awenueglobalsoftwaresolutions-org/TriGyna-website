"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  ShieldCheck,
  Clock,
  Building2,
  GraduationCap,
  Award,
  Calendar,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
  Plane,
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  Send,
  CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface DoctorProfileData {
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
  };
  doctor: {
    _id: string;
    specialization: string;
    department?: string;
    qualifications?: string[];
    experienceYears?: number;
    bio?: string;
    consultationFee?: number;
    availability?: Array<{
      day: string;
      slots: string[];
    }>;
  };
}

interface LeaveRecord {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  reviewedBy?: {
    name?: string;
    role?: string;
  };
  createdAt: string;
}

export function DoctorProfileTab() {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ text: string; isError?: boolean } | null>(null);

  // Editable bio, fee & availability
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState<number>(800);
  const [availability, setAvailability] = useState<Array<{ day: string; slots: string[] }>>([
    { day: "Monday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Tuesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Wednesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Thursday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Friday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
    { day: "Saturday", slots: ["09:00 AM - 02:00 PM"] },
  ]);

  // Leave Requests state
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("casual");
  const [leaveReason, setLeaveReason] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveResultNotice, setLeaveResultNotice] = useState<string | null>(null);

  // New slot entry helper
  const [activeDayForNewSlot, setActiveDayForNewSlot] = useState<string | null>(null);
  const [customSlotText, setCustomSlotText] = useState("");

  const showNotice = (text: string, isError = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchProfileAndLeaves = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data?: DoctorProfileData }>(`/api/v1/doctor/profile`);
      const d = (res as any).data;
      if (d) {
        setProfile(d);
        if (d.doctor?.bio) setBio(d.doctor.bio);
        if (d.doctor?.consultationFee) setConsultationFee(d.doctor.consultationFee);
        if (d.doctor?.availability && d.doctor.availability.length > 0) {
          setAvailability(d.doctor.availability);
        }
      }

      // Fetch leaves
      setLeaveLoading(true);
      try {
        const leaveRes = await api.get<{ data?: { leaves?: LeaveRecord[] } }>(`/api/v1/doctor/leave-requests`);
        const list = (leaveRes as any).data?.leaves || (Array.isArray((leaveRes as any).data) ? (leaveRes as any).data : []);
        setLeaves(Array.isArray(list) ? list : []);
      } catch {
        // Leave request loading error handling
      } finally {
        setLeaveLoading(false);
      }
    } catch (err) {
      console.error("Failed to load doctor profile", err);
      showNotice("Failed to load clinical profile details", true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileAndLeaves();
  }, [fetchProfileAndLeaves]);

  const handleSaveAvailability = async () => {
    try {
      setIsSaving(true);
      await api.patch(`/api/v1/doctor/availability`, {
        bio,
        availability,
        consultationFee,
      });
      showNotice("Availability schedule, bio, and clinical fees updated successfully.");
    } catch (err: any) {
      showNotice(err.message || "Failed to save profile changes.", true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlot = (dayName: string) => {
    if (!customSlotText.trim()) return;
    setAvailability((prev) =>
      prev.map((av) => (av.day === dayName ? { ...av, slots: [...av.slots, customSlotText.trim()] } : av))
    );
    setCustomSlotText("");
    setActiveDayForNewSlot(null);
  };

  const handleRemoveSlot = (dayName: string, slotIndex: number) => {
    setAvailability((prev) =>
      prev.map((av) =>
        av.day === dayName ? { ...av, slots: av.slots.filter((_, idx) => idx !== slotIndex) } : av
      )
    );
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) {
      showNotice("Please choose both start and end date for your leave.", true);
      return;
    }
    if (!leaveReason.trim()) {
      showNotice("Please provide a clinical justification or reason for leave.", true);
      return;
    }

    try {
      setIsSubmittingLeave(true);
      setLeaveResultNotice(null);
      const res = await api.post<{ success: boolean; data?: any; message?: string }>(
        `/api/v1/doctor/leave-requests`,
        {
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          leaveType,
          reason: leaveReason.trim(),
        }
      );

      const affected = (res as any).data?.affectedAppointmentsCount ?? 0;
      setLeaveResultNotice(
        `Leave request submitted successfully for approval. ${
          affected > 0
            ? `${affected} appointment(s) in this period have been flagged for receptionist reassignment.`
            : "No existing bookings conflict with this period."
        }`
      );
      showNotice("Leave request submitted for administrative review.");

      // Reset form & refetch leaves
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveReason("");
      const refreshed = await api.get<{ data?: { leaves?: LeaveRecord[] } }>(`/api/v1/doctor/leave-requests`);
      const list = (refreshed as any).data?.leaves || (Array.isArray((refreshed as any).data) ? (refreshed as any).data : []);
      setLeaves(Array.isArray(list) ? list : []);
    } catch (err: any) {
      showNotice(err.message || "Failed to submit leave request.", true);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Approved & Blocked
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Declined
          </span>
        );
      case "pending":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <User className="w-5 h-5 text-[#154734]" /> Professional Profile & Clinical Availability
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Verified practitioner credentials, consultation fees, weekly booking slots, and leave applications.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAvailability}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? "Saving..." : "Save Availability & Bio"}</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-50 ${
            notification.isError
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {notification.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center text-xs text-[#65746B] bg-white rounded-2xl border border-[#E1E9E3]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
          Loading practitioner profile...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Grid: Practitioner Card (4 Cols) + Settings (8 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Practitioner Details */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-[#154734] text-white font-bold text-2xl flex items-center justify-center shadow-md mb-3 border-2 border-emerald-200">
                    {profile?.user?.fullName?.slice(0, 2).toUpperCase() || "AS"}
                  </div>
                  <h3 className="font-bold text-base text-[#17251E]">{profile?.user?.fullName || "Dr. Ananya Sharma"}</h3>
                  <p className="text-xs font-semibold text-[#154734] mt-0.5">
                    {profile?.doctor?.specialization || "Obstetrician & Gynecologist"}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E7F3EA] text-[#287A4B] border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Licensed Clinician
                  </span>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E1E9E3] space-y-3 text-xs text-[#17251E]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#65746B]">Medical Council ID</span>
                    <span className="font-mono font-semibold">#MCI-TG2026-901</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#65746B]">Clinical Email</span>
                    <span className="font-medium text-[#154734]">{profile?.user?.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#65746B]">Department</span>
                    <span className="font-semibold text-[#17251E]">
                      {profile?.doctor?.department || "Obstetrics & Gynecology"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#65746B]">Clinical Experience</span>
                    <span className="font-medium">{profile?.doctor?.experienceYears || 12} Years Active</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[#65746B]">Standard Consult Fee</span>
                    <div className="flex items-center gap-1 font-bold text-[#154734]">
                      <span>₹</span>
                      <input
                        type="number"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-[#F5F8F6] border border-[#E1E9E3] rounded-lg text-xs font-bold text-[#154734]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E1E9E3] space-y-2">
                  <h4 className="text-xs font-bold text-[#17251E] uppercase tracking-wider">
                    Medical Credentials & Degrees
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(profile?.doctor?.qualifications || ["MBBS", "MS (OBG)", "FICOG", "FMAS"]).map((q, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700"
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-[#154734]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized with Reception & Admin
                </p>
                <p>
                  Any updates to your availability schedule automatically update online slot booking for patients.
                </p>
              </div>
            </div>

            {/* Right: Bio & Availability Slots */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-sm text-[#17251E] mb-2">Clinical Bio & Treatment Philosophy</h3>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your clinical focus, core competencies, and patient care approach..."
                  className="w-full p-3 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-xl text-xs text-[#17251E] leading-relaxed shadow-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-[#17251E] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#154734]" /> Weekly Clinical Consultation Slots
                  </h3>
                  <span className="text-[11px] text-[#65746B]">
                    Patients can book slots only during active hours
                  </span>
                </div>

                <div className="space-y-3">
                  {availability.map((av, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#F5F8F6] border border-[#E1E9E3] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-bold text-[#17251E] w-28 shrink-0">{av.day}</span>
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        {av.slots.map((s, slotIdx) => (
                          <div
                            key={slotIdx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E1E9E3] rounded-xl text-xs font-medium text-[#154734] shadow-xs group"
                          >
                            <span>{s}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(av.day, slotIdx)}
                              className="text-gray-400 hover:text-rose-600 transition-colors"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {activeDayForNewSlot === av.day ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customSlotText}
                              onChange={(e) => setCustomSlotText(e.target.value)}
                              placeholder="e.g. 06:00 PM - 08:00 PM"
                              className="px-2.5 py-1 bg-white border border-[#154734] rounded-lg text-xs text-[#17251E] w-48 shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSlot(av.day)}
                              className="px-2.5 py-1 bg-[#154734] text-white rounded-lg text-xs font-semibold hover:bg-[#0E3828]"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveDayForNewSlot(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDayForNewSlot(av.day);
                              setCustomSlotText("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-dashed border-gray-300 hover:border-[#154734] text-gray-500 hover:text-[#154734] rounded-xl text-xs font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Slot</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Leave Application & Schedule Blocking Section (Section 18 of Blueprint) */}
          <div className="bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E1E9E3] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#17251E] flex items-center gap-2">
                  <Plane className="w-5 h-5 text-[#154734]" /> Clinical Leave & Schedule Blocking Workflow
                </h3>
                <p className="text-xs text-[#65746B] mt-1">
                  Submit planned leaves to block patient booking slots and notify administrative teams for seamless patient coverage.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#154734] bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                {leaves.filter((l) => l.status === "approved").length} Approved Leaves Active
              </span>
            </div>

            {/* Leave Application Form */}
            <form onSubmit={handleSubmitLeave} className="bg-[#F5F8F6] p-5 rounded-2xl border border-[#E1E9E3] space-y-4">
              <h4 className="text-xs font-bold text-[#17251E] uppercase tracking-wider">
                Apply for Clinical Leave / Absence
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-[#65746B] font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E] shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#65746B] font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E] shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#65746B] font-semibold mb-1">Leave Classification</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E] shadow-xs"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick / Medical Leave</option>
                    <option value="paid">Academic / Conference</option>
                    <option value="unpaid">Personal Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#65746B] font-semibold mb-1">Reason / Clinical Note</label>
                  <input
                    type="text"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="e.g. Annual Medical Conference..."
                    required
                    className="w-full px-3 py-2 bg-white border border-[#E1E9E3] rounded-xl text-xs text-[#17251E] shadow-xs"
                  />
                </div>
              </div>

              {leaveResultNotice && (
                <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                  {leaveResultNotice}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSubmittingLeave ? "Submitting Request..." : "Submit Leave Request"}</span>
                </button>
              </div>
            </form>

            {/* Leave History Table */}
            <div>
              <h4 className="text-xs font-bold text-[#17251E] uppercase tracking-wider mb-3">
                My Leave History & Administrative Approvals
              </h4>

              {leaveLoading ? (
                <div className="py-8 text-center text-xs text-[#65746B]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#154734] mb-2" />
                  Loading leave history...
                </div>
              ) : leaves.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#65746B] bg-[#F5F8F6] rounded-2xl border border-[#E1E9E3]">
                  No prior leave requests recorded. Your schedule is currently fully active.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#E1E9E3]">
                  <table className="w-full text-left text-xs border-collapse bg-white">
                    <thead>
                      <tr className="border-b border-[#E1E9E3] bg-[#FAFCFB] text-[#65746B] font-semibold">
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Admin Review Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E9E3]">
                      {leaves.map((l) => (
                        <tr key={l._id} className="hover:bg-[#F9FCFA] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#17251E]">
                            {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 capitalize text-[#65746B]">{l.leaveType}</td>
                          <td className="py-3 px-4 text-[#17251E] max-w-xs truncate">{l.reason}</td>
                          <td className="py-3 px-4">{renderStatusBadge(l.status)}</td>
                          <td className="py-3 px-4 text-[#65746B] italic">
                            {l.reviewNote || "Awaiting review"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
