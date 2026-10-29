"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  FileText,
  Calendar,
  Stethoscope,
  Pill,
  Clock,
  Phone,
  AlertTriangle,
  X,
  ChevronRight,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PatientRecord {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  medicalHistory?: string;
  allergies?: string[];
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  lastVisit?: string;
  upcomingVisit?: string;
}

interface DoctorPatientsTabProps {
  onOpenConsultation?: (appointmentId: string, patientId: string) => void;
  initialSelectedPatientId?: string | null;
}

export function DoctorPatientsTab({
  onOpenConsultation,
  initialSelectedPatientId,
}: DoctorPatientsTabProps) {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleOpenPatient = async (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setProfileModalOpen(true);
    try {
      setHistoryLoading(true);
      const res = await api.get<{ data?: any }>(`/api/v1/doctor/patients/${patient._id}/history`);
      setPatientHistory((res as any).data || null);
    } catch (err) {
      console.error("Failed to load patient history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data?: { patients?: PatientRecord[] }; patients?: PatientRecord[] }>(
        `/api/v1/doctor/patients?search=${encodeURIComponent(search)}`
      );
      const list = (res as any).data?.patients || (res as any).patients || (Array.isArray((res as any).data) ? (res as any).data : []);
      setPatients(list);

      // Auto-open if initial ID passed
      if (initialSelectedPatientId) {
        const found = list.find((p: PatientRecord) => p._id === initialSelectedPatientId);
        if (found) {
          handleOpenPatient(found);
        }
      }
    } catch (err) {
      console.error("Failed to load patients", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#154734]" /> My Authorized Patients
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Access verified clinical records, prior medical histories, allergies, and consultation logs.
          </p>
        </div>
        <div className="text-xs font-semibold text-[#154734] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          {patients.length} Authorized Records
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by patient name, patient ID (#TG00...), or mobile number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-2xl text-xs text-[#17251E] placeholder:text-gray-400 shadow-sm"
        />
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-xs text-[#65746B]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
            Loading patient records...
          </div>
        ) : patients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[#65746B] bg-white rounded-2xl border border-[#E1E9E3]">
            No authorized patient records found.
          </div>
        ) : (
          patients.map((pt) => (
            <div
              key={pt._id}
              onClick={() => handleOpenPatient(pt)}
              className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm hover:shadow-md hover:border-[#154734]/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#E7F3EA] text-[#154734] font-bold text-sm flex items-center justify-center">
                    {pt.fullName?.slice(0, 2).toUpperCase() || "PT"}
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                    #{pt.patientCode || "TG00"}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#17251E] group-hover:text-[#154734] transition-colors">
                  {pt.fullName}
                </h3>
                <p className="text-xs text-[#65746B] mt-0.5">
                  {pt.age ? `${pt.age} yrs` : "Age N/A"} • {pt.gender || "Female"} • {pt.bloodGroup || "B+"}
                </p>

                <div className="mt-4 pt-3 border-t border-[#E1E9E3] text-xs space-y-1 text-[#65746B]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{pt.phone || "No phone listed"}</span>
                  </div>
                  {pt.allergies && pt.allergies.length > 0 && (
                    <div className="flex items-center gap-1.5 text-rose-600 font-medium text-[11px]">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Allergies: {pt.allergies.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#154734] font-semibold">
                <span>View Clinical Profile</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Patient Profile Modal */}
      {profileModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E1E9E3] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-[#154734] text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-lg text-emerald-300">
                  {selectedPatient.fullName?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedPatient.fullName}</h3>
                  <p className="text-xs text-white/70">
                    Patient ID: #{selectedPatient.patientCode} • {selectedPatient.age || 28} years •{" "}
                    {selectedPatient.gender || "Female"} • Blood Group: {selectedPatient.bloodGroup || "B+"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-2 text-white/70 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#17251E]">
              {/* Demographics & Emergency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F5F8F6] p-4 rounded-2xl border border-[#E1E9E3]">
                <div>
                  <h4 className="font-bold text-sm mb-2 text-[#154734]">Contact Information</h4>
                  <p>
                    <span className="text-[#65746B]">Phone: </span>
                    {selectedPatient.phone}
                  </p>
                  <p className="mt-1">
                    <span className="text-[#65746B]">Emergency Contact: </span>
                    {selectedPatient.emergencyContact?.name
                      ? `${selectedPatient.emergencyContact.name} (${selectedPatient.emergencyContact.relation || "Kin"}) - ${selectedPatient.emergencyContact.phone}`
                      : "None provided"}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-2 text-[#154734]">Medical Background</h4>
                  <p>
                    <span className="text-[#65746B]">Recorded History: </span>
                    {selectedPatient.medicalHistory || "No chronic illnesses reported."}
                  </p>
                  <p className="mt-1">
                    <span className="text-[#65746B]">Known Drug Allergies: </span>
                    <span className="text-rose-600 font-semibold">
                      {selectedPatient.allergies?.length ? selectedPatient.allergies.join(", ") : "None reported (NKDA)"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Consultation History */}
              <div>
                <h4 className="font-bold text-sm text-[#17251E] mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#154734]" /> Prior Consultations & Diagnoses
                </h4>
                {historyLoading ? (
                  <p className="py-6 text-center text-gray-400">Loading prior consultations...</p>
                ) : (patientHistory?.consultations || []).length === 0 ? (
                  <p className="p-4 bg-gray-50 rounded-xl text-gray-500">No prior consultations recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {patientHistory.consultations.map((c: any) => (
                      <div key={c._id} className="p-4 bg-white border border-[#E1E9E3] rounded-xl shadow-sm">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#154734] mb-1">
                          <span>Diagnosis: {c.diagnosis || "Consultation draft"}</span>
                          <span className="text-gray-400 text-[11px]">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[#65746B] text-xs">{c.treatmentPlan}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prescriptions History */}
              <div>
                <h4 className="font-bold text-sm text-[#17251E] mb-3 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#154734]" /> Prescription Records
                </h4>
                {(patientHistory?.prescriptions || []).length === 0 ? (
                  <p className="p-4 bg-gray-50 rounded-xl text-gray-500">No previous prescriptions recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {patientHistory.prescriptions.map((rx: any) => (
                      <div key={rx._id} className="p-4 bg-white border border-[#E1E9E3] rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-[#17251E]">
                            Prescribed on {new Date(rx.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {(rx.medications || []).map((m: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-700">
                              <span className="font-medium">• {m.name} ({m.dosage})</span>
                              <span className="text-gray-500">{m.frequency} — {m.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F5F8F6] border-t border-[#E1E9E3] flex justify-end">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-5 py-2 bg-[#154734] text-white rounded-xl text-xs font-semibold hover:bg-[#0E3828]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
