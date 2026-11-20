"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Building2,
  Users,
  Loader2,
  ArrowUp,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface SalesPerformanceWorkspaceProps {
  showNotification?: (msg: string, isError?: boolean) => void;
}

export const SalesPerformanceWorkspace: React.FC<SalesPerformanceWorkspaceProps> = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"converted" | "conversionRate" | "progress">("converted");

  useEffect(() => {
    const fetchPerf = async () => {
      setLoading(true);
      try {
        const res = await api.get<any>("/sales-team/performance");
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err: any) {
        console.error("Error fetching performance analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerf();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-[#64748B]">
        <Loader2 className="w-6 h-6 animate-spin text-[#087A50] mx-auto mb-2" />
        <span>Aggregating performance analytics from CRM pipeline...</span>
      </div>
    );
  }

  const leaderboard = [...(data?.leaderboard || [])].sort((a, b) => b[sortBy] - a[sortBy]);
  const metrics = data?.teamMetrics || {
    teamTotalLeads: 216,
    teamTotalConverted: 75,
    teamConversionRate: 35,
    averageResponseTime: "< 15 mins",
    followupCompletionRate: "89%",
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Team Conversion Rate</span>
          <div className="text-2xl font-bold text-[#111827] mt-1">{metrics.teamConversionRate}%</div>
          <p className="text-[11px] text-[#087A50] font-semibold mt-1">Lead to verified patient</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Total Converted Patients</span>
          <div className="text-2xl font-bold text-[#087A50] mt-1">
            {metrics.teamTotalConverted}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Across all clinic branches</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Avg First Response Time</span>
          <div className="text-2xl font-bold text-[#2563EB] mt-1">
            {metrics.averageResponseTime}
          </div>
          <p className="text-[11px] text-[#2563EB] font-semibold mt-1">Enquiry to outreach</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Follow-up Adherence</span>
          <div className="text-2xl font-bold text-[#9333EA] mt-1">
            {metrics.followupCompletionRate}
          </div>
          <p className="text-[11px] text-[#9333EA] font-semibold mt-1">Tasks completed on time</p>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
              <Award className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Sales Leaderboard</h3>
              <p className="text-[11px] text-[#64748B]">Ranked by verified patient conversions</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748B] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-gray-50 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="converted">Conversions (High to Low)</option>
              <option value="conversionRate">Win Rate (%)</option>
              <option value="progress">Quota Progress (%)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-[#E5EAF0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">RANK</th>
                <th className="py-3 px-4">REPRESENTATIVE</th>
                <th className="py-3 px-4">BRANCH</th>
                <th className="py-3 px-4 text-center">LEADS</th>
                <th className="py-3 px-4 text-center">CONVERTED</th>
                <th className="py-3 px-4 text-center">WIN RATE</th>
                <th className="py-3 px-4 text-center">QUOTA PROGRESS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]/70">
              {leaderboard.map((rep: any, idx: number) => {
                const rank = idx + 1;
                return (
                  <tr key={rep.memberId} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-4 text-center">
                      {rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center mx-auto text-xs shadow-2xs">
                          🥇
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-extrabold flex items-center justify-center mx-auto text-xs">
                          🥈
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 font-extrabold flex items-center justify-center mx-auto text-xs">
                          🥉
                        </span>
                      ) : (
                        <span className="font-bold text-[#64748B]">#{rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#111827] flex items-center gap-1.5">
                        <span>{rep.name}</span>
                        {rep.isTeamLead && <span className="text-amber-500">👑</span>}
                      </div>
                      <span className="text-[11px] text-[#64748B]">{rep.salesRole}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] font-medium">{rep.branchName}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#111827]">
                      {rep.totalLeads}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#087A50]">
                      {rep.converted}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF5FF] text-[#9333EA]">
                        {rep.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#111827]">
                      {rep.progress}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
