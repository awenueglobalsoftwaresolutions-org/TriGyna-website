"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Kanban,
  List,
  Maximize2,
  Minimize2,
  Plus,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { CrmLead } from "./crmTypes";

interface CrmPipelineKanbanProps {
  leads: CrmLead[];
  totalLeadsCount: number;
  conversionRate: number;
  onSelectLead: (lead: CrmLead) => void;
  onAddLeadAtStage?: (stageId: string) => void;
  onMoveLeadStage: (leadId: string, newStage: string) => Promise<void>;
  isLoading?: boolean;
}

export function CrmPipelineKanban({
  leads,
  totalLeadsCount,
  conversionRate,
  onSelectLead,
  onAddLeadAtStage,
  onMoveLeadStage,
  isLoading = false,
}: CrmPipelineKanbanProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isExpanded, setIsExpanded] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const COLUMNS = [
    {
      id: "new",
      name: "New Lead",
      dotColor: "#3B82F6",
      headerBg: "bg-[#EFF6FF] text-[#1E40AF] border-[#DBEAFE]",
      cardInitialsBg: "bg-[#E0E7FF] text-[#3730A3]",
    },
    {
      id: "contacted",
      name: "Contacted",
      dotColor: "#8B5CF6",
      headerBg: "bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]",
      cardInitialsBg: "bg-[#F3E8FF] text-[#6B21A8]",
    },
    {
      id: "qualified",
      name: "Qualified",
      dotColor: "#10B981",
      headerBg: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
      cardInitialsBg: "bg-[#CCFBF1] text-[#0F766E]",
    },
    {
      id: "converted",
      name: "Converted",
      dotColor: "#087A50",
      headerBg: "bg-[#E9F8F0] text-[#075B3D] border-[#D1F2E0]",
      cardInitialsBg: "bg-[#D1FAE5] text-[#065F46]",
    },
    {
      id: "lost",
      name: "Lost",
      dotColor: "#EF4444",
      headerBg: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
      cardInitialsBg: "bg-[#FEE2E2] text-[#991B1B]",
    },
  ];

  // Group leads into the 5 columns
  const getColLeads = (colId: string) => {
    return leads.filter((l) => {
      const st = (l.status || "new").toLowerCase();
      if (colId === "new") return st === "new";
      if (colId === "contacted") {
        return (
          st === "contacted" ||
          st === "contact_attempted" ||
          st === "nurture" ||
          st === "assigned"
        );
      }
      if (colId === "qualified") {
        return st === "qualified" || st === "interested" || st === "appointment_requested";
      }
      if (colId === "converted") {
        return (
          st === "converted" ||
          st === "consultation_booked" ||
          st === "consultation_completed" ||
          st === "appointment_booked" ||
          st === "appointment"
        );
      }
      if (colId === "lost") {
        return st === "lost" || st === "not_interested" || st === "closed" || st === "invalid";
      }
      return false;
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "LD";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;
    setDragOverCol(null);
    setDraggedLeadId(null);
    if (leadId) {
      await onMoveLeadStage(leadId, colId);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-2xs transition-all ${
        isExpanded ? "fixed inset-4 z-50 overflow-y-auto shadow-2xl" : ""
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#111827]">Lead Pipeline</h2>
            </div>
            <p className="text-xs text-[#64748B] font-medium">
              Total Leads: <span className="font-semibold text-[#111827]">{totalLeadsCount}</span> | Conversion Rate:{" "}
              <span className="font-semibold text-[#087A50]">{conversionRate}%</span>
            </p>
          </div>
        </div>

        {/* Right Toggle [Kanban / List] & Expand */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl p-0.5 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-[#087A50] text-white shadow-2xs"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-[#087A50] text-white shadow-2xs"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] hover:bg-[#F7F9FC] transition cursor-pointer"
            title={isExpanded ? "Minimize" : "Full Screen"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Kanban Content */}
      {viewMode === "kanban" ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-1">
          {COLUMNS.map((col) => {
            const colLeads = getColLeads(col.id);
            const isDragTarget = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-[#F7F9FC]/70 rounded-2xl p-2.5 flex flex-col justify-between border transition-all min-h-[300px] ${
                  isDragTarget
                    ? "border-[#087A50] bg-[#E9F8F0]/30 ring-1 ring-[#087A50]"
                    : "border-[#E5EAF0]"
                }`}
              >
                <div>
                  {/* Column Header Pill */}
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border font-semibold text-xs mb-3 shadow-2xs ${col.headerBg}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: col.dotColor }}
                      />
                      <span>{col.name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-white/80 shadow-2xs">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                    {colLeads.length === 0 ? (
                      <div className="py-10 text-center flex flex-col items-center justify-center text-[#94A3B8]">
                        <FolderOpen className="w-7 h-7 mb-1.5 opacity-50" strokeWidth={1.5} />
                        <span className="text-xs font-medium">No leads in {col.name}</span>
                      </div>
                    ) : (
                      colLeads.map((lead) => {
                        const isConverted = col.id === "converted" || lead.status === "converted";
                        return (
                          <div
                            key={lead._id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead._id)}
                            onClick={() => onSelectLead(lead)}
                            className="bg-white rounded-xl border border-[#E5EAF0] hover:border-[#087A50]/40 p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {/* Initials Circle Avatar */}
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${col.cardInitialsBg}`}
                                >
                                  {getInitials(lead.fullName)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs sm:text-sm font-semibold text-[#111827] truncate group-hover:text-[#087A50] transition-colors">
                                    {lead.fullName}
                                  </h4>
                                  <p className="text-[11px] text-[#64748B] truncate">
                                    {lead.serviceInterest || "General Consultation"}
                                  </p>
                                </div>
                              </div>

                              {/* Converted Green Checkmark Badge */}
                              {isConverted && (
                                <div className="w-5 h-5 rounded-full bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* + Add Lead at bottom of column */}
                <button
                  type="button"
                  onClick={() => onAddLeadAtStage?.(col.id)}
                  className="mt-3 w-full py-1.5 rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#087A50] text-[#64748B] hover:text-[#087A50] hover:bg-[#E9F8F0]/40 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lead</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="mt-4 divide-y divide-[#E5EAF0] border border-[#E5EAF0] rounded-xl overflow-hidden">
          {leads.slice(0, 15).map((lead) => (
            <div
              key={lead._id}
              onClick={() => onSelectLead(lead)}
              className="p-3 bg-white hover:bg-[#F7F9FC] flex items-center justify-between gap-4 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#E9F8F0] text-[#087A50] font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(lead.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-[#111827] truncate">
                    {lead.fullName}
                  </p>
                  <p className="text-[11px] text-[#64748B] truncate">
                    {lead.serviceInterest} &bull; {lead.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-[#111827]">
                  {lead.status}
                </span>
                <span className="text-xs text-[#64748B]">
                  {lead.assignedTo?.name || "Unassigned"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
