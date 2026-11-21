"use client";

import React, { useEffect, useState } from "react";
import { BarChart2, TrendingUp, Users, UserCheck, AlertOctagon } from "lucide-react";
import { api } from "@/lib/api/client";
import { CrmLead } from "./crmTypes";

interface CrmReportsTabProps {
  leads: CrmLead[];
  isLoading?: boolean;
}

export function CrmReportsTab({ leads, isLoading = false }: CrmReportsTabProps) {
  const [reportsData, setReportsData] = useState<{
    sourceBreakdown: any[];
    stageDistribution: any[];
    staffPerformance: any[];
    lossReasons: any[];
  } | null>(null);

  useEffect(() => {
    api
      .get<any>("/crm/reports")
      .then((res) => {
        if (res.data) setReportsData(res.data);
      })
      .catch(() => {});
  }, []);

  const total = leads.length;
  const newCount = leads.filter((l) => l.status === "new").length;
  const contactedCount = leads.filter(
    (l) => l.status === "contacted" || l.status === "contact_attempted" || l.status === "nurture"
  ).length;
  const qualifiedCount = leads.filter((l) => l.status === "qualified" || l.status === "interested").length;
  const convertedCount = leads.filter(
    (l) => l.status === "converted" || l.status === "consultation_booked" || l.status === "appointment"
  ).length;
  const lostCount = leads.filter((l) => l.status === "lost" || l.status === "closed" || l.status === "invalid").length;

  const funnelStages = [
    { name: "New Enquiries", count: newCount, color: "#3B82F6" },
    { name: "Contacted Leads", count: contactedCount, color: "#8B5CF6" },
    { name: "Clinically Qualified", count: qualifiedCount, color: "#14B8A6" },
    { name: "Converted Patients", count: convertedCount, color: "#087A50" },
    { name: "Lost / Dropped", count: lostCount, color: "#EF4444" },
  ];

  return (
    <div className="space-y-5">
      {/* Funnel Velocity Card */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5EAF0]">
          <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">Conversion Funnel Analysis</h3>
            <p className="text-xs text-[#64748B]">Patient progression from enquiry to active clinical treatment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnelStages.map((st, i) => {
            const pct = total > 0 ? Math.round((st.count / total) * 100) : 0;
            return (
              <div key={i} className="p-4 rounded-xl border border-[#E5EAF0] bg-[#F7F9FC]">
                <span className="text-[11px] font-bold text-[#64748B] uppercase block">
                  {st.name}
                </span>
                <span className="text-2xl font-bold text-[#111827] mt-1 block">{st.count}</span>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: st.color }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[#111827]">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff Performance & Loss Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales Staff Performance */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5EAF0]">
            <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Representative Performance</h3>
              <p className="text-xs text-[#64748B]">Assigned caseload and conversion success</p>
            </div>
          </div>

          <div className="border border-[#E5EAF0] rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#64748B] text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Staff Member</th>
                  <th className="py-2.5 px-3">Assigned</th>
                  <th className="py-2.5 px-3">Converted</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {(!reportsData?.staffPerformance || reportsData.staffPerformance.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#64748B]">
                      Loading staff metrics...
                    </td>
                  </tr>
                ) : (
                  reportsData.staffPerformance.map((sp, i) => (
                    <tr key={i} className="hover:bg-[#F7F9FC]">
                      <td className="py-2.5 px-3 font-bold text-[#111827]">
                        {sp.staff?.name || "Staff Member"}
                      </td>
                      <td className="py-2.5 px-3">{sp.totalAssigned}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#087A50]">{sp.converted}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#087A50]">
                        {sp.conversionRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lost Reasons Breakdown */}
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5EAF0]">
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Lost Reason Distribution</h3>
              <p className="text-xs text-[#64748B]">Identified friction points in patient intake</p>
            </div>
          </div>

          <div className="space-y-3">
            {(!reportsData?.lossReasons || reportsData.lossReasons.length === 0) ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No lost reasons recorded in live database.
              </div>
            ) : (
              reportsData.lossReasons.map((lr, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2.5 bg-[#F7F9FC] rounded-xl border border-[#E5EAF0]">
                  <span className="font-semibold text-[#111827]">{lr._id || "Unspecified"}</span>
                  <span className="font-bold text-red-600">{lr.count} leads</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
