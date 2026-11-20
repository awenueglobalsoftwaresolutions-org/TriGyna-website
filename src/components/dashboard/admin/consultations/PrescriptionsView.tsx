"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Pill,
  Search,
  Loader2,
  FileDown,
  CheckCircle2,
  User,
  Calendar,
  Eye,
  X,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface PrescriptionItem {
  _id: string;
  prescriptionCode: string;
  patientId?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
  };
  doctorId?: {
    _id: string;
    userId?: {
      name: string;
    };
    qualifications?: string;
  };
  consultationId?: {
    _id: string;
    consultationCode?: string;
    consultationDate?: string;
    diagnosis?: string;
  };
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  dietaryAdvice?: string;
  specialInstructions?: string;
  isReleasedToPatient: boolean;
  status?: string;
  createdAt: string;
}

interface PrescriptionsViewProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function PrescriptionsView({ showNotification }: PrescriptionsViewProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRx, setSelectedRx] = useState<PrescriptionItem | null>(null);

  const loadPrescriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());

      const res = await api.get<{ prescriptions: PrescriptionItem[]; total: number }>(
        `/clinical/prescriptions?${params.toString()}`
      );
      if (res.data?.prescriptions) {
        setPrescriptions(res.data.prescriptions);
      }
    } catch {
      showNotification("Failed to load digital prescriptions", true);
    } finally {
      setIsLoading(false);
    }
  }, [search, showNotification]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleDownloadPdf = (rxId: string) => {
    const token = getToken();
    const url = `${getBaseUrl()}/clinical/prescriptions/${rxId}/pdf?token=${token || ""}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search prescriptions by Rx code, medicine, or instructions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5EAF0] rounded-xl text-[#111827] focus:ring-2 focus:ring-[#087A50] focus:outline-none"
          />
        </div>

        <span className="text-xs text-[#64748B] font-mono shrink-0">
          {prescriptions.length} verified prescriptions
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-[#64748B] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
            <span className="text-xs">Loading digital prescriptions...</span>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center text-[#64748B] text-xs">
            No digital prescriptions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5EAF0] bg-[#F8FAFC] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Rx Code &amp; Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Consultation Code</th>
                  <th className="py-3 px-4">Medications</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {prescriptions.map((rx) => (
                  <tr key={rx._id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#087A50] block">
                        {rx.prescriptionCode || "TG-RX-1100"}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono block mt-0.5">
                        {new Date(rx.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#111827] block truncate max-w-[150px]">
                        {rx.patientId?.fullName || "Patient"}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono block">
                        {rx.patientId?.patientCode}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#111827] block truncate max-w-[150px]">
                        {rx.doctorId?.userId?.name || "Dr. TriGyna"}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#087A50] font-semibold">
                      {rx.consultationId?.consultationCode || "Encounter"}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold font-mono">
                        {rx.medications?.length || 0} drugs
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Verified
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRx(rx)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(rx._id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#E9F8F0] hover:bg-[#D5E5DA] text-[#087A50] cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prescription View Modal */}
      {selectedRx && (
        <ModalPortal isOpen={Boolean(selectedRx)} onClose={() => setSelectedRx(null)}>
          <div className="bg-white border border-[#E5EAF0] rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col overflow-hidden font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAF0] bg-[#F8FAFC] shrink-0">
              <div>
                <span className="font-mono text-xs text-[#087A50] font-bold block">{selectedRx.prescriptionCode}</span>
                <h3 className="font-bold text-base text-[#111827] mt-0.5">
                  Prescription for {selectedRx.patientId?.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <span className="font-bold text-gray-700 block">Medications List</span>
              <div className="space-y-2">
                {selectedRx.medications?.map((m, idx) => (
                  <div key={idx} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111827]">{m.name}</span>
                      <span className="font-mono text-[#087A50] font-semibold">{m.dosage}</span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      {m.frequency} • {m.duration}
                    </p>
                    {m.instructions && (
                      <p className="text-[10px] text-gray-500 italic">&ldquo;{m.instructions}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>

              {selectedRx.dietaryAdvice && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-0.5">Dietary Guidance</span>
                  <p className="text-amber-800">{selectedRx.dietaryAdvice}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#E5EAF0] bg-[#F8FAFC] flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadPdf(selectedRx._id)}
                className="px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Authenticated PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 border border-[#E5EAF0] bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

