"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Calendar,
  Stethoscope,
  Pill,
  AlertTriangle,
  HeartPulse,
  User,
  Clock,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PatientOption {
  _id: string;
  fullName: string;
  patientCode: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
}

export function DoctorMedicalHistoryTab() {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  useEffect(() => {
    api.get<{ data?: PatientOption[] }>(`/api/v1/doctor/patients`).then((res) => {
      const list = (res as any).data?.patients || (Array.isArray((res as any).data) ? (res as any).data : ((res as any).patients || []));
      const safeList = Array.isArray(list) ? list : [];
      setPatients(safeList);
      if (safeList.length > 0) {
        setSelectedPatientId(safeList[0]._id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;

    setLoading(true);
    api
      .get<{ data?: any }>(`/api/v1/doctor/patients/${selectedPatientId}/history`)
      .then((res) => {
        const hist = (res as any).data?.patient ? (res as any).data : ((res as any).data || null);
        setHistoryData(hist);
      })
      .catch((err) => {
        console.error("Failed to load patient history", err);
      })
      .finally(() => setLoading(false));
  }, [selectedPatientId]);

  const filteredPatients = patients.filter((p) =>
    (p.fullName || "").toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patientCode.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p._id === selectedPatientId);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#154734]" /> Authorized Medical History Explorer
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Deep longitudinal clinical records, past diagnoses, treatment trajectories, and medication timelines.
          </p>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient Selector (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E1E9E3] shadow-sm p-4 flex flex-col h-[75vh]">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F5F8F6] border border-[#E1E9E3] rounded-xl text-xs text-[#17251E]"
            />
          </div>

          <div className="overflow-y-auto flex-1 space-y-1 divide-y divide-gray-100">
            {filteredPatients.map((p) => {
              const isSelected = p._id === selectedPatientId;
              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedPatientId(p._id)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected ? "bg-[#E7F3EA] text-[#154734] font-semibold" : "hover:bg-[#F9FCFA] text-[#17251E]"
                  }`}
                >
                  <div>
                    <p className="text-xs">{p.fullName}</p>
                    <p className="text-[11px] text-[#65746B]">
                      #{p.patientCode} • {p.age ? `${p.age}y` : "N/A"}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/70 border border-[#E1E9E3] text-gray-600">
                    {p.bloodGroup || "B+"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: History View (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E1E9E3] shadow-sm p-6 overflow-y-auto h-[75vh] space-y-6">
          {loading ? (
            <div className="py-24 text-center text-xs text-[#65746B]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
              Loading medical records...
            </div>
          ) : !selectedPatient ? (
            <div className="py-24 text-center text-xs text-gray-400">Select a patient to inspect records.</div>
          ) : (
            <>
              {/* Patient Banner */}
              <div className="p-4 bg-[#F5F8F6] rounded-2xl border border-[#E1E9E3] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#17251E]">{selectedPatient.fullName}</h3>
                  <p className="text-xs text-[#65746B]">
                    ID: #{selectedPatient.patientCode} • {selectedPatient.age || 28} years • Blood Group:{" "}
                    {selectedPatient.bloodGroup || "B+"}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {historyData?.patient?.allergies?.length
                      ? `Allergies: ${historyData.patient.allergies.join(", ")}`
                      : "No Known Drug Allergies"}
                  </span>
                </div>
              </div>

              {/* Consultation Timeline */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#154734] flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Consultation & Encounter Records
                </h4>

                {(historyData?.consultations || []).length === 0 ? (
                  <p className="p-4 bg-gray-50 rounded-xl text-xs text-gray-400">
                    No prior consultations logged for this patient.
                  </p>
                ) : (
                  historyData?.consultations.map((c: any) => (
                    <div key={c._id} className="p-4 border border-[#E1E9E3] rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between font-semibold text-[#17251E]">
                        <span className="text-[#154734]">Assessment: {c.diagnosis || "General checkup"}</span>
                        <span className="text-gray-400 text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {c.chiefComplaints && (
                        <p className="text-gray-700">
                          <span className="font-medium text-gray-500">Complaints: </span>
                          {c.chiefComplaints}
                        </p>
                      )}
                      {c.examinationNotes && (
                        <p className="text-gray-700">
                          <span className="font-medium text-gray-500">Exam Notes: </span>
                          {c.examinationNotes}
                        </p>
                      )}
                      {c.treatmentPlan && (
                        <div className="p-2.5 bg-[#F5F8F6] rounded-xl text-emerald-900 font-medium">
                          Plan: {c.treatmentPlan}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Prescriptions History */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#154734] flex items-center gap-2">
                  <Pill className="w-4 h-4" /> Medication History
                </h4>

                {(historyData?.prescriptions || []).length === 0 ? (
                  <p className="p-4 bg-gray-50 rounded-xl text-xs text-gray-400">
                    No previous prescription records found.
                  </p>
                ) : (
                  historyData?.prescriptions.map((rx: any) => (
                    <div key={rx._id} className="p-4 border border-[#E1E9E3] rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between font-semibold text-gray-600">
                        <span>Issued on {new Date(rx.createdAt).toLocaleDateString()}</span>
                        <span className="text-[11px] text-gray-400">Dr. {rx.doctorId?.fullName || "Ananya"}</span>
                      </div>
                      <div className="space-y-1">
                        {(rx.medications || []).map((m: any, i: number) => (
                          <div key={i} className="flex justify-between text-gray-800">
                            <span className="font-medium">• {m.name} ({m.dosage})</span>
                            <span className="text-gray-500">{m.frequency} — {m.duration}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
