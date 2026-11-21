"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Loader2,
  ChevronRight,
  MoreVertical,
  Phone,
  Mail,
  Check,
  Calendar,
  Layers,
  Table as TableIcon,
  Kanban as KanbanIcon,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import { SalesLead, SalesLeadDrawer } from "../SalesLeadDrawer";

interface SalesPipelineTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
  onOpenAddLeadModal: () => void;
}

export function SalesPipelineTab({
  showNotification,
  onOpenAddLeadModal,
}: SalesPipelineTabProps) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ leads: SalesLead[] }>("/crm/leads?limit=150");
      if (res.data?.leads) {
        setLeads(res.data.leads);
      }
    } catch {
      showNotification("Failed to load CRM pipeline directory", true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Stage counts for quick filter pills
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: leads.length,
      new: 0,
      contacted: 0,
      interested: 0,
      appointment: 0,
      converted: 0,
      lost: 0,
    };
    leads.forEach((l) => {
      const st = (l.status || "new").toLowerCase();
      if (st === "new") counts.new++;
      else if (["contacted", "contact_attempted", "assigned"].includes(st)) counts.contacted++;
      else if (["interested", "qualified", "package_discussion"].includes(st)) counts.interested++;
      else if (["appointment", "appointment_booked", "consultation_booked", "awaiting_payment"].includes(st)) counts.appointment++;
      else if (["converted", "consultation_completed"].includes(st)) counts.converted++;
      else if (st === "lost") counts.lost++;
    });
    return counts;
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Status match
      if (statusFilter !== "all") {
        const st = (l.status || "new").toLowerCase();
        if (statusFilter === "new" && st !== "new") return false;
        if (statusFilter === "contacted" && !["contacted", "contact_attempted", "assigned"].includes(st)) return false;
        if (statusFilter === "interested" && !["interested", "qualified", "package_discussion"].includes(st)) return false;
        if (statusFilter === "appointment" && !["appointment", "appointment_booked", "consultation_booked", "awaiting_payment"].includes(st)) return false;
        if (statusFilter === "converted" && !["converted", "consultation_completed"].includes(st)) return false;
        if (statusFilter === "lost" && st !== "lost") return false;
      }
      // Service match
      if (serviceFilter !== "all" && !l.serviceInterest.toLowerCase().includes(serviceFilter.toLowerCase())) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = l.fullName?.toLowerCase().includes(q);
        const phoneMatch = l.phone?.toLowerCase().includes(q);
        const emailMatch = l.email?.toLowerCase().includes(q);
        const srvMatch = l.serviceInterest?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !emailMatch && !srvMatch) return false;
      }
      return true;
    });
  }, [leads, statusFilter, serviceFilter, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    const token = getToken() || "";
    const baseUrl = getBaseUrl();
    window.open(`${baseUrl}/crm/leads/export?token=${encodeURIComponent(token)}`, "_blank");
    showNotification("Downloading official CRM leads CSV export...");
  };

  const getStatusBadge = (status: string) => {
    const st = (status || "new").toLowerCase();
    if (st === "new") return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">New</span>;
    if (["contacted", "assigned", "contact_attempted"].includes(st))
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8]">Contacted</span>;
    if (["interested", "qualified"].includes(st))
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309]">Interested</span>;
    if (st === "package_discussion")
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309]">Discussion</span>;
    if (st === "awaiting_payment")
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5]">Awaiting Payment</span>;
    if (["appointment", "appointment_booked", "consultation_booked"].includes(st))
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDE9FE] text-[#6D28D9]">Booked</span>;
    if (["converted", "consultation_completed"].includes(st))
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">Converted</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">Lost</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">Leads &amp; Sales Pipeline Directory</h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage all prospective patient inquiries, advance stages, and track conversion lifecycles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#F1F5F9] rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "table" ? "bg-white text-[#0F172A] shadow-xs font-bold" : "text-[#64748B]"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "kanban" ? "bg-white text-[#0F172A] shadow-xs font-bold" : "text-[#64748B]"
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>

          {/* Add Lead */}
          <button
            type="button"
            onClick={onOpenAddLeadModal}
            className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Leads", count: stageCounts.all },
            { id: "new", label: "New", count: stageCounts.new },
            { id: "contacted", label: "Contacted", count: stageCounts.contacted },
            { id: "interested", label: "Interested", count: stageCounts.interested },
            { id: "appointment", label: "Appointment", count: stageCounts.appointment },
            { id: "converted", label: "Converted", count: stageCounts.converted },
            { id: "lost", label: "Lost", count: stageCounts.lost },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === s.id
                  ? "bg-[#16A34A] text-white shadow-xs font-bold"
                  : "bg-[#F8FAFC] text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <span>{s.label}</span>
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === s.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Service Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter leads..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-[#F8FAFC] text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
          >
            <option value="all">All Services</option>
            <option value="PCOD">PCOD</option>
            <option value="Skin">Skin</option>
            <option value="Hair">Hair</option>
            <option value="Diet">Diet</option>
            <option value="PCOS">PCOS</option>
            <option value="Fertility">Fertility</option>
          </select>
        </div>
      </div>

      {/* Directory Table View */}
      {viewMode === "table" ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-7 h-7 text-[#16A34A] animate-spin mb-2" />
              <p className="text-xs text-gray-500">Loading leads from MongoDB database...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-16 text-center text-xs text-gray-500">
              No leads found matching the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Lead / Patient</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Service Interest</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assigned To</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead._id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDrawerOpen(true);
                      }}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EDE9FE] text-[#7C3AED] font-bold text-xs flex items-center justify-center shrink-0">
                            {lead.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F172A] block group-hover:text-[#16A34A] transition-colors">
                              {lead.fullName}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "Recent"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-gray-700 hover:text-[#16A34A] flex items-center gap-1 text-[11px]"
                          >
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{lead.phone}</span>
                          </a>
                          {lead.email && (
                            <span className="text-[10px] text-gray-400 block truncate max-w-[140px]">
                              {lead.email}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {lead.serviceInterest}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] capitalize text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                          {lead.source?.replace(/_/g, " ") || "Inbound"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(lead.status)}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 text-[11px]">
                        {lead.assignedTo?.name || "Sushil Kumar"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = (lead.phone || "").replace(/[^0-9]/g, "");
                              window.open(`https://wa.me/${clean}`, "_blank");
                            }}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDrawerOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Kanban View inside Pipeline Tab */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {["new", "contacted", "interested", "appointment", "converted"].map((col) => {
            const colLeads = filteredLeads.filter((l) => {
              const st = (l.status || "new").toLowerCase();
              if (col === "new") return st === "new";
              if (col === "contacted") return ["contacted", "contact_attempted", "assigned"].includes(st);
              if (col === "interested") return ["interested", "qualified", "package_discussion"].includes(st);
              if (col === "appointment") return ["appointment", "appointment_booked", "consultation_booked", "awaiting_payment"].includes(st);
              if (col === "converted") return ["converted", "consultation_completed"].includes(st);
              return false;
            });

            const colHeaders: Record<string, { label: string; bg: string; text: string }> = {
              new: { label: "New Leads", bg: "bg-[#F1F5F9]", text: "text-[#0F172A]" },
              contacted: { label: "Contacted", bg: "bg-[#E0F2FE]", text: "text-[#0369A1]" },
              interested: { label: "Interested", bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
              appointment: { label: "Appointment", bg: "bg-[#EDE9FE]", text: "text-[#6D28D9]" },
              converted: { label: "Converted", bg: "bg-[#DCFCE7]", text: "text-[#15803D]" },
            };

            const h = colHeaders[col];

            return (
              <div key={col} className="bg-white border border-[#E2E8F0] rounded-3xl p-3.5 flex flex-col space-y-3">
                <div className={`${h.bg} py-2 px-3 rounded-xl text-center`}>
                  <span className={`text-xs font-bold ${h.text}`}>
                    {h.label} ({colLeads.length})
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colLeads.map((lead) => (
                    <div
                      key={lead._id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDrawerOpen(true);
                      }}
                      className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 shadow-2xs hover:shadow-sm hover:border-[#16A34A] transition-all cursor-pointer"
                    >
                      <h4 className="text-xs font-bold text-[#0F172A]">{lead.fullName}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">{lead.serviceInterest}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60 text-[10px]">
                        <span className="text-gray-400">{lead.phone}</span>
                        {getStatusBadge(lead.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      <SalesLeadDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }}
        onLeadUpdated={fetchLeads}
        showNotification={showNotification}
      />
    </div>
  );
}

