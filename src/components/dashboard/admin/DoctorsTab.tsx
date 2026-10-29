"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  DollarSign,
  Phone,
  Mail,
  UserCheck,
  Award,
  X,
  Filter,
  Users,
  ShieldCheck,
  Activity,
  IndianRupee,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface DoctorItem {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    status: string;
    role: string;
  };
  specialization: string[];
  qualifications: string;
  consultationFee: number;
  bio?: string;
  status: "active" | "inactive";
  workingHours?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
  }>;
  createdAt: string;
}

const DAYS_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DoctorsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    specialization: "Women's Health & Homoeopathy",
    qualifications: "BHMS, MD (Hom.)",
    consultationFee: 750,
    bio: "Senior consultant specialist at TriGyna Women's Health Clinic.",
    salary: 70000,
  });

  const loadDoctors = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ doctors: DoctorItem[] }>(`/doctors?status=${statusFilter}`);
      if (res.data?.doctors) {
        setDoctors(res.data.doctors);
      }
    } catch {
      showNotification("Failed to load doctor roster", true);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showNotification]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      showNotification("Please provide doctor name and phone number", true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ doctor: DoctorItem }>("/doctors", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password || "TriGyna@123",
        specialization: [form.specialization.trim()],
        qualifications: form.qualifications.trim(),
        consultationFee: Number(form.consultationFee),
        bio: form.bio.trim(),
        salary: Number(form.salary),
        department: "Clinical",
      });

      if (res.success) {
        showNotification(
          `Doctor profile for ${form.name} created successfully! User, HRMS employee & doctor profile synchronized.`
        );
        setIsAddModalOpen(false);
        setForm({
          name: "",
          phone: "",
          email: "",
          password: "",
          specialization: "Women's Health & Homoeopathy",
          qualifications: "BHMS, MD (Hom.)",
          consultationFee: 750,
          bio: "Senior consultant specialist at TriGyna Women's Health Clinic.",
          salary: 70000,
        });
        loadDoctors();
      } else {
        showNotification(res.message || "Failed to create doctor", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Error creating doctor", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const name = doc.userId?.name?.toLowerCase() || "";
    const phone = doc.userId?.phone || "";
    const spec = (doc.specialization || []).join(" ").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || phone.includes(q) || spec.includes(q);
  });

  const activeDoctorsCount = doctors.filter((d) => d.status === "active").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#154734]/10 text-[#154734]">
              <Stethoscope className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#18231D]">Doctor Directory &amp; Roster</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#68756D] mt-1">
            Clinical practitioners, consultation fees, weekly availability, and synchronized HRMS profiles.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* 2. KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Total Clinicians</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : doctors.length}
            </p>
            <span className="text-[11px] text-[#154734] font-medium mt-0.5 inline-block">Registered Practitioners</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF5ED] text-[#154734] flex items-center justify-center border border-[#D5E5DA]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Active Consultants</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : activeDoctorsCount}
            </p>
            <span className="text-[11px] text-[#287A4B] font-medium mt-0.5 inline-block">Available for OPD Slots</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#287A4B] flex items-center justify-center border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Specialization Coverage</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1">Homoeopathy &amp; PCOS</p>
            <span className="text-[11px] text-[#3568A8] font-medium mt-0.5 inline-block">Full Clinical Alignment</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3568A8] flex items-center justify-center border border-blue-100">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#68756D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor name, phone, or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] placeholder:text-[#68756D] focus:bg-white focus:outline-none focus:border-[#154734] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#68756D]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] focus:outline-none focus:border-[#154734]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <span className="text-xs text-[#68756D] font-mono ml-2">{filteredDoctors.length} doctors found</span>
        </div>
      </div>

      {/* 4. Doctor Cards Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-16 text-center text-xs text-[#68756D] flex flex-col items-center justify-center gap-3 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
          <span>Loading clinical roster...</span>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-16 text-center text-xs text-[#68756D] shadow-xs">
          No doctor profiles found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-2xl border border-[#E2E9E3] p-5 shadow-xs hover:border-[#154734]/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#154734] to-[#0E3828] text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
                      {doc.userId?.name?.charAt(0) || "D"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#18231D] font-serif">{doc.userId?.name || "Practitioner"}</h3>
                      <p className="text-[11px] text-[#68756D] font-medium">{doc.qualifications || "Consultant"}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      doc.status === "active"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E9E3]/70 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#68756D]">
                    <Phone className="w-3.5 h-3.5 text-[#154734]" />
                    <span className="font-mono text-[#18231D] font-semibold">{doc.userId?.phone}</span>
                  </div>
                  {doc.userId?.email && (
                    <div className="flex items-center gap-2 text-[#68756D] truncate">
                      <Mail className="w-3.5 h-3.5 text-[#154734]" />
                      <span className="truncate">{doc.userId.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#68756D]">
                    <Award className="w-3.5 h-3.5 text-[#154734]" />
                    <span className="text-[#18231D]">{doc.specialization?.join(", ") || "General Homoeopathy"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#68756D]">
                    <IndianRupee className="w-3.5 h-3.5 text-[#154734]" />
                    <span>
                      Fee: <strong className="text-[#154734] font-mono">₹{doc.consultationFee}</strong> / session
                    </span>
                  </div>
                </div>

                {/* Available Days */}
                <div className="mt-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#68756D] block mb-1.5">
                    Weekly Schedule
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const hasDay = doc.workingHours?.some((wh) => wh.dayOfWeek === day);
                      return (
                        <span
                          key={day}
                          className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center border ${
                            hasDay
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : "bg-gray-50 text-gray-300 border-gray-100"
                          }`}
                          title={DAYS_MAP[day]}
                        >
                          {DAYS_MAP[day].charAt(0)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#E2E9E3] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(doc)}
                  className="text-xs text-[#154734] font-semibold hover:underline cursor-pointer"
                >
                  View Full Schedule
                </button>
                <span className="text-[10px] text-[#68756D] font-mono">
                  {doc.workingHours?.[0]
                    ? `${doc.workingHours[0].startTime} - ${doc.workingHours[0].endTime}`
                    : "10:00 - 18:00"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Doctor Detail Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2E9E3] max-w-lg w-full shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F7F9F7] border-b border-[#E2E9E3]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold text-sm">
                  {selectedDoctor.userId?.name?.charAt(0) || "D"}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#18231D]">
                    {selectedDoctor.userId?.name || "Dr. TriGyna"}
                  </h3>
                  <p className="text-[11px] text-[#68756D]">{selectedDoctor.qualifications}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#18231D]">
              <div className="bg-[#F7F9F7] p-4 rounded-xl border border-[#E2E9E3] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#68756D]">Phone:</span>
                  <span className="font-mono font-bold">{selectedDoctor.userId?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68756D]">Email:</span>
                  <span className="font-mono">{selectedDoctor.userId?.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68756D]">Consultation Fee:</span>
                  <span className="font-mono font-bold text-[#154734]">₹{selectedDoctor.consultationFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68756D]">Department:</span>
                  <span className="font-semibold">Clinical Specialist</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[#154734] mb-1">Clinical Biography</h4>
                <p className="bg-[#F7F9F7] p-3 rounded-xl border border-[#E2E9E3] text-xs leading-relaxed">
                  {selectedDoctor.bio || "Senior clinical consultant at TriGyna Healthcare."}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[#154734] mb-1">Weekly Clinic Schedule</h4>
                <div className="bg-[#F7F9F7] p-3 rounded-xl border border-[#E2E9E3] divide-y divide-[#E2E9E3]">
                  {selectedDoctor.workingHours && selectedDoctor.workingHours.length > 0 ? (
                    selectedDoctor.workingHours.map((wh, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#18231D]">{DAYS_MAP[wh.dayOfWeek]}</span>
                        <span className="font-mono text-[#154734]">
                          {wh.startTime} - {wh.endTime} ({wh.slotDurationMinutes} min slots)
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-center text-xs text-[#68756D]">
                      Monday to Saturday: 10:00 AM - 06:00 PM (Standard Roster)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3 bg-[#F7F9F7] border-t border-[#E2E9E3]">
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Doctor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative bg-white border border-[#E2E9E3] rounded-2xl max-w-lg w-full shadow-2xl z-10 animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#F7F9F7] border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#154734]/10 text-[#154734]">
                  <Stethoscope className="w-4 h-4" />
                </span>
                <h3 className="text-base font-serif font-bold text-[#154734]">Add New Consultant Doctor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Kavita Sharma"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="doctor@trigyna.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Login Password</label>
                  <input
                    type="password"
                    placeholder="TriGyna@123"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Qualifications</label>
                  <input
                    type="text"
                    placeholder="BHMS, MD (Hom.)"
                    value={form.qualifications}
                    onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Specialization</label>
                  <input
                    type="text"
                    placeholder="Women's Health & PCOS"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.consultationFee}
                    onChange={(e) => setForm({ ...form, consultationFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Monthly Base Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#18231D] mb-1">Professional Bio</label>
                <textarea
                  rows={2}
                  placeholder="Specialist overview..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E9E3]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E9E3] rounded-xl text-[#68756D] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Creating..." : "Save Doctor Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
