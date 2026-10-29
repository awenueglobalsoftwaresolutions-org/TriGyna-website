"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Calendar,
  Receipt,
  AlertTriangle,
  X,
  Loader2,
  Filter,
  RefreshCw,
} from "lucide-react";

export interface Patient {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  gender: string;
  age: number;
  bloodGroup?: string;
  address?: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  createdAt?: string;
}

interface PatientsDirectoryTabProps {
  patients: Patient[];
  isLoading: boolean;
  onRefresh: () => void;
  onRegisterPatient: (patientData: Record<string, unknown>) => Promise<void>;
  onBookAppointmentForPatient: (patientId: string) => void;
  onBillPatient: (patientId: string) => void;
}

export function PatientsDirectoryTab({
  patients,
  isLoading,
  onRefresh,
  onRegisterPatient,
  onBookAppointmentForPatient,
  onBillPatient,
}: PatientsDirectoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("all");

  // Register Patient Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState({
    fullName: "",
    phone: "",
    gender: "female",
    age: 28,
    bloodGroup: "O+",
    address: "Pune, Maharashtra",
    medicalHistory: "",
    allergies: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Spouse",
  });

  // Selected Patient Details Drawer
  const [selectedPatientDetail, setSelectedPatientDetail] = useState<Patient | null>(null);

  const handlePhoneChange = (phoneVal: string) => {
    setPatientForm((p) => ({ ...p, phone: phoneVal }));
    setDuplicateWarning(null);
    if (phoneVal.trim().length >= 10) {
      const match = patients.find((p) => p.phone === phoneVal.trim());
      if (match) {
        setDuplicateWarning(`Existing patient record found: ${match.fullName} (${match.patientCode})`);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.fullName || !patientForm.phone) return;
    setIsSubmitting(true);
    try {
      await onRegisterPatient({
        fullName: patientForm.fullName,
        phone: patientForm.phone,
        gender: patientForm.gender,
        age: Number(patientForm.age),
        bloodGroup: patientForm.bloodGroup,
        address: patientForm.address,
        medicalHistory: patientForm.medicalHistory,
        allergies: patientForm.allergies
          ? patientForm.allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        emergencyContact: patientForm.emergencyContactName
          ? {
              name: patientForm.emergencyContactName,
              phone: patientForm.emergencyContactPhone,
              relation: patientForm.emergencyContactRelation,
            }
          : undefined,
      });

      setIsRegisterModalOpen(false);
      setPatientForm({
        fullName: "",
        phone: "",
        gender: "female",
        age: 28,
        bloodGroup: "O+",
        address: "Pune, Maharashtra",
        medicalHistory: "",
        allergies: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelation: "Spouse",
      });
      setDuplicateWarning(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesGender = genderFilter === "all" || p.gender === genderFilter;
    const matchesBlood = bloodGroupFilter === "all" || p.bloodGroup === bloodGroupFilter;
    const name = p.fullName?.toLowerCase() || "";
    const phone = p.phone || "";
    const code = p.patientCode?.toLowerCase() || "";
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || phone.includes(query) || code.includes(query);
    return matchesGender && matchesBlood && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5ED] text-[#154734] text-xs font-semibold mb-2 border border-[#D1E2D8]">
            <Users className="w-3.5 h-3.5" />
            Electronic Health Records (EHR) • Master Directory
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17221D]">
            Patient Intake &amp; Permanent Profiles
          </h2>
          <p className="text-xs text-[#758277] mt-0.5 max-w-xl">
            Register new clinic walk-ins with instant collision detection, review medical histories, allergies, and dispatch directly to scheduling or POS.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="px-4.5 py-2.5 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Register Walk-In Patient
        </button>
      </div>

      {/* Directory Filter & Search Toolbar */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-4.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#758277]" />
          <input
            type="text"
            placeholder="Search by patient name, phone number, or chart ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 bg-[#FAF8F5]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-[#758277]">
            <Filter className="w-3.5 h-3.5 text-[#154734]" />
            <span>Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] text-[#17221D] focus:outline-none"
            >
              <option value="all">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#758277]">
            <span>Blood:</span>
            <select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] text-[#17221D] focus:outline-none"
            >
              <option value="all">All Groups</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <span className="text-xs font-semibold text-[#154734] bg-[#EAF5ED] px-3 py-1.5 rounded-xl border border-[#D1E2D8]">
            {filteredPatients.length} Patients Listed
          </span>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Refresh Patients"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E2D6] text-[11px] font-bold text-[#154734] uppercase tracking-wider">
                <th className="py-3 px-4">Chart ID</th>
                <th className="py-3 px-4">Patient Name &amp; Contact</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Allergies &amp; Medical Notes</th>
                <th className="py-3 px-4">Emergency Contact</th>
                <th className="py-3 px-4 text-right">Quick Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D6]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[#758277]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2.5 text-[#154734]" />
                    <p className="font-semibold text-xs text-[#154734]">Loading patient records...</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[#758277]">
                    <Users className="w-8 h-8 text-[#758277]/40 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-[#17221D]">No patient profiles found</p>
                    <p className="text-xs text-[#758277] mt-0.5">Try adjusting search terms or register a new walk-in patient.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((pat) => (
                  <tr key={pat._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#154734]">
                      {pat.patientCode}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#17221D]">{pat.fullName}</p>
                      <p className="text-[11px] text-[#758277] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#758277]" />
                        <span>{pat.phone}</span>
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#17221D]">{pat.age} yrs</p>
                      <p className="text-[10px] text-[#758277] capitalize">{pat.gender}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                        {pat.bloodGroup || "O+"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {pat.allergies && pat.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {pat.allergies.map((alg, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              {alg}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-[11px] text-[#758277] truncate">
                        {pat.medicalHistory || "No chronic illnesses noted"}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      {pat.emergencyContact?.name ? (
                        <div>
                          <p className="font-semibold text-[#17221D] text-[11px]">
                            {pat.emergencyContact.name} ({pat.emergencyContact.relation || "Kin"})
                          </p>
                          <p className="text-[10px] text-[#758277]">{pat.emergencyContact.phone}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#758277]/60">None logged</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedPatientDetail(pat)}
                          className="px-2.5 py-1 rounded-lg border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5] text-[11px] font-semibold transition-all cursor-pointer"
                          title="View Complete Clinical Profile"
                        >
                          View Info
                        </button>

                        <button
                          onClick={() => onBookAppointmentForPatient(pat._id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          title="Schedule Appointment"
                        >
                          <Calendar className="w-3 h-3" />
                          Book
                        </button>

                        <button
                          onClick={() => onBillPatient(pat._id)}
                          className="px-2.5 py-1 rounded-lg border border-[#E8E2D6] text-[#154734] hover:bg-[#EAF5ED] text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Generate POS Bill"
                        >
                          <Receipt className="w-3 h-3" />
                          Bill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Walk-In Patient */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#154734]" />
                  Walk-In Patient Registration &amp; Intake
                </h3>
                <p className="text-xs text-[#758277] mt-0.5">
                  Generate official EHR Chart ID with real-time phone duplicate validation
                </p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Duplicate Phone Detected</p>
                  <p className="text-[11px] mt-0.5">{duplicateWarning}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#154734] mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={patientForm.fullName}
                  onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                  placeholder="E.g., Ananya Deshmukh"
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Phone Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    value={patientForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9876543210"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Gender</label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={patientForm.age}
                    onChange={(e) => setPatientForm({ ...patientForm, age: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Blood Group</label>
                  <select
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Address / Locality</label>
                <input
                  type="text"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                  placeholder="Koregaon Park, Pune"
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Allergies (comma-separated)</label>
                <input
                  type="text"
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                  placeholder="E.g., Dust, Penicillin, Sulfa"
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#154734] mb-1">Medical Background Notes</label>
                <textarea
                  rows={2}
                  value={patientForm.medicalHistory}
                  onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
                  placeholder="PCOD, Thyroid, Diabetes, previous surgeries..."
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block font-bold text-[#154734] mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={patientForm.emergencyContactName}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyContactName: e.target.value })}
                    placeholder="Relative Name"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-bold text-[#154734] mb-1">Relation</label>
                  <input
                    type="text"
                    value={patientForm.emergencyContactRelation}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyContactRelation: e.target.value })}
                    placeholder="Spouse / Parent"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block font-bold text-[#154734] mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={patientForm.emergencyContactPhone}
                    onChange={(e) => setPatientForm({ ...patientForm, emergencyContactPhone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
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
                      Registering...
                    </>
                  ) : (
                    "Create EHR Profile"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer: Detailed Patient Clinical Profile */}
      {selectedPatientDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734]">
                  Clinical Profile Summary
                </h3>
                <p className="text-xs text-[#758277]">
                  {selectedPatientDetail.fullName} • Chart: {selectedPatientDetail.patientCode}
                </p>
              </div>
              <button
                onClick={() => setSelectedPatientDetail(null)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E2D6] space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#758277] text-[10px] uppercase font-bold">Contact Phone</span>
                  <p className="font-bold text-[#17221D]">{selectedPatientDetail.phone}</p>
                </div>
                <div>
                  <span className="text-[#758277] text-[10px] uppercase font-bold">Age &amp; Gender</span>
                  <p className="font-bold text-[#17221D] capitalize">{selectedPatientDetail.age} yrs • {selectedPatientDetail.gender}</p>
                </div>
                <div>
                  <span className="text-[#758277] text-[10px] uppercase font-bold">Blood Group</span>
                  <p className="font-bold text-rose-700">{selectedPatientDetail.bloodGroup || "O+"}</p>
                </div>
                <div>
                  <span className="text-[#758277] text-[10px] uppercase font-bold">Locality</span>
                  <p className="font-bold text-[#17221D]">{selectedPatientDetail.address || "Pune"}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-black/5">
                <span className="text-[#758277] text-[10px] uppercase font-bold">Known Allergies</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedPatientDetail.allergies && selectedPatientDetail.allergies.length > 0 ? (
                    selectedPatientDetail.allergies.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#758277]">No drug or food allergies reported</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-black/5">
                <span className="text-[#758277] text-[10px] uppercase font-bold">Clinical Background</span>
                <p className="mt-0.5 text-[#17221D] leading-relaxed">
                  {selectedPatientDetail.medicalHistory || "Healthy adult female, no documented comorbidities."}
                </p>
              </div>

              {selectedPatientDetail.emergencyContact?.name && (
                <div className="pt-2 border-t border-black/5">
                  <span className="text-[#758277] text-[10px] uppercase font-bold">Emergency Next of Kin</span>
                  <p className="mt-0.5 text-[#17221D]">
                    {selectedPatientDetail.emergencyContact.name} ({selectedPatientDetail.emergencyContact.relation || "Kin"}) • {selectedPatientDetail.emergencyContact.phone}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  const patId = selectedPatientDetail._id;
                  setSelectedPatientDetail(null);
                  onBookAppointmentForPatient(patId);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Appointment
              </button>
              <button
                onClick={() => {
                  const patId = selectedPatientDetail._id;
                  setSelectedPatientDetail(null);
                  onBillPatient(patId);
                }}
                className="px-4 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                Create POS Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
