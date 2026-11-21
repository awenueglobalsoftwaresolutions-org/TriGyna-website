"use client";

import React, { useState } from "react";
import {
  Tag,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingDown,
  Layers,
  Gift,
} from "lucide-react";
import { ServiceItem, PackageItem } from "./types";

interface CataloguePricePlansTabProps {
  services: ServiceItem[];
  packages: PackageItem[];
}

export function CataloguePricePlansTab({
  services,
  packages,
}: CataloguePricePlansTabProps) {
  const [activePlanType, setActivePlanType] = useState<"services" | "packages">("services");

  return (
    <div className="space-y-5">
      {/* Immutability Guarantee Banner (Requirement #1) */}
      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#087A50] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
            <span>Healthcare Financial Ledger &amp; Pricing Immutability Guarantee</span>
            <span className="text-[10px] uppercase tracking-wider bg-emerald-200/60 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
              Legal Compliance
            </span>
          </h4>
          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
            Per TriGyna healthcare accounting protocols, modifying service fees or package rates in this catalogue applies <strong>strictly to new purchases and future bookings</strong>. Previously issued invoices, receipts, paid orders, and active patient package entitlements remain <strong>permanently locked</strong> with their exact historical price snapshot.
          </p>
        </div>
      </div>

      {/* Switcher & Stats */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E5EAF0]">
          <button
            onClick={() => setActivePlanType("services")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activePlanType === "services"
                ? "bg-[#087A50] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Service Consultation Fees ({services.length})
          </button>
          <button
            onClick={() => setActivePlanType("packages")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activePlanType === "packages"
                ? "bg-[#087A50] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            Wellness Packages Pricing ({packages.length})
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {activePlanType === "services" ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[#64748B] font-semibold border-b border-[#E5EAF0]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Base Fee (INR)</th>
                  <th className="py-3 px-4">Tax / GST</th>
                  <th className="py-3 px-4">Delivery Mode</th>
                  <th className="py-3 px-4">Snapshot Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {services.map((srv) => (
                  <tr key={srv.code} className="hover:bg-[#F8FAF9]">
                    <td className="py-3 px-4 font-mono font-bold text-[#087A50]">
                      {srv.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#111827]">
                      {srv.name}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">{srv.category}</td>
                    <td className="py-3 px-4 text-[#64748B]">{srv.durationMinutes} mins</td>
                    <td className="py-3 px-4 font-bold text-[#087A50] text-sm">
                      ₹{srv.baseFee.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {srv.taxRate ? `${srv.taxRate}%` : "0% (Exempt)"}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] capitalize">
                      {srv.consultationType.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Lock className="w-3 h-3 text-[#087A50]" />
                        <span>Frozen on Invoice</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-[#64748B] font-semibold border-b border-[#E5EAF0]">
                <tr>
                  <th className="py-3 px-4">Package Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Sessions</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Package Price</th>
                  <th className="py-3 px-4">Per Session Cost</th>
                  <th className="py-3 px-4">Savings vs Single</th>
                  <th className="py-3 px-4">Immutability Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {packages.map((pkg) => {
                  const price = pkg.pricePaise / 100;
                  const perSession = Math.round(price / (pkg.totalSessions || 1));
                  const original = pkg.originalPricePaise
                    ? pkg.originalPricePaise / 100
                    : price * 1.35;
                  const savings =
                    original > price ? Math.round(((original - price) / original) * 100) : 0;

                  return (
                    <tr key={pkg.slug} className="hover:bg-[#F8FAF9]">
                      <td className="py-3 px-4 font-semibold text-[#111827]">
                        {pkg.name}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {pkg.category || "Wellness Programmes"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">
                        {pkg.totalSessions}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">{pkg.validityDays} days</td>
                      <td className="py-3 px-4 font-bold text-[#087A50] text-sm">
                        ₹{price.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#334155]">
                        ₹{perSession.toLocaleString("en-IN")}/session
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                          Save {savings}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3 text-[#087A50]" />
                          <span>Locked on Purchase</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

