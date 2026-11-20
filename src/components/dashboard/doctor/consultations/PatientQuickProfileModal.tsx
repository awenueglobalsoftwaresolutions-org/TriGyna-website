"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Calendar,
  HeartPulse,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface PatientQuickProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
}

export function PatientQuickProfileModal({
  isOpen,
  onClose,
  patientId,
}: PatientQuickProfileModalProps) {
  const [patientData, setPatientData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !patientId) {
      setPatientData(null);
      setHistory([]);
      return;
    }

    async function loadPatient() {
      try {
        setIsLoading(true);
        const [pRes, hRes] = await Promise.all([
          api.get<{ data?: any; patient?: any }>(`/api/v1/doctor/patients/${patientId}`),
          api.get<{ data?: any }>(`/api/v1/doctor/patients/${patientId}/history`).catch(() => ({ data: [] })),
        ]);
        const p = (pRes as any).data?.patient || (pRes as any).patient || (pRes as any).data;
        setPatientData(p);
        const hist = (hRes as any).data?.history || (hRes as any).data || [];
        setHistory(Array.isArray(hist) ? hist : []);
      } catch (err) {
        console.error("Failed to load patient quick profile", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPatient();
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E1EAE4] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-[#E1EAE4] bg-[#F2F7F4] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#064B38] text-white flex items-center justify-center font-bold text-sm">
              {patientData?.fullName ? patientData.fullName.slice(0, 2).toUpperCase() : "PT"}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17251F]">
                {patientData?.fullName || "Patient Clinical Profile"}
              </h3>
              <p className="text-xs text-[#718078]">
                Patient ID: #{patientData?.patientCode || "TG-PT"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#718078]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#064B38] mb-2" />
              Loading verified patient records...
            </div>
          ) : patientData ? (
            <>
              {/* Demographics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#F2F7F4] border border-[#E1EAE4] text-xs">
                <div>
                  <span className="text-[#718078] text-[11px] block">Age</span>
                  <span className="font-bold text-[#17251F]">{patientData.age ? `${patientData.age} yrs` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-[#718078] text-[11px] block">Gender</span>
                  <span className="font-bold text-[#17251F]">{patientData.gender || "Female"}</span>
                </div>
                <div>
                  <span className="text-[#718078] text-[11px] block">Blood Group</span>
                  <span className="font-bold text-[#064B38]">{patientData.bloodGroup || "Not recorded"}</span>
                </div>
                <div>
                  <span className="text-[#718078] text-[11px] block">Phone</span>
                  <span className="font-bold text-[#17251F]">{patientData.phone || "Protected"}</span>
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Documented Allergies
                </span>
                {patientData.allergies && patientData.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patientData.allergies.map((a: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#718078]">No known drug or food allergies documented.</p>
                )}
              </div>

              {/* Past History Summary */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-[#064B38] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Medical History Notes
                </span>
                {patientData.medicalHistory && patientData.medicalHistory.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-[#17251F]">
                    {patientData.medicalHistory.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#718078]">No past surgeries or chronic conditions recorded.</p>
                )}
              </div>

              {/* Emergency Contact */}
              {patientData.emergencyContact && (
                <div className="p-3 rounded-xl border border-[#E1EAE4] bg-white text-xs">
                  <span className="font-semibold text-[#718078] block text-[11px]">Emergency Contact</span>
                  <p className="font-bold text-[#17251F]">
                    {patientData.emergencyContact.name} ({patientData.emergencyContact.relationship || "Relative"}) • {patientData.emergencyContact.phone}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-xs text-[#718078]">Patient details unavailable.</p>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#F2F7F4] text-[#17251F] hover:bg-gray-200 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

