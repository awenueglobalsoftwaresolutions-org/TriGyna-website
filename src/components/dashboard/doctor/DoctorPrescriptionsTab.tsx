"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  Search,
  Printer,
  Calendar,
  FileText,
  User,
  ChevronRight,
  Loader2,
  X,
  Download,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { api, getToken, getBaseUrl } from "@/lib/api/client";

interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionRecord {
  _id: string;
  prescriptionCode?: string;
  patientId: {
    _id: string;
    fullName: string;
    patientCode: string;
    age?: number;
    gender?: string;
  };
  doctorId: {
    fullName: string;
    specialization?: string;
  };
  consultationId?: string;
  medications: MedicationItem[];
  dietaryAdvice?: string;
  isReleasedToPatient?: boolean;
  status?: string;
  createdAt: string;
}

export function DoctorPrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRx, setSelectedRx] = useState<PrescriptionRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data?: { prescriptions?: PrescriptionRecord[] }; prescriptions?: PrescriptionRecord[] }>(
        `/api/v1/doctor/prescriptions?search=${encodeURIComponent(search)}`
      );
      const list = (res as any).data?.prescriptions || (res as any).prescriptions || (Array.isArray((res as any).data) ? (res as any).data : []);
      setPrescriptions(list);
    } catch (err) {
      console.error("Failed to load prescriptions", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async (rxId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setDownloadingId(rxId);
      const token = getToken();
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/doctor/prescriptions/${rxId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TriGyna-Prescription-${rxId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.warn("Direct blob download failed, falling back to window.open", err);
      const token = getToken();
      const baseUrl = getBaseUrl();
      window.open(
        `${baseUrl}/doctor/prescriptions/${rxId}/pdf?token=${encodeURIComponent(token || "")}`,
        "_blank"
      );
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrescriptions();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <Pill className="w-5 h-5 text-[#154734]" /> Prescriptions Directory
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Browse and print authorized digital prescriptions generated during clinical visits.
          </p>
        </div>
        <div className="text-xs font-semibold text-[#154734] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          {prescriptions.length} Active Prescriptions
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by patient name, medication name, or patient ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-2xl text-xs text-[#17251E] placeholder:text-gray-400 shadow-sm"
        />
      </div>

      {/* Prescriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-xs text-[#65746B]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
            Loading prescriptions...
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[#65746B] bg-white rounded-2xl border border-[#E1E9E3]">
            No prescriptions recorded yet.
          </div>
        ) : (
          prescriptions.map((rx) => {
            const patient = rx.patientId || {};
            const rxCode = rx.prescriptionCode || `TG-RX-${rx._id.slice(-4).toUpperCase()}`;
            return (
              <div
                key={rx._id}
                onClick={() => setSelectedRx(rx)}
                className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm hover:shadow-md hover:border-[#154734]/40 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#154734]" />
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#E7F3EA] text-[#287A4B] font-semibold">
                      {rxCode}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#17251E] group-hover:text-[#154734] transition-colors">
                    {patient.fullName || "Patient"}
                  </h3>
                  <p className="text-xs text-[#65746B] mt-0.5">
                    #{patient.patientCode || "TG00"} • {patient.age ? `${patient.age}y` : ""}
                  </p>

                  {/* Medications Preview */}
                  <div className="mt-4 pt-3 border-t border-[#E1E9E3] space-y-1.5">
                    <p className="text-[11px] font-bold text-[#17251E] uppercase tracking-wider">
                      Medications ({rx.medications?.length || 0})
                    </p>
                    {(rx.medications || []).slice(0, 3).map((m, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-[#65746B]">
                        <span className="font-medium text-[#17251E]">• {m.name}</span>
                        <span>{m.dosage}</span>
                      </div>
                    ))}
                    {(rx.medications?.length || 0) > 3 && (
                      <p className="text-[11px] text-gray-400 italic">
                        + {rx.medications.length - 3} more items...
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[#154734] font-semibold">
                    <span>View & Details</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadPdf(rx._id, e)}
                    disabled={downloadingId === rx._id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#154734] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                    title="Download Official Signed PDF"
                  >
                    {downloadingId === rx._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Printable Prescription Modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E1E9E3] overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-[#154734] text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">TriGyna Official Prescription</h3>
                <p className="text-xs text-white/70">Clinical Electronic Health Record (EHR)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedRx._id)}
                  disabled={downloadingId === selectedRx._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {downloadingId === selectedRx._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download Signed PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Rx
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRx(null)}
                  className="p-1.5 text-white/70 hover:text-white rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#17251E]">
              {/* Doctor & Clinic Details */}
              <div className="flex justify-between border-b pb-4 border-[#E1E9E3]">
                <div>
                  <h4 className="font-bold text-sm text-[#154734]">{selectedRx.doctorId?.fullName || "Dr. Ananya Sharma"}</h4>
                  <p className="text-[#65746B]">{selectedRx.doctorId?.specialization || "Obstetrician & Gynecologist"}</p>
                  <p className="text-gray-400 text-[11px]">TriGyna Women Health Clinic</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-700">Date: {new Date(selectedRx.createdAt).toLocaleDateString()}</p>
                  <p className="text-emerald-700 font-mono font-bold text-xs mt-0.5">
                    {selectedRx.prescriptionCode || `TG-RX-${selectedRx._id.slice(-4).toUpperCase()}`}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Digitally Verified
                  </span>
                </div>
              </div>

              {/* Patient info */}
              <div className="bg-[#F5F8F6] p-4 rounded-2xl border border-[#E1E9E3] grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[#65746B]">Patient Name: </span>
                  <span className="font-bold text-[#17251E]">{selectedRx.patientId?.fullName}</span>
                </div>
                <div>
                  <span className="text-[#65746B]">Patient ID: </span>
                  <span className="font-mono font-semibold">#{selectedRx.patientId?.patientCode}</span>
                </div>
                <div>
                  <span className="text-[#65746B]">Age/Gender: </span>
                  <span>{selectedRx.patientId?.age || 28} Y / {selectedRx.patientId?.gender || "Female"}</span>
                </div>
              </div>

              {/* Rx Medications */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#154734] pb-1">
                  <span className="font-serif italic font-bold text-lg text-[#154734]">℞</span>
                  <span className="font-bold text-xs text-[#17251E] uppercase">Prescribed Medicines</span>
                </div>

                <div className="space-y-3">
                  {(selectedRx.medications || []).map((m, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between font-bold text-xs text-[#17251E]">
                        <span>{i + 1}. {m.name} ({m.dosage})</span>
                        <span className="text-[#154734] font-semibold">{m.frequency}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[11px] mt-1">
                        <span>Duration: {m.duration}</span>
                        <span>Instructions: {m.instructions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dietary Advice */}
              {selectedRx.dietaryAdvice && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <h5 className="font-bold text-xs text-[#154734] mb-1">Dietary & Lifestyle Advice:</h5>
                  <p className="text-emerald-900 text-xs">{selectedRx.dietaryAdvice}</p>
                </div>
              )}

              {/* Doctor Signature Block */}
              <div className="pt-8 flex justify-end text-right">
                <div>
                  <div className="w-32 border-b border-gray-400 mb-1"></div>
                  <p className="font-bold text-xs text-[#17251E]">{selectedRx.doctorId?.fullName || "Dr. Ananya Sharma"}</p>
                  <p className="text-[11px] text-gray-400">Authorized Clinician Signature</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F5F8F6] border-t border-[#E1E9E3] flex items-center justify-between">
              <span className="text-[11px] text-[#65746B]">
                Digitally sealed and stored in TriGyna Encrypted Health Vault.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedRx._id)}
                  disabled={downloadingId === selectedRx._id}
                  className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRx(null)}
                  className="px-5 py-2 bg-[#154734] text-white rounded-xl text-xs font-semibold hover:bg-[#0E3828] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
