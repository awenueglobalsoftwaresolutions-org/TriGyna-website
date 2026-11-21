"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Download,
  Phone,
  MessageCircle,
  MoreVertical,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { CrmLead } from "./crmTypes";

interface CrmAllLeadsViewProps {
  leads: CrmLead[];
  onSelectLead: (lead: CrmLead) => void;
  onCall: (lead: CrmLead) => void;
  onWhatsApp: (lead: CrmLead) => void;
  onConvert: (lead: CrmLead) => void;
  onMarkLost: (lead: CrmLead) => void;
  onExportCsv: () => void;
  isLoading?: boolean;
}

export function CrmAllLeadsView({
  leads,
  onSelectLead,
  onCall,
  onWhatsApp,
  onConvert,
  onMarkLost,
  onExportCsv,
  isLoading = false,
}: CrmAllLeadsViewProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredLeads = leads.filter((lead) => {
    if (stageFilter && lead.status !== stageFilter) return false;
    if (priorityFilter && (lead.priority || "medium") !== priorityFilter) return false;
    if (sourceFilter && !(lead.source || "").toLowerCase().includes(sourceFilter.toLowerCase())) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = lead.fullName?.toLowerCase().includes(q);
      const matchPhone = lead.phone?.includes(q);
      const matchService = lead.serviceInterest?.toLowerCase().includes(q);
      const matchEmail = lead.email?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchService && !matchEmail) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStageClass = (status: string) => {
    const st = (status || "new").toLowerCase();
    if (st === "new") return "bg-blue-50 text-blue-700 border-blue-200";
    if (st === "contacted" || st === "nurture") return "bg-purple-50 text-purple-700 border-purple-200";
    if (st === "qualified" || st === "interested") return "bg-teal-50 text-teal-700 border-teal-200";
    if (st === "converted") return "bg-emerald-50 text-[#087A50] border-emerald-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">All Leads Directory</h3>
            <p className="text-xs text-[#64748B]">
              Showing {filteredLeads.length} of {leads.length} records in MongoDB
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F7F9FC] text-[#111827] text-xs font-semibold shadow-2xs transition cursor-pointer self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#087A50]" />
          <span>Export Filtered CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, phone, email, service..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 border border-[#E5EAF0] rounded-xl bg-[#F7F9FC] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
            />
          </div>

          {/* Stage */}
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl bg-white text-[#111827]"
          >
            <option value="">All Stages</option>
            <option value="new">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl bg-white text-[#111827]"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Source */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl bg-white text-[#111827]"
          >
            <option value="">All Sources</option>
            <option value="website">Website Enquiry</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="meta">Meta Ads</option>
            <option value="referral">Referral</option>
            <option value="phone">Phone</option>
          </select>

          {(search || stageFilter || priorityFilter || sourceFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStageFilter("");
                setPriorityFilter("");
                setSourceFilter("");
                setCurrentPage(1);
              }}
              className="text-xs text-red-600 font-semibold px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#E5EAF0] rounded-xl overflow-x-auto text-xs">
        <table className="w-full text-left">
          <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#64748B] text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-3">Lead Code</th>
              <th className="py-3 px-3">Patient Name</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Service Interest</th>
              <th className="py-3 px-3">Source</th>
              <th className="py-3 px-3">Stage</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Assigned Rep</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0]">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-[#64748B]">
                  Loading leads...
                </td>
              </tr>
            ) : paginatedLeads.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-[#64748B]">
                  No matching leads found.
                </td>
              </tr>
            ) : (
              paginatedLeads.map((l) => (
                <tr
                  key={l._id}
                  onClick={() => onSelectLead(l)}
                  className="hover:bg-[#F7F9FC]/70 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 font-mono font-semibold text-[#087A50]">
                    {l.leadCode || `LD-${l._id.slice(-5).toUpperCase()}`}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#111827] group-hover:text-[#087A50]">
                    {l.fullName}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#64748B]">{l.phone}</td>
                  <td className="py-3 px-3 text-[#111827] font-medium">{l.serviceInterest}</td>
                  <td className="py-3 px-3 capitalize text-[#64748B]">{l.source}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStageClass(
                        l.status
                      )}`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 capitalize text-[#64748B]">{l.priority || "Medium"}</td>
                  <td className="py-3 px-3 text-[#111827] font-medium">
                    {l.assignedTo?.name || "Unassigned"}
                  </td>
                  <td
                    className="py-3 px-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onCall(l)}
                        className="w-7 h-7 rounded-lg hover:bg-[#E9F8F0] text-[#087A50] flex items-center justify-center"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onWhatsApp(l)}
                        className="w-7 h-7 rounded-lg hover:bg-[#E9F8F0] text-[#087A50] flex items-center justify-center"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectLead(l)}
                        className="w-7 h-7 rounded-lg hover:bg-gray-100 text-[#64748B] flex items-center justify-center"
                        title="Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-[#64748B] pt-2">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-[#E5EAF0] bg-white hover:bg-[#F7F9FC] disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-[#E5EAF0] bg-white hover:bg-[#F7F9FC] disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
