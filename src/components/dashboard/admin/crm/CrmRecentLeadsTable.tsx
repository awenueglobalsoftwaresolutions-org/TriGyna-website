"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  Sliders,
  Phone,
  MessageCircle,
  MoreVertical,
  Calendar,
  Globe,
  Share2,
  ExternalLink,
  UserCheck,
  Ban,
  Clock,
  Edit,
} from "lucide-react";
import { CrmLead } from "./crmTypes";

interface CrmRecentLeadsTableProps {
  leads: CrmLead[];
  onSelectLead: (lead: CrmLead) => void;
  onCallLead: (lead: CrmLead) => void;
  onWhatsAppLead: (lead: CrmLead) => void;
  onConvertLead: (lead: CrmLead) => void;
  onMarkLost: (lead: CrmLead) => void;
  onScheduleFollowup: (lead: CrmLead) => void;
  onEditLead: (lead: CrmLead) => void;
  currentUserId?: string;
  isLoading?: boolean;
}

export function CrmRecentLeadsTable({
  leads,
  onSelectLead,
  onCallLead,
  onWhatsAppLead,
  onConvertLead,
  onMarkLost,
  onScheduleFollowup,
  onEditLead,
  currentUserId,
  isLoading = false,
}: CrmRecentLeadsTableProps) {
  const [filterType, setFilterType] = useState<"all" | "my" | "unassigned">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter leads based on pill tab and search
  const filteredLeads = leads.filter((lead) => {
    // 1. Tab filter
    if (filterType === "my") {
      if (!currentUserId || lead.assignedTo?._id !== currentUserId) {
        return false;
      }
    } else if (filterType === "unassigned") {
      if (lead.assignedTo) {
        return false;
      }
    }

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.fullName?.toLowerCase().includes(q);
      const matchPhone = lead.phone?.includes(q);
      const matchService = lead.serviceInterest?.toLowerCase().includes(q);
      const matchSource = lead.source?.toLowerCase().includes(q);
      const matchId = lead._id?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchService && !matchSource && !matchId) {
        return false;
      }
    }

    return true;
  });

  const getLeadDisplayCode = (lead: CrmLead) => {
    if (lead.leadCode) return lead.leadCode;
    return `LD-${lead._id.slice(-5).toUpperCase()}`;
  };

  const getSourceDetails = (source: string) => {
    const s = (source || "website").toLowerCase();
    if (s.includes("whatsapp")) {
      return {
        label: "WhatsApp",
        icon: MessageCircle,
        className: "bg-[#E9F8F0] text-[#087A50] border-[#D1F2E0]",
      };
    }
    if (s.includes("meta") || s.includes("facebook") || s.includes("instagram")) {
      return {
        label: "Meta Ads",
        icon: Share2,
        className: "bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]",
      };
    }
    if (s.includes("phone") || s.includes("call")) {
      return {
        label: "Phone",
        icon: Phone,
        className: "bg-[#F0FDFA] text-[#0F766E] border-[#CCFBF1]",
      };
    }
    if (s.includes("referral")) {
      return {
        label: "Referral",
        icon: ExternalLink,
        className: "bg-[#FAF5FF] text-[#7E22CE] border-[#F3E8FF]",
      };
    }
    return {
      label: "Website",
      icon: Globe,
      className: "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]",
    };
  };

  const getStageBadge = (status: string) => {
    const st = (status || "new").toLowerCase();
    if (st === "new") {
      return {
        label: "New Lead",
        className: "bg-[#EFF6FF] text-[#1E40AF] border-[#DBEAFE]",
      };
    }
    if (st === "contacted" || st === "contact_attempted" || st === "nurture") {
      return {
        label: "Contacted",
        className: "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]",
      };
    }
    if (st === "qualified" || st === "interested") {
      return {
        label: "Qualified",
        className: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
      };
    }
    if (st === "converted" || st === "consultation_booked" || st === "appointment") {
      return {
        label: "Converted",
        className: "bg-[#E9F8F0] text-[#075B3D] border-[#D1F2E0]",
      };
    }
    return {
      label: "Lost",
      className: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    };
  };

  const getPriorityBadge = (priority: string = "medium") => {
    const p = priority.toLowerCase();
    if (p === "high" || p === "urgent") {
      return {
        label: p === "urgent" ? "Urgent" : "High",
        className: "bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]",
      };
    }
    if (p === "medium") {
      return {
        label: "Medium",
        className: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
      };
    }
    return {
      label: "Low",
      className: "bg-gray-100 text-[#475569] border-gray-200",
    };
  };

  const formatFollowUp = (dateStr?: string) => {
    if (!dateStr) return "28 Oct, 10:30 AM";
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${day} ${month}, ${time}`;
  };

  const getOwnerInitials = (name?: string) => {
    if (!name) return "SK";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-2xs mt-4">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#E5EAF0]">
        {/* Left: Title & Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">Recent Leads</h3>
          </div>

          <div className="flex items-center gap-1 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-[#087A50] text-white shadow-2xs"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              All Leads
            </button>
            <button
              type="button"
              onClick={() => setFilterType("my")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === "my"
                  ? "bg-[#087A50] text-white shadow-2xs"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              My Leads
            </button>
            <button
              type="button"
              onClick={() => setFilterType("unassigned")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === "unassigned"
                  ? "bg-[#087A50] text-white shadow-2xs"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              Unassigned
            </button>
          </div>
        </div>

        {/* Right: Search & Filters */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, phone, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#111827] text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5EAF0] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-3">Lead ID</th>
              <th className="py-3 px-3">Name</th>
              <th className="py-3 px-3">Service Interest</th>
              <th className="py-3 px-3">Source</th>
              <th className="py-3 px-3">Stage</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Next Follow-up</th>
              <th className="py-3 px-3">Owner</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0] text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#64748B]">
                  Loading real CRM leads...
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#64748B]">
                  No leads found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.slice(0, 10).map((lead) => {
                const leadCode = getLeadDisplayCode(lead);
                const source = getSourceDetails(lead.source);
                const stage = getStageBadge(lead.status);
                const priority = getPriorityBadge(lead.priority);
                const SourceIcon = source.icon;
                const ownerName = lead.assignedTo?.name || "Sushil K.";
                const isMenuOpen = activeMenuId === lead._id;

                return (
                  <tr
                    key={lead._id}
                    className="hover:bg-[#F7F9FC]/70 transition-colors group cursor-pointer"
                    onClick={() => onSelectLead(lead)}
                  >
                    {/* LEAD ID */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-1 rounded-md bg-[#E9F8F0] text-[#087A50] font-mono text-[11px] font-semibold border border-[#D1F2E0]">
                        {leadCode}
                      </span>
                    </td>

                    {/* NAME */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#111827] group-hover:text-[#087A50] transition-colors">
                        {lead.fullName}
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">{lead.phone}</div>
                    </td>

                    {/* SERVICE INTEREST */}
                    <td className="py-3.5 px-3 text-[#64748B] font-medium max-w-[160px] truncate">
                      {lead.serviceInterest || "General Wellness"}
                    </td>

                    {/* SOURCE */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-2xs ${source.className}`}
                      >
                        <SourceIcon className="w-3 h-3 shrink-0" />
                        <span>{source.label}</span>
                      </span>
                    </td>

                    {/* STAGE */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stage.className}`}
                      >
                        {stage.label}
                      </span>
                    </td>

                    {/* PRIORITY */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                    </td>

                    {/* NEXT FOLLOW-UP */}
                    <td className="py-3.5 px-3 text-[#111827] font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>{formatFollowUp(lead.followUpDate)}</span>
                      </div>
                    </td>

                    {/* OWNER */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#E2E8F0] text-[#334155] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {getOwnerInitials(ownerName)}
                        </div>
                        <span className="text-xs font-semibold text-[#111827] truncate">
                          {ownerName}
                        </span>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td
                      className="py-3.5 px-3 text-right whitespace-nowrap relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        {/* Phone call icon */}
                        <button
                          type="button"
                          onClick={() => onCallLead(lead)}
                          className="w-7 h-7 rounded-lg hover:bg-[#E9F8F0] text-[#087A50] flex items-center justify-center transition cursor-pointer"
                          title="Call Lead"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>

                        {/* WhatsApp icon */}
                        <button
                          type="button"
                          onClick={() => onWhatsAppLead(lead)}
                          className="w-7 h-7 rounded-lg hover:bg-[#E9F8F0] text-[#087A50] flex items-center justify-center transition cursor-pointer"
                          title="WhatsApp Chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* 3 dots menu */}
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(isMenuOpen ? null : lead._id)}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 text-[#64748B] flex items-center justify-center transition cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          className="absolute right-3 top-10 w-48 bg-white border border-[#E5EAF0] rounded-xl shadow-lg z-30 py-1 text-left animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onSelectLead(lead);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#111827] hover:bg-[#F7F9FC] flex items-center gap-2 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditLead(lead);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#111827] hover:bg-[#F7F9FC] flex items-center gap-2 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>Edit Lead</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onScheduleFollowup(lead);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#111827] hover:bg-[#F7F9FC] flex items-center gap-2 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>Schedule Follow-up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onConvertLead(lead);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-[#087A50] hover:bg-[#E9F8F0] font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Convert to Patient</span>
                          </button>
                          <div className="border-t border-[#E5EAF0] my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onMarkLost(lead);
                            }}
                            className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Mark as Lost</span>
                          </button>
                        </div>
                      )}
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
}
