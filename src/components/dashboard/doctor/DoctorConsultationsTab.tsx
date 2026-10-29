"use client";

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  Search,
  Filter,
  Lock,
  FileEdit,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface ConsultationItem {
  _id: string;
  appointmentId: {
    _id: string;
    appointmentCode: string;
    appointmentDate: string;
    startTime: string;
    serviceName: string;
  };
  patientId: {
    _id: string;
    fullName: string;
    patientCode: string;
    age?: number;
  };
  diagnosis?: string;
  treatmentPlan?: string;
  isFinalized: boolean;
  finalizedAt?: string;
  createdAt: string;
}

interface DoctorConsultationsTabProps {
  onOpenConsultation: (appointmentId: string, patientId: string) => void;
}

export function DoctorConsultationsTab({ onOpenConsultation }: DoctorConsultationsTabProps) {
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFinalized, setFilterFinalized] = useState<"all" | "draft" | "finalized">("all");

  const fetchConsultations = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ data?: { consultations?: ConsultationItem[] }; consultations?: ConsultationItem[] }>(
        `/api/v1/doctor/consultations`
      );
      const list = (res as any).data?.consultations || (res as any).consultations || (Array.isArray((res as any).data) ? (res as any).data : []);
      setConsultations(list);
    } catch (err) {
      console.error("Failed to load consultations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const filtered = consultations.filter((c) => {
    if (filterFinalized === "draft" && c.isFinalized) return false;
    if (filterFinalized === "finalized" && !c.isFinalized) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const ptName = c.patientId?.fullName?.toLowerCase() || "";
      const diag = c.diagnosis?.toLowerCase() || "";
      const code = c.patientId?.patientCode?.toLowerCase() || "";
      return ptName.includes(q) || diag.includes(q) || code.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <Stethoscope className="w-5 h-5 text-[#154734]" /> Consultations & Clinical Records
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Review unsigned drafts, finalize clinical evaluations, and inspect legally locked consultation records.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 bg-[#F5F8F6] p-1 rounded-xl border border-[#E1E9E3] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterFinalized("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterFinalized === "all" ? "bg-white text-[#154734] shadow-sm" : "text-[#65746B]"
            }`}
          >
            All ({consultations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterFinalized("draft")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterFinalized === "draft" ? "bg-white text-[#154734] shadow-sm" : "text-[#65746B]"
            }`}
          >
            Drafts ({consultations.filter((c) => !c.isFinalized).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterFinalized("finalized")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filterFinalized === "finalized" ? "bg-white text-[#154734] shadow-sm" : "text-[#65746B]"
            }`}
          >
            Finalized ({consultations.filter((c) => c.isFinalized).length})
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter consultations by patient name, diagnosis, or patient ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E1E9E3] focus:border-[#154734] rounded-2xl text-xs text-[#17251E] placeholder:text-gray-400 shadow-sm"
        />
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-[#E1E9E3] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E1E9E3] text-[#65746B] text-xs font-semibold bg-[#FAFCFB]">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Diagnosis / Assessment</th>
                <th className="py-3 px-4">Treatment Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E9E3]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#65746B]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
                    Loading clinical encounters...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#65746B]">
                    No consultations found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((cons) => {
                  const patient = cons.patientId || {};
                  const appt = cons.appointmentId || {};

                  return (
                    <tr key={cons._id} className="hover:bg-[#F9FCFA] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#17251E]">
                        <p className="font-semibold">{new Date(cons.createdAt).toLocaleDateString()}</p>
                        <p className="text-[11px] text-gray-400">{appt.startTime || "Recorded"}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-xs text-[#17251E]">{patient.fullName || "Patient"}</p>
                        <p className="text-[11px] text-[#65746B]">#{patient.patientCode || "TG00"}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-[#17251E] max-w-[200px] truncate">
                        {cons.diagnosis || "Draft in progress"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#65746B] max-w-[220px] truncate">
                        {cons.treatmentPlan || "Pending review"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cons.isFinalized ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E7F3EA] text-[#287A4B]">
                            <Lock className="w-3 h-3" /> Finalized
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
                            <FileEdit className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenConsultation(appt._id || cons.appointmentId as any, patient._id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-colors ${
                            cons.isFinalized
                              ? "bg-white border border-[#E1E9E3] text-[#17251E] hover:bg-gray-50"
                              : "bg-[#154734] hover:bg-[#0E3828] text-white"
                          }`}
                        >
                          {cons.isFinalized ? "View Record" : "Resume Draft"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
