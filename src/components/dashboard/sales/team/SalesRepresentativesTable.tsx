"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  ChevronDown,
  Filter,
  Phone,
  MessageSquare,
  MoreVertical,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  Loader2,
} from "lucide-react";
import { SalesRepresentativeItem } from "./salesTeamTypes";

interface SalesRepresentativesTableProps {
  representatives: SalesRepresentativeItem[];
  loading?: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onSelectMember: (rep: SalesRepresentativeItem) => void;
  onToggleStatus?: (rep: SalesRepresentativeItem) => void;
}

// Avatar color palettes matching reference
const avatarColors = [
  { bg: "bg-[#E9F8F0]", text: "text-[#087A50]" }, // Emerald
  { bg: "bg-[#E0F2FE]", text: "text-[#0284C7]" }, // Cyan/Teal
  { bg: "bg-[#EDE9FE]", text: "text-[#7C3AED]" }, // Purple
  { bg: "bg-[#FEF3C7]", text: "text-[#D97706]" }, // Amber/Orange
  { bg: "bg-[#FCE7F3]", text: "text-[#DB2777]" }, // Pink
  { bg: "bg-[#DCFCE7]", text: "text-[#16A36A]" }, // Green
];

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const SalesRepresentativesTable: React.FC<SalesRepresentativesTableProps> = ({
  representatives,
  loading = false,
  search,
  onSearchChange,
  selectedBranch,
  onBranchChange,
  selectedPeriod,
  onPeriodChange,
  onSelectMember,
  onToggleStatus,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter representatives locally if needed
  const filtered = representatives.filter((r) => {
    if (selectedBranch && selectedBranch !== "All Branches" && selectedBranch !== "all") {
      if (r.branchName !== selectedBranch) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.branchName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-[#E5EAF0]/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Count */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E9F8F0] text-[#087A50] flex items-center justify-center">
            <Users className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h2 className="text-base font-bold text-[#111827]">
            Sales Representatives ({representatives.length})
          </h2>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E5EAF0] rounded-xl text-xs text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#087A50] hover:border-gray-300 transition shadow-2xs"
            />
          </div>

          {/* Branch Dropdown */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="appearance-none bg-white border border-[#E5EAF0] text-xs font-semibold text-[#111827] pl-3 pr-7 py-1.5 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#087A50] cursor-pointer shadow-2xs"
            >
              <option value="All Branches">All Branches</option>
              <option value="Main Clinic">Main Clinic</option>
              <option value="South Branch">South Branch</option>
              <option value="North Branch">North Branch</option>
              <option value="Flagship Indiranagar Centre">Flagship Indiranagar Centre</option>
              <option value="Koramangala Specialty Clinic">Koramangala Specialty Clinic</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date Period Dropdown */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="appearance-none bg-white border border-[#E5EAF0] text-xs font-semibold text-[#111827] pl-3 pr-7 py-1.5 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#087A50] cursor-pointer shadow-2xs"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filters Toggle Button */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5EAF0] text-xs font-semibold text-[#111827] hover:bg-gray-50 hover:border-gray-300 transition shadow-2xs cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Table Component */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5EAF0] bg-gray-50/60 text-[11px] font-bold text-[#64748B] uppercase tracking-wider select-none">
              <th className="py-3 px-4 sm:px-6">REPRESENTATIVE</th>
              <th className="py-3 px-4">BRANCH</th>
              <th className="py-3 px-4 text-center">TOTAL LEADS</th>
              <th className="py-3 px-4 text-center">CONVERTED</th>
              <th className="py-3 px-4 text-center">CONVERSION RATE</th>
              <th className="py-3 px-4 text-center">MONTHLY TARGET</th>
              <th className="py-3 px-4 min-w-[140px]">PROGRESS</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4 text-right pr-6">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0]/70 text-xs">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#64748B]">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#087A50]" />
                    <span>Loading authorized sales team representatives...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#64748B]">
                  No sales representatives found matching the criteria.
                </td>
              </tr>
            ) : (
              filtered.map((rep, idx) => {
                const color = avatarColors[idx % avatarColors.length];
                const initials = getInitials(rep.name);
                const isMenuOpen = activeMenuId === rep._id;

                return (
                  <tr
                    key={rep._id}
                    onClick={() => onSelectMember(rep)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Representative */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full ${color.bg} ${color.text} font-bold text-xs flex items-center justify-center shrink-0 border border-black/5`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#111827] group-hover:text-[#087A50] transition-colors truncate">
                              {rep.name}
                            </span>
                            {rep.isTeamLead && (
                              <span title="Team Lead" className="text-amber-500 text-xs">
                                👑
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] font-normal truncate mt-0.5">
                            {rep.designation || rep.salesRole}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3.5 px-4 text-[#64748B] font-medium whitespace-nowrap">
                      {rep.branchName || "Main Clinic"}
                    </td>

                    {/* Total Leads */}
                    <td className="py-3.5 px-4 text-center font-bold text-[#111827]">
                      {rep.totalLeads}
                    </td>

                    {/* Converted */}
                    <td className="py-3.5 px-4 text-center font-bold text-[#111827]">
                      {rep.converted}
                    </td>

                    {/* Conversion Rate */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          rep.conversionRate >= 50
                            ? "bg-[#E9F8F0] text-[#087A50]"
                            : rep.conversionRate > 0
                            ? "bg-[#FAF5FF] text-[#9333EA]"
                            : "bg-[#FAF5FF] text-[#9333EA]"
                        }`}
                      >
                        {rep.conversionRate}%
                      </span>
                    </td>

                    {/* Monthly Target */}
                    <td className="py-3.5 px-4 text-center font-medium text-[#111827]">
                      {rep.monthlyTarget}
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#087A50] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(rep.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[#111827] w-10">
                          {rep.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {rep.status === "Top Performer" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E9F8F0] text-[#087A50] border border-[#16A36A]/20">
                          <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>Top Performer</span>
                        </span>
                      )}
                      {rep.status === "On Track" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E9F8F0] text-[#087A50] border border-[#16A36A]/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" />
                          <span>On Track</span>
                        </span>
                      )}
                      {rep.status === "Inactive" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-[#64748B] border border-gray-200">
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          <span>Inactive</span>
                        </span>
                      )}
                      {rep.status === "Needs Attention" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Needs Attention</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-right pr-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Call */}
                        <a
                          href={`tel:${rep.phone}`}
                          title={`Call ${rep.phone}`}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#087A50] hover:bg-gray-100 transition cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {/* WhatsApp / Message */}
                        <a
                          href={`https://wa.me/${rep.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Message on WhatsApp"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#087A50] hover:bg-gray-100 transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {/* 3 Dots Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(isMenuOpen ? null : rep._id)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#111827] hover:bg-gray-100 transition cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-[#E5EAF0] py-1 z-30 font-sans text-xs animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onSelectMember(rep);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[#111827]"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                                <span>View Profile Drawer</span>
                              </button>

                              {onToggleStatus && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onToggleStatus(rep);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-[#111827]"
                                >
                                  <Shield className="w-3.5 h-3.5 text-[#64748B]" />
                                  <span>
                                    {rep.membershipStatus === "active"
                                      ? "Deactivate Membership"
                                      : "Activate Membership"}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
