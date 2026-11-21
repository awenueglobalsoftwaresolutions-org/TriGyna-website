"use client";

import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Edit,
  Trash2,
  Tag,
  ShieldCheck,
  Search,
  Loader2,
  Sparkles,
} from "lucide-react";
import { PackageItem } from "./types";
import { api } from "@/lib/api/client";

interface CataloguePackagesTabProps {
  packages: PackageItem[];
  isLoading: boolean;
  onAddNewPackage: () => void;
  onEditPackage: (pkg: PackageItem) => void;
  onDeletePackage: (pkg: PackageItem) => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

interface EntitlementRecord {
  _id: string;
  patientId?: { fullName: string; patientCode: string; phone?: string };
  packageName: string;
  totalSessions: number;
  availableSessions: number;
  reservedSessions: number;
  consumedSessions: number;
  status: string;
  expiresAt: string;
  orderId?: string;
  createdAt: string;
}

export function CataloguePackagesTab({
  packages,
  isLoading,
  onAddNewPackage,
  onEditPackage,
  onDeletePackage,
  showNotification,
}: CataloguePackagesTabProps) {
  const [activeSubView, setActiveSubView] = useState<"catalog" | "entitlements">("catalog");
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);
  const [isLoadingEntitlements, setIsLoadingEntitlements] = useState(false);
  const [search, setSearch] = useState("");

  const loadEntitlements = async () => {
    try {
      setIsLoadingEntitlements(true);
      const res = await api.get<{ entitlements: EntitlementRecord[] }>("/packages/entitlements/my");
      // If none, load from billing orders or empty array
      if (res.data?.entitlements) {
        setEntitlements(res.data.entitlements);
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoadingEntitlements(false);
    }
  };

  useEffect(() => {
    if (activeSubView === "entitlements") {
      loadEntitlements();
    }
  }, [activeSubView]);

  const filteredPackages = packages.filter(
    (p) =>
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Top Bar with Switcher & Action */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E5EAF0]">
            <button
              onClick={() => setActiveSubView("catalog")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubView === "catalog"
                  ? "bg-[#087A50] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              Wellness Packages ({packages.length})
            </button>
            <button
              onClick={() => setActiveSubView("entitlements")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubView === "entitlements"
                  ? "bg-[#087A50] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              Patient Subscriptions &amp; Credits
            </button>
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            />
          </div>
        </div>

        <button
          onClick={onAddNewPackage}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#087A50] hover:bg-[#066341] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Build New Package</span>
        </button>
      </div>

      {/* Sub-view 1: Package Cards */}
      {activeSubView === "catalog" ? (
        isLoading ? (
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-16 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#087A50]" />
            <span>Loading wellness packages...</span>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-12 text-center text-xs text-[#64748B]">
            No packages found. Click &quot;Build New Package&quot; to configure one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPackages.map((pkg) => {
              const priceNum = pkg.pricePaise ? pkg.pricePaise / 100 : 0;
              const originalNum = pkg.originalPricePaise
                ? pkg.originalPricePaise / 100
                : priceNum * 1.35;
              const savingsPercent =
                originalNum > priceNum
                  ? Math.round(((originalNum - priceNum) / originalNum) * 100)
                  : 0;

              return (
                <div
                  key={pkg._id || pkg.slug}
                  className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Sessions Badge & Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                          {pkg.totalSessions} Sessions
                        </span>
                        {savingsPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Save {savingsPercent}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditPackage(pkg)}
                          className="p-1 rounded-md text-gray-400 hover:text-[#087A50] hover:bg-gray-100 cursor-pointer"
                          title="Edit Package"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeletePackage(pkg)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-gray-100 cursor-pointer"
                          title="Delete Package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Category */}
                    <h3 className="text-sm font-bold text-[#111827] mt-3 line-clamp-2">
                      {pkg.name}
                    </h3>
                    <p className="text-[11px] text-[#64748B] mt-1 font-medium">
                      {pkg.category || "Wellness Programmes"}
                    </p>

                    <p className="text-xs text-[#475569] mt-2 line-clamp-2 leading-relaxed">
                      {pkg.description}
                    </p>

                    {/* Features checklist */}
                    {pkg.features && pkg.features.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-[#E5EAF0] space-y-1.5">
                        {pkg.features.slice(0, 3).map((feat, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-1.5 text-[11px] text-[#475569]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#087A50] shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing and Validity Footer */}
                  <div className="mt-4 pt-3 border-t border-[#E5EAF0] flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-[#087A50] font-sans">
                          ₹{priceNum.toLocaleString("en-IN")}
                        </span>
                        {originalNum > priceNum && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{Math.round(originalNum).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748B] block mt-0.5">
                        Valid for {pkg.validityDays} days ({pkg.sessionDurationMinutes} mins/slot)
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        pkg.isPublished
                          ? "bg-[#E9F8F0] text-[#087A50] border border-[#D1F2E0]"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {pkg.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Sub-view 2: Entitlements & Patient Session Credits Table */
        <div className="bg-white rounded-2xl border border-[#E5EAF0] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#111827]">
                Active Patient Package Entitlements
              </h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Session credits are automatically locked upon booking and consumed only upon completed consultation.
              </p>
            </div>
            <button
              onClick={loadEntitlements}
              className="text-xs text-[#087A50] font-semibold hover:underline cursor-pointer"
            >
              Refresh Subscriptions
            </button>
          </div>

          {isLoadingEntitlements ? (
            <div className="p-12 text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#087A50]" />
              <span>Loading patient entitlements...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] text-[#64748B] font-semibold border-b border-[#E5EAF0]">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4 text-center">Total Sessions</th>
                    <th className="py-3 px-4 text-center">Available</th>
                    <th className="py-3 px-4 text-center">Reserved</th>
                    <th className="py-3 px-4 text-center">Consumed</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {entitlements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#64748B] text-xs">
                        No active package entitlements in current filter. Subscriptions populate automatically on order checkout.
                      </td>
                    </tr>
                  ) : (
                    entitlements.map((ent) => (
                      <tr key={ent._id} className="hover:bg-[#F8FAF9]">
                        <td className="py-3 px-4 font-semibold text-[#111827]">
                          {ent.patientId?.fullName || "Patient Chart"}
                        </td>
                        <td className="py-3 px-4 text-[#334155]">{ent.packageName}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">
                          {ent.totalSessions}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">
                          {ent.availableSessions}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-700">
                          {ent.reservedSessions}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-500">
                          {ent.consumedSessions}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {new Date(ent.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ent.status === "active"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {ent.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

