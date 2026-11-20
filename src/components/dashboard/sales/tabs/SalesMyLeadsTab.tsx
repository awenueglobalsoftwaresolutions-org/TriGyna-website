"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Filter,
  Phone,
  MessageCircle,
  Clock,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  MoreVertical,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";
import { SalesLead, SalesLeadDrawer } from "../SalesLeadDrawer";

interface SalesMyLeadsTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
  onOpenAddLeadModal?: () => void;
}

export function SalesMyLeadsTab({ showNotification, onOpenAddLeadModal }: SalesMyLeadsTabProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchMyLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("scope", "me");
      if (activeStage !== "all") params.append("stage", activeStage);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await api.get<{ leads: SalesLead[] }>(`/sales/leads?${params.toString()}`);
      if (res.data?.leads) {
        setLeads(res.data.leads);
      }
    } catch {
      showNotification("Failed to load your assigned leads", true);
    } finally {
      setIsLoading(false);
    }
  }, [activeStage, searchQuery, showNotification]);

  useEffect(() => {
    fetchMyLeads();
  }, [fetchMyLeads]);

  const stages = [
    { id: "all", label: "All My Leads" },
    { id: "new", label: "New" },
    { id: "contacted", label: "Contacted" },
    { id: "interested", label: "Interested" },
    { id: "appointment", label: "Appointment" },
    { id: "converted", label: "Converted" },
    { id: "lost", label: "Lost" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#172033] tracking-tight">My Assigned Leads</h2>
          <p className="text-xs sm:text-sm text-[#718096] mt-1">
            Exclusive workspace for your assigned prospective patients and consultations
          </p>
        </div>

        {onOpenAddLeadModal && (
          <button
            type="button"
            onClick={onOpenAddLeadModal}
            className="px-4 py-2.5 rounded-xl bg-[#159447] hover:bg-[#073B2E] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Capture New Lead</span>
          </button>
        )}
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E5EBE8] scrollbar-none">
        {stages.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setActiveStage(st.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeStage === st.id
                ? "bg-[#E5F4E8] text-[#159447] shadow-2xs border border-[#159447]/20"
                : "text-[#718096] hover:text-[#172033] hover:bg-gray-100/60"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, phone, or interested service..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5EBE8] bg-white text-xs text-[#172033] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#159447] shadow-2xs"
          />
        </div>
        <span className="text-xs font-semibold text-[#718096]">
          Showing {leads.length} {leads.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      {/* Leads Table / Grid */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-[#E5EBE8]">
          <Loader2 className="w-8 h-8 text-[#159447] animate-spin" />
          <p className="text-xs text-[#718096] font-medium">Fetching your assigned leads from database...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-[#E5EBE8] shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#E5F4E8] text-[#159447] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#172033]">No assigned leads found</h4>
          <p className="text-xs text-[#718096] max-w-sm">
            {activeStage === "all"
              ? "You currently have no leads assigned. New leads from website or WhatsApp will appear here."
              : `No leads currently in the "${activeStage}" stage.`}
          </p>
          {onOpenAddLeadModal && (
            <button
              type="button"
              onClick={onOpenAddLeadModal}
              className="mt-2 px-4 py-2 rounded-xl bg-[#159447] text-white text-xs font-bold hover:bg-[#073B2E] transition cursor-pointer"
            >
              + Create Lead
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E5EBE8] rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9F8] border-b border-[#E5EBE8] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Patient / Lead</th>
                  <th className="py-3.5 px-4">Service Interest</th>
                  <th className="py-3.5 px-4">Current Stage</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Next Action / Follow-up</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4 text-right">Quick Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE8]">
                {leads.map((lead) => {
                  const initials = lead.fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0].toUpperCase())
                    .join("") || "LD";

                  const stageColors: Record<string, string> = {
                    new: "bg-emerald-50 text-emerald-800 border-emerald-200",
                    contacted: "bg-blue-50 text-blue-800 border-blue-200",
                    interested: "bg-amber-50 text-amber-800 border-amber-200",
                    appointment: "bg-purple-50 text-purple-800 border-purple-200",
                    converted: "bg-emerald-100 text-emerald-900 border-emerald-300",
                    lost: "bg-rose-50 text-rose-800 border-rose-200",
                  };

                  return (
                    <tr
                      key={lead._id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDrawerOpen(true);
                      }}
                      className="hover:bg-[#F7F9F8]/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E5F4E8] text-[#159447] font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-[#172033] group-hover:text-[#159447] transition-colors">
                              {lead.fullName}
                            </p>
                            <p className="text-[11px] text-[#718096]">{lead.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#172033] block">{lead.serviceInterest}</span>
                        <span className="text-[10px] text-[#718096]">{lead.consultationMode}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                            stageColors[lead.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            lead.priority === "urgent" || lead.priority === "high"
                              ? "text-rose-600"
                              : lead.priority === "low"
                              ? "text-gray-400"
                              : "text-amber-600"
                          }`}
                        >
                          ● {lead.priority || "medium"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#718096]">
                          <Clock className="w-3.5 h-3.5 text-[#159447]" />
                          <span>
                            {lead.followUpDate
                              ? new Date(lead.followUpDate).toLocaleDateString("en-IN")
                              : "No pending task"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-[#718096] capitalize">
                          {lead.source?.replace(/_/g, " ") || "Website"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.phone && (
                            <>
                              <a
                                href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="WhatsApp chat"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                              <a
                                href={`tel:${lead.phone}`}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Call phone"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            title="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        onLeadUpdated={fetchMyLeads}
        showNotification={showNotification}
      />
    </div>
  );
}
