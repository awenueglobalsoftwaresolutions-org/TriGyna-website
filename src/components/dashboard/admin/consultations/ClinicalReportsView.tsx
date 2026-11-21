"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Loader2,
  FileDown,
  Stethoscope,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";

interface ClinicalAnalyticsData {
  consultationsByMonth: Array<{ _id: string; total: number; finalized: number }>;
  topDiagnoses: Array<{ _id: string; count: number }>;
  doctorPerformance: Array<{
    doctorId: string;
    doctorName: string;
    qualifications: string;
    total: number;
    finalized: number;
    completionRate: number;
  }>;
  treatmentPlanBreakdown: Array<{ _id: string; count: number }>;
  followUpAdherence: Array<{ _id: string; count: number }>;
}

interface ClinicalReportsViewProps {
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function ClinicalReportsView({ showNotification }: ClinicalReportsViewProps) {
  const [data, setData] = useState<ClinicalAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<ClinicalAnalyticsData>("/clinical/reports/analytics");
      if (res.data) {
        setData(res.data);
      }
    } catch {
      showNotification("Failed to load clinical analytics", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportCsv = () => {
    const token = getToken();
    const url = `${getBaseUrl()}/clinical/consultations/export?token=${token || ""}`;
    window.open(url, "_blank");
    showNotification("Downloading clinical encounter dataset (CSV)...");
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top action row */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-[#111827] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#087A50]" />
            <span>Clinical Intelligence &amp; EHR Analytics</span>
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Aggregated institutional clinical encounter distributions, diagnosis trends, and doctor completion benchmarks.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 border border-[#E5EAF0] hover:bg-[#F8FAFC] text-[#111827] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs transition"
        >
          <FileDown className="w-4 h-4 text-[#087A50]" />
          <span>Export Encounters CSV</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-[#64748B] flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-[#E5EAF0]">
          <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
          <span className="text-xs">Computing clinical reports from live database...</span>
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E5EAF0]">
          No clinical report data available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Diagnoses */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#111827] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#087A50]" />
                <span>Primary Diagnoses Distribution</span>
              </span>
              <span className="text-xs text-[#64748B] font-mono">Top Conditions</span>
            </div>

            <div className="space-y-3 pt-2">
              {data.topDiagnoses.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#111827] truncate max-w-[240px]">
                      {d._id}
                    </span>
                    <span className="font-mono text-[#087A50] font-bold">{d.count} encounters</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#087A50] rounded-full"
                      style={{
                        width: `${Math.min(100, (d.count / (data.topDiagnoses[0]?.count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Practitioner Performance */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#111827] flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#087A50]" />
                <span>Practitioner Clinical Completion</span>
              </span>
              <span className="text-xs text-[#64748B] font-mono">EHR Finalization</span>
            </div>

            <div className="space-y-3 pt-2">
              {data.doctorPerformance.map((doc, idx) => (
                <div key={idx} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-[#111827] block truncate">
                      {doc.doctorName}
                    </span>
                    <span className="text-[10px] text-[#64748B] block truncate">
                      {doc.qualifications}
                    </span>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <span className="font-mono text-xs font-bold text-[#087A50] block">
                      {doc.completionRate}%
                    </span>
                    <span className="text-[10px] text-[#64748B] block font-mono">
                      {doc.finalized} / {doc.total} locked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Consultations Volume */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#111827] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#087A50]" />
                <span>Encounter Volume by Month</span>
              </span>
            </div>

            <div className="space-y-2 pt-2">
              {data.consultationsByMonth.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
                  <span className="font-mono font-bold text-xs text-[#111827]">{m._id}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#64748B] font-mono">Total: <span className="font-bold text-[#111827]">{m.total}</span></span>
                    <span className="text-xs text-[#087A50] font-mono">Finalized: <span className="font-bold">{m.finalized}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Plans & Follow-ups Breakdown */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#111827] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#087A50]" />
                <span>Care Plans &amp; Follow-up Adherence</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[11px] font-bold text-[#087A50] block">Care Plans</span>
                <span className="text-2xl font-bold font-mono text-[#087A50] mt-1 block">
                  {data.treatmentPlanBreakdown.reduce((acc, curr) => acc + curr.count, 0)}
                </span>
                <span className="text-[10px] text-[#64748B] mt-0.5 block">Total Created</span>
              </div>

              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl">
                <span className="text-[11px] font-bold text-purple-700 block">Follow-ups</span>
                <span className="text-2xl font-bold font-mono text-purple-800 mt-1 block">
                  {data.followUpAdherence.reduce((acc, curr) => acc + curr.count, 0)}
                </span>
                <span className="text-[10px] text-[#64748B] mt-0.5 block">Total Scheduled</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

