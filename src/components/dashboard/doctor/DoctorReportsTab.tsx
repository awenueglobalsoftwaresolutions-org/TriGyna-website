"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Activity,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface ReportsData {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  inProgressConsultations: number;
  scheduledAppointments: number;
  totalPrescriptions: number;
  totalFollowups: number;
  completionRate: number;
  followUpAdherence: number;
  serviceBreakdown?: Array<{ _id: string; count: number }>;
}

interface RawReportsData {
  metrics?: {
    totalAppointments?: number;
    completedAppointments?: number;
    cancelledAppointments?: number;
    totalConsultations?: number;
    inProgressConsultations?: number;
    totalPrescriptions?: number;
    totalFollowUps?: number;
    totalFollowups?: number;
    completionRate?: string | number;
    followUpAdherence?: string | number;
  };
  serviceBreakdown?: Array<{ _id: string; count: number }>;
}

export function DoctorReportsTab() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .get<{ data?: RawReportsData; stats?: RawReportsData }>(`/api/v1/doctor/reports`)
      .then((res) => {
        if (!isMounted) return;
        const payload = res?.data as (RawReportsData & { [key: string]: unknown }) | undefined;
        const raw = (payload?.metrics || payload || {}) as {
          totalAppointments?: number;
          completedAppointments?: number;
          cancelledAppointments?: number;
          totalConsultations?: number;
          inProgressConsultations?: number;
          totalPrescriptions?: number;
          totalFollowUps?: number;
          totalFollowups?: number;
          completionRate?: string | number;
          followUpAdherence?: string | number;
        };
        const parsedRate = typeof raw.completionRate === "string" ? parseInt(raw.completionRate, 10) : Number(raw.completionRate || 0);
        const parsedAdherence = typeof raw.followUpAdherence === "string" ? parseInt(raw.followUpAdherence, 10) : Number(raw.followUpAdherence || 0);
        const total = Number(raw.totalAppointments || 0);
        const completed = Number(raw.completedAppointments || 0);
        const inProgress = Number(raw.totalConsultations || raw.inProgressConsultations || 0);
        const cancelled = Number(raw.cancelledAppointments || 0);
        const scheduled = Math.max(0, total - completed - cancelled);

        setData({
          totalAppointments: total,
          completedAppointments: completed,
          cancelledAppointments: cancelled,
          inProgressConsultations: inProgress,
          scheduledAppointments: scheduled,
          totalPrescriptions: Number(raw.totalPrescriptions || 0),
          totalFollowups: Number(raw.totalFollowUps || raw.totalFollowups || 0),
          completionRate: isNaN(parsedRate) ? 0 : parsedRate,
          followUpAdherence: isNaN(parsedAdherence) ? 0 : parsedAdherence,
          serviceBreakdown: payload?.serviceBreakdown || [],
        });
      })
      .catch((err) => {
        console.error("Failed to load doctor reports", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17251E] flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-[#154734]" /> Personal Clinical Activity & Workload
          </h2>
          <p className="text-xs text-[#65746B] mt-1">
            Audited clinical volume analytics, consultation completion velocity, and continuity tracking.
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          Scoping: Authorized personal practice
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-xs text-[#65746B]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#154734] mb-2" />
          Calculating clinical analytics from database...
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#65746B]">Clinical Encounters</span>
                <div className="w-9 h-9 rounded-xl bg-[#E7F3EA] text-[#154734] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-[#17251E]">{data?.totalAppointments ?? 0}</p>
              <p className="text-[11px] text-[#287A4B] font-semibold mt-1">Total Assigned Visits</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#65746B]">Documentation Completed</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-[#17251E]">{data?.completedAppointments ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Completion Rate: <span className="font-bold text-[#154734]">{data?.completionRate ?? 0}%</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#65746B]">Prescriptions Issued</span>
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-[#17251E]">{data?.totalPrescriptions ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-1">Legally Authorized Rx</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E1E9E3] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#65746B]">Follow-up Continuity</span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-[#17251E]">{data?.totalFollowups ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-1">Scheduled Review Points</p>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-[#17251E] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#154734]" /> Appointment Resolution Distribution
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Completed & Finalized</span>
                    <span className="text-[#287A4B]">{data?.completedAppointments ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#287A4B] h-full rounded-full transition-all duration-300"
                      style={{ width: `${data?.completionRate ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>In-Consultation & Active</span>
                    <span className="text-blue-600">{data?.inProgressConsultations ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          data?.totalAppointments
                            ? Math.min(100, Math.round(((data?.inProgressConsultations ?? 0) / data.totalAppointments) * 100))
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Scheduled / Checked In</span>
                    <span className="text-amber-600">{data?.scheduledAppointments ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          data?.totalAppointments
                            ? Math.min(100, Math.round(((data?.scheduledAppointments ?? 0) / data.totalAppointments) * 100))
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E1E9E3] shadow-sm space-y-3 text-xs text-[#17251E]">
              <h3 className="font-bold text-sm text-[#17251E] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#154734]" /> Compliance & Clinical Governance
              </h3>
              <p className="text-[#65746B]">
                Every consultation completed by you is cryptographically associated with your unique medical provider credentials and timestamped.
              </p>
              <div className="p-3 bg-[#F5F8F6] rounded-xl border border-[#E1E9E3] space-y-1.5">
                <p className="font-semibold text-emerald-900">✔ Electronic Medical Records (EMR) Standard</p>
                <p className="font-semibold text-emerald-900">✔ Zero-Downtime Audit Integrity</p>
                <p className="font-semibold text-emerald-900">✔ Scoped Access: Protected Patient Records Only</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
