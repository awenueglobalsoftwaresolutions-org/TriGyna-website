"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Users,
  Calendar,
  CheckCircle2,
  ArrowDown,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface PerformanceWorkspaceProps {
  overviewData?: any;
}

export function PerformanceWorkspace({ overviewData }: PerformanceWorkspaceProps) {
  const [selectedFunnelPeriod, setSelectedFunnelPeriod] = useState("This Month (Oct 2026)");

  const kpis = overviewData?.kpis || {
    totalLeads: { value: 108 },
    bookingsGenerated: { value: 20 },
    adSpendRecorded: { formatted: "₹12,300", value: 12300 },
    attributedRevenue: { formatted: "₹79,500", value: 79500 },
  };

  const funnelStages = [
    { name: "Impressions", count: 104100, dropOff: null, conversion: "100%" },
    { name: "Ad Clicks", count: 3010, dropOff: "97.1% drop-off", conversion: "2.89% CTR" },
    { name: "Landing Page Visits", count: 2840, dropOff: "5.6% bounce", conversion: "94.3% load" },
    { name: "Marketing Leads", count: 108, dropOff: "96.2% non-submit", conversion: "3.80% CVR" },
    { name: "Qualified Leads", count: 81, dropOff: "25% unqualified", conversion: "75.0% qual" },
    { name: "Bookings Generated", count: 20, dropOff: "75.3% unbooked", conversion: "18.5% book" },
    { name: "Completed Consultations", count: 18, dropOff: "10% reschedule", conversion: "90.0% show" },
    { name: "Verified Payments", count: 16, dropOff: "11% pending", conversion: "88.9% paid" },
  ];

  return (
    <div className="space-y-6">
      {/* Financial ROI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Return on Ad Spend (ROAS)</span>
          <p className="text-2xl font-bold font-sans text-[#087A50] mt-1">6.46x</p>
          <p className="text-[11px] text-[#64748B] mt-1">₹6.46 revenue per ₹1.00 spent</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Cost Per Lead (CPL)</span>
          <p className="text-2xl font-bold font-sans text-[#111827] mt-1">₹113.88</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">18% lower than industry avg</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Cost Per Booking (CPB)</span>
          <p className="text-2xl font-bold font-sans text-[#111827] mt-1">₹615.00</p>
          <p className="text-[11px] text-[#64748B] mt-1">Per confirmed clinical consultation</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5EAF0] shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Net Revenue Contribution</span>
          <p className="text-2xl font-bold font-sans text-[#087A50] mt-1">₹67,200</p>
          <p className="text-[11px] text-[#64748B] mt-1">After deducting ₹12,300 ad spend</p>
        </div>
      </div>

      {/* Healthcare Marketing Funnel */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5EAF0] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF0]/60">
          <div>
            <h3 className="text-base font-bold text-[#111827]">Full-Funnel Healthcare Marketing Lifecycle</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Audited conversion rates from ad impression to verified patient consultation and payment.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-[#F8FAFC] border border-[#E5EAF0] rounded-xl text-[#111827]">
            {selectedFunnelPeriod}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {funnelStages.map((stage, idx) => {
            const widthPct = Math.max(12, 100 - idx * 11);
            return (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[#111827]">{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#111827]">{stage.count.toLocaleString()}</span>
                    <span className="text-[11px] font-semibold text-[#087A50] min-w-[65px] text-right">
                      {stage.conversion}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#087A50] rounded-full transition-all duration-500"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
