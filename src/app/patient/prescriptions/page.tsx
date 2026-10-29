"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Pill,
  Printer,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Download,
  Loader2,
  X,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionRecord {
  _id: string;
  prescriptionCode: string;
  createdAt: string;
  dietaryAdvice?: string;
  specialInstructions?: string;
  medications: MedicationItem[];
  patientId?: {
    fullName?: string;
    patientCode?: string;
    age?: number;
    gender?: string;
  };
  doctorId?: {
    qualifications?: string;
    userId?: {
      name?: string;
      email?: string;
    };
  };
  consultationId?: {
    chiefComplaints?: string;
    diagnosis?: string;
  };
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRecord | null>(null);

  useEffect(() => {
    async function loadPrescriptions() {
      try {
        setLoading(true);
        const res = await api.get<{ prescriptions: PrescriptionRecord[] }>("/patient/me/prescriptions");
        if (res.success && res.data?.prescriptions) {
          setPrescriptions(res.data.prescriptions);
          if (res.data.prescriptions.length > 0) {
            setSelectedPrescription(res.data.prescriptions[0]);
          }
        }
      } catch (err) {
        console.error("Prescriptions fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrescriptions();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            Prescriptions & Posology
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            Verified electronic homoeopathic prescriptions published by your clinicians
          </p>
        </div>

        {selectedPrescription && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#075B35] hover:bg-[#064A2D] text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Active Slip</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#68766F] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#075B35] animate-spin mb-2" />
          <p className="text-xs">Loading published prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E4EEE7] p-12 text-center">
          <Pill className="w-12 h-12 text-[#68766F]/40 mx-auto mb-3" />
          <h3 className="text-base font-serif font-bold text-[#14251F]">No Prescriptions Available</h3>
          <p className="text-xs text-[#68766F] mt-1 max-w-sm mx-auto">
            Your doctor will publish prescription guidelines following your clinical consultation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Prescriptions List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#68766F] px-1">
              Prescription History ({prescriptions.length})
            </h3>
            <div className="space-y-2.5">
              {prescriptions.map((rx) => {
                const isSelected = selectedPrescription?._id === rx._id;
                return (
                  <div
                    key={rx._id}
                    onClick={() => setSelectedPrescription(rx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#F3FAF5] border-[#075B35] shadow-xs"
                        : "bg-white border-[#E4EEE7] hover:border-[#C6E7D2]"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#E4EEE7]/60">
                      <span className="font-mono font-bold text-xs text-[#075B35]">
                        {rx.prescriptionCode}
                      </span>
                      <span className="text-[11px] text-[#68766F]">
                        {new Date(rx.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[#14251F] mt-2">
                      {rx.doctorId?.userId?.name || "Dr. Harshali Sutar"}
                    </p>
                    <p className="text-[11px] text-[#68766F]">
                      {rx.medications.length} medicines prescribed
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Prescription Slip (8 cols) */}
          {selectedPrescription && (
            <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E4EEE7] p-6 sm:p-8 shadow-xs space-y-6">
              {/* Slip Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E4EEE7]">
                <div>
                  <Image
                    src="/images/brand/logo.webp"
                    alt="TriGyna"
                    width={140}
                    height={40}
                    className="h-9 w-auto object-contain"
                  />
                  <p className="text-[10px] text-[#68766F] mt-1 font-medium">
                    Certified Clinical Homoeopathy Electronic Prescription
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs font-mono font-bold text-[#075B35] bg-[#EDF8F1] px-3 py-1 rounded-full border border-[#D5E8DC]">
                    {selectedPrescription.prescriptionCode}
                  </span>
                  <p className="text-[11px] text-[#68766F] mt-1">
                    Date: {new Date(selectedPrescription.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Clinician & Patient Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8FAF9] border border-[#E4EEE7] text-xs">
                <div>
                  <span className="text-[#68766F] block font-medium">Prescribing Clinician:</span>
                  <span className="font-bold text-[#14251F] text-sm">
                    {selectedPrescription.doctorId?.userId?.name || "Attending Consultant"}
                  </span>
                  <span className="text-[11px] text-[#68766F] block">
                    {selectedPrescription.doctorId?.qualifications || "Consultant"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#68766F] block font-medium">Patient:</span>
                  <span className="font-bold text-[#14251F] text-sm">
                    {selectedPrescription.patientId?.fullName || "Patient"}
                  </span>
                  <span className="text-[11px] text-[#68766F] block">
                    Case ID: {selectedPrescription.patientId?.patientCode || "—"}
                  </span>
                  {selectedPrescription.patientId?.age && (
                    <span className="text-[10px] text-[#68766F]">
                      Age: {selectedPrescription.patientId.age} {selectedPrescription.patientId.gender ? `/ ${selectedPrescription.patientId.gender}` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Medicines Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#075B35] uppercase tracking-wider">
                  Prescribed Posology & Medicines
                </h4>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-xs">
                  <div className="p-3 bg-gray-50 font-bold grid grid-cols-12 text-[#556960]">
                    <span className="col-span-5">Medicine & Potency</span>
                    <span className="col-span-3">Dosage</span>
                    <span className="col-span-4">Frequency / Instructions</span>
                  </div>
                  {selectedPrescription.medications.map((med, idx) => (
                    <div key={idx} className="p-3 grid grid-cols-12 items-center text-[#14251F]">
                      <span className="col-span-5 font-semibold">{med.name}</span>
                      <span className="col-span-3 text-[#68766F]">{med.dosage}</span>
                      <span className="col-span-4 text-[#68766F]">
                        {med.frequency} • {med.duration}
                        {med.instructions && <span className="block text-[11px] text-gray-500 italic mt-0.5">{med.instructions}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dietary & Lifestyle Instructions */}
              {selectedPrescription.dietaryAdvice && (
                <div className="p-4 rounded-xl bg-[#FFFBF3] border border-[#F6EBD9] text-xs">
                  <span className="font-bold text-[#D97706] block mb-1">Dietary & Lifestyle Advice:</span>
                  <p className="text-[#68766F] leading-relaxed">{selectedPrescription.dietaryAdvice}</p>
                </div>
              )}

              {/* Verification & Disclaimer */}
              <div className="pt-4 border-t border-[#F0F5F2] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#68766F]">
                <div className="flex items-center gap-1.5 text-[#075B35]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Clinically Authorized & Signed Electronically</span>
                </div>
                <span>TriGyna EHR Platform • Version 2026.1</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
