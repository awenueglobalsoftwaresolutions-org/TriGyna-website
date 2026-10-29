"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HeartPulse,
  Search,
  Plus,
  Loader2,
  Calendar,
  Phone,
  Mail,
  FileText,
  Clock,
  User,
  X,
  ChevronRight,
  ShieldAlert,
  Users,
  Activity,
  Droplet,
  CheckCircle2,
  Stethoscope,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PatientRecord {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender: "female" | "male" | "other";
  age: number;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  createdAt: string;
}

export function PatientsTab({ showNotification }: { showNotification: (msg: string, isErr?: boolean) => void }) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "clinical" | "contact">("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    gender: "female" as "female" | "male" | "other",
    age: 28,
    bloodGroup: "B+",
    medicalHistory: "",
    allergies: "None reported",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Spouse",
  });

  const loadPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ patients: PatientRecord[] }>("/patients?limit=100");
      if (res.data?.patients) {
        setPatients(res.data.patients);
      }
    } catch {
      showNotification("Could not load patients list", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      showNotification("Patient Name and Phone are required", true);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        gender: formData.gender,
        age: Number(formData.age),
        bloodGroup: formData.bloodGroup,
        medicalHistory: formData.medicalHistory.trim() || "General Consultation",
        allergies: formData.allergies.trim() || "None reported",
      };

      if (formData.emergencyContactName.trim() || formData.emergencyContactPhone.trim()) {
        payload.emergencyContact = {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.trim(),
          relation: formData.emergencyContactRelation,
        };
      }

      const res = await api.post<{ patient: PatientRecord }>("/patients", payload);
      if (res.success && res.data?.patient) {
        showNotification(`Patient ${res.data.patient.fullName} (${res.data.patient.patientCode}) registered successfully`);
        setIsAddModalOpen(false);
        setFormData({
          fullName: "",
          phone: "",
          email: "",
          gender: "female",
          age: 28,
          bloodGroup: "B+",
          medicalHistory: "",
          allergies: "None reported",
          emergencyContactName: "",
          emergencyContactPhone: "",
          emergencyContactRelation: "Spouse",
        });
        loadPatients();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to register patient", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.patientCode.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q));

    const matchGender = genderFilter === "all" || p.gender === genderFilter;
    const matchBlood = bloodGroupFilter === "all" || p.bloodGroup === bloodGroupFilter;
    return matchSearch && matchGender && matchBlood;
  });

  const femaleCount = patients.filter((p) => p.gender === "female").length;
  const recentCount = patients.filter((p) => {
    if (!p.createdAt) return false;
    const diff = Date.now() - new Date(p.createdAt).getTime();
    return diff < 30 * 86400000;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#154734]/10 text-[#154734]">
              <HeartPulse className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#18231D]">Patients Directory</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#68756D] mt-1">
            Complete electronic health registry, case codes, and clinical intake profiles.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Total Patients</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : patients.length.toLocaleString()}
            </p>
            <span className="text-[11px] text-[#287A4B] font-medium mt-0.5 inline-block">Active EMR Records</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#287A4B] flex items-center justify-center border border-emerald-100">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Women&apos;s Health Intake</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : femaleCount}
            </p>
            <span className="text-[11px] text-[#154734] font-medium mt-0.5 inline-block">
              {patients.length > 0 ? `${Math.round((femaleCount / patients.length) * 100)}% of cohort` : "—"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF5ED] text-[#154734] flex items-center justify-center border border-[#D5E5DA]">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E9E3] p-4.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#68756D]">Recent Registrations (30d)</span>
            <p className="text-2xl font-serif font-bold text-[#18231D] mt-1 font-mono">
              {isLoading ? "—" : recentCount}
            </p>
            <span className="text-[11px] text-[#3568A8] font-medium mt-0.5 inline-block">Verified Patient Profiles</span>
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
            placeholder="Search by name, phone, code (TG-P-...), or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] placeholder:text-[#68756D] focus:bg-white focus:outline-none focus:border-[#154734] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-[#68756D]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] focus:outline-none focus:border-[#154734]"
          >
            <option value="all">All Genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>

          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl text-[#18231D] focus:outline-none focus:border-[#154734]"
          >
            <option value="all">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          <span className="text-xs text-[#68756D] font-mono ml-auto">
            {filteredPatients.length} of {patients.length} records
          </span>
        </div>
      </div>

      {/* 4. Patients Table / Mobile Cards */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#68756D] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
            <span className="text-xs">Loading patient directory...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-16 text-center text-[#68756D] flex flex-col items-center justify-center p-6">
            <User className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-[#18231D]">No patient records found</p>
            <p className="text-xs text-[#68756D] mt-0.5">Try adjusting your search criteria or register a new patient.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Patient Code</th>
                    <th className="py-3 px-4">Full Name &amp; Age</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Blood Group</th>
                    <th className="py-3 px-4">Clinical Focus</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {filteredPatients.map((p) => (
                    <tr key={p._id} className="hover:bg-[#F7F9F7]/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#154734] bg-[#EAF5ED] px-2 py-0.5 rounded-md border border-[#D5E5DA]">
                          {p.patientCode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#18231D] text-xs">{p.fullName}</p>
                        <p className="text-[11px] text-[#68756D] capitalize">
                          {p.gender} • {p.age} Yrs
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <p className="text-[#18231D]">{p.phone}</p>
                        {p.email && <p className="text-[10px] text-[#68756D] font-sans truncate max-w-[160px]">{p.email}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                          {p.bloodGroup || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-[#18231D] line-clamp-1 max-w-[200px]" title={p.medicalHistory}>
                          {p.medicalHistory || "General Consultation"}
                        </p>
                        {p.allergies && p.allergies !== "None reported" && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5 inline-block">
                            Allergy: {p.allergies}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#68756D] font-mono text-[11px]">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPatient(p);
                            setActiveProfileTab("overview");
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#154734] bg-[#EAF5ED] hover:bg-[#D5E5DA] rounded-lg transition-colors cursor-pointer border border-[#D5E5DA]"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[#E2E9E3]">
              {filteredPatients.map((p) => (
                <div key={p._id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-[#154734] bg-[#EAF5ED] px-2 py-0.5 rounded-md border border-[#D5E5DA]">
                        {p.patientCode}
                      </span>
                      <h4 className="text-sm font-bold text-[#18231D] mt-1">{p.fullName}</h4>
                      <p className="text-[11px] text-[#68756D] capitalize">
                        {p.gender} • {p.age} Yrs {p.bloodGroup ? `• Blood: ${p.bloodGroup}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPatient(p);
                        setActiveProfileTab("overview");
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-[#154734] bg-[#EAF5ED] rounded-lg border border-[#D5E5DA]"
                    >
                      Profile
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#68756D] pt-1 border-t border-[#E2E9E3]/60 font-mono">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{p.phone}</span>
                    </span>
                    <span className="ml-auto text-[10px]">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 5. Register New Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2E9E3] max-w-lg w-full shadow-xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E2E9E3] px-6 py-4 bg-[#F7F9F7]">
              <div>
                <h3 className="font-serif font-bold text-base text-[#154734]">Register New Patient</h3>
                <p className="text-[11px] text-[#68756D]">Create a new digital health record in the EMR.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Group 1: Personal Details */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-[#154734] uppercase tracking-wider block border-b border-[#E2E9E3] pb-1">
                  1. Personal Demographics
                </span>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Mishra"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#18231D] mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18231D] mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="patient@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-[#18231D] mb-1">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18231D] mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as "female" | "male" | "other" })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white focus:outline-none focus:border-[#154734]"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18231D] mb-1">Blood Group</label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white focus:outline-none focus:border-[#154734]"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 2: Clinical Intake */}
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-bold text-[#154734] uppercase tracking-wider block border-b border-[#E2E9E3] pb-1">
                  2. Clinical Intake &amp; Allergies
                </span>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Primary Health Concern / Medical History</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Hormonal imbalance, PCOS, irregular cycles, constitutional fatigue..."
                    value={formData.medicalHistory}
                    onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#18231D] mb-1">Known Allergies / Drug Sensitivities</label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Pollen, or 'None reported'"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                  />
                </div>
              </div>

              {/* Group 3: Emergency Contact */}
              <div className="space-y-3 pt-2">
                <span className="text-[11px] font-bold text-[#154734] uppercase tracking-wider block border-b border-[#E2E9E3] pb-1">
                  3. Emergency Contact (Optional)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block font-semibold text-[#18231D] mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rohit Mishra"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block font-semibold text-[#18231D] mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9811223344"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl focus:border-[#154734] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block font-semibold text-[#18231D] mb-1">Relationship</label>
                    <select
                      value={formData.emergencyContactRelation}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E9E3] rounded-xl bg-white focus:outline-none"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Friend">Friend</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E9E3]">
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
                  className="px-4 py-2 bg-[#154734] text-white rounded-xl font-semibold hover:bg-[#0E3828] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Patient Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Patient Clinical Profile Sheet */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2E9E3] max-w-xl w-full shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#F7F9F7] border-b border-[#E2E9E3]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold text-sm">
                  {selectedPatient.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#154734] bg-[#EAF5ED] px-2 py-0.5 rounded border border-[#D5E5DA]">
                      {selectedPatient.patientCode}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Verified Patient
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-[#18231D] mt-0.5">{selectedPatient.fullName}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex items-center border-b border-[#E2E9E3] px-6 bg-white gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveProfileTab("overview")}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeProfileTab === "overview"
                    ? "border-[#154734] text-[#154734]"
                    : "border-transparent text-[#68756D] hover:text-[#18231D]"
                }`}
              >
                Demographics
              </button>
              <button
                onClick={() => setActiveProfileTab("clinical")}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeProfileTab === "clinical"
                    ? "border-[#154734] text-[#154734]"
                    : "border-transparent text-[#68756D] hover:text-[#18231D]"
                }`}
              >
                Clinical History &amp; Allergies
              </button>
              <button
                onClick={() => setActiveProfileTab("contact")}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  activeProfileTab === "contact"
                    ? "border-[#154734] text-[#154734]"
                    : "border-transparent text-[#68756D] hover:text-[#18231D]"
                }`}
              >
                Emergency &amp; Metadata
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#18231D]">
              {activeProfileTab === "overview" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 bg-[#F7F9F7] p-4 rounded-xl border border-[#E2E9E3]">
                    <div>
                      <span className="text-[#68756D] block text-[11px]">Primary Phone</span>
                      <span className="font-mono font-semibold text-sm">{selectedPatient.phone}</span>
                    </div>
                    <div>
                      <span className="text-[#68756D] block text-[11px]">Email Address</span>
                      <span className="font-mono truncate block text-sm">{selectedPatient.email || "—"}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E2E9E3]/70">
                      <span className="text-[#68756D] block text-[11px]">Age &amp; Gender</span>
                      <span className="font-semibold capitalize">
                        {selectedPatient.age} Years / {selectedPatient.gender}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#E2E9E3]/70">
                      <span className="text-[#68756D] block text-[11px]">Blood Group</span>
                      <span className="font-bold text-rose-700 font-mono">{selectedPatient.bloodGroup || "Not specified"}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#EAF5ED] border border-[#D5E5DA] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#154734] uppercase tracking-wider">Registration Date</span>
                      <p className="text-xs font-mono font-semibold text-[#18231D] mt-0.5">
                        {selectedPatient.createdAt
                          ? new Date(selectedPatient.createdAt).toLocaleDateString("en-IN", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Verified"}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-[#287A4B]" />
                  </div>
                </div>
              )}

              {activeProfileTab === "clinical" && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-[#154734] mb-1.5 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Primary Clinical Concern &amp; Medical History</span>
                    </h4>
                    <p className="bg-[#F7F9F7] p-3.5 rounded-xl border border-[#E2E9E3] text-xs leading-relaxed text-[#18231D]">
                      {selectedPatient.medicalHistory || "Standard constitutional intake recorded upon registration."}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-[#154734] mb-1.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      <span>Known Allergies &amp; Sensitivities</span>
                    </h4>
                    <p className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs leading-relaxed text-amber-900">
                      {selectedPatient.allergies || "No drug or environmental allergies reported."}
                    </p>
                  </div>
                </div>
              )}

              {activeProfileTab === "contact" && (
                <div className="space-y-3">
                  <div className="bg-[#F7F9F7] p-4 rounded-xl border border-[#E2E9E3] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#68756D]">
                      Emergency Next of Kin Contact
                    </span>
                    {selectedPatient.emergencyContact?.name ? (
                      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                        <div>
                          <span className="text-[10px] text-[#68756D] block">Name</span>
                          <span className="font-semibold">{selectedPatient.emergencyContact.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#68756D] block">Phone</span>
                          <span className="font-mono font-semibold">{selectedPatient.emergencyContact.phone || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#68756D] block">Relation</span>
                          <span>{selectedPatient.emergencyContact.relation || "Kin"}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#68756D] italic">No emergency contact specified.</p>
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-[#68756D] font-mono">
                    <p>System Record ID: {selectedPatient._id}</p>
                    <p className="mt-0.5">EMR Compliance: HIPAA &amp; NDHM Ready Data Contract</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-3 bg-[#F7F9F7] border-t border-[#E2E9E3]">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
