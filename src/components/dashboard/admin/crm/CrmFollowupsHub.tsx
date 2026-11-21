"use client";

import React, { useState } from "react";
import {
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Phone,
  MessageCircle,
  Calendar,
  AlertTriangle,
  Check,
} from "lucide-react";
import { FollowUpItem } from "./crmTypes";

interface CrmFollowupsHubProps {
  dueToday: FollowUpItem[];
  overdue: FollowUpItem[];
  upcoming: FollowUpItem[];
  completed: FollowUpItem[];
  onCompleteFollowup: (followupId: string) => Promise<void>;
  onScheduleNew: () => void;
  onCall: (item: FollowUpItem) => void;
  onWhatsApp: (item: FollowUpItem) => void;
  onOpenLead: (leadId: string) => void;
  isLoading?: boolean;
}

export function CrmFollowupsHub({
  dueToday,
  overdue,
  upcoming,
  completed,
  onCompleteFollowup,
  onScheduleNew,
  onCall,
  onWhatsApp,
  onOpenLead,
  isLoading = false,
}: CrmFollowupsHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<"dueToday" | "overdue" | "upcoming" | "completed">("dueToday");
  const [search, setSearch] = useState("");

  const getActiveList = () => {
    let list: FollowUpItem[] = [];
    if (activeSubTab === "dueToday") list = dueToday;
    else if (activeSubTab === "overdue") list = overdue;
    else if (activeSubTab === "upcoming") list = upcoming;
    else list = completed;

    if (search.trim()) {
      const q = search.toLowerCase();
      return list.filter(
        (i) =>
          i.leadName?.toLowerCase().includes(q) ||
          i.title?.toLowerCase().includes(q) ||
          i.leadPhone?.includes(q)
      );
    }
    return list;
  };

  const currentItems = getActiveList();

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-2xs space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">Follow-ups Hub</h3>
            <p className="text-xs text-[#64748B]">
              Track and complete callbacks, clinical discussions and inquiry follow-ups
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onScheduleNew}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl p-1 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab("dueToday")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "dueToday" ? "bg-[#087A50] text-white shadow-2xs" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <span>Due Today</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {dueToday.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("overdue")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "overdue" ? "bg-red-600 text-white shadow-2xs" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <span>Overdue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {overdue.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("upcoming")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "upcoming" ? "bg-[#087A50] text-white shadow-2xs" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <span>Upcoming</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {upcoming.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("completed")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "completed" ? "bg-[#087A50] text-white shadow-2xs" : "text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <span>Completed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {completed.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-60">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F7F9FC] border border-[#E5EAF0] rounded-xl text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#087A50]"
          />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-[#E5EAF0] border border-[#E5EAF0] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#64748B]">Loading follow-ups...</div>
        ) : currentItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B]">
            No follow-up records found in this section.
          </div>
        ) : (
          currentItems.map((item) => {
            const isDone = item.status === "completed" || activeSubTab === "completed";
            return (
              <div
                key={item._id}
                onClick={() => onOpenLead(item.leadId)}
                className="p-3.5 bg-white hover:bg-[#F7F9FC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDone) onCompleteFollowup(item._id);
                    }}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      isDone
                        ? "bg-[#087A50] border-[#087A50] text-white"
                        : "border-[#CBD5E1] bg-white hover:border-[#087A50]"
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#111827] hover:text-[#087A50]">
                        {item.leadName}
                      </span>
                      {item.priority && (
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${
                            item.priority === "high"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {item.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {item.title || "Scheduled Follow-up Call"} &bull; {item.leadService}
                    </p>
                    {item.notes && (
                      <p className="text-[11px] text-[#475569] mt-1 bg-[#F7F9FC] p-1.5 rounded-lg border border-[#E5EAF0]">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-2.5 self-end sm:self-auto shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-right text-xs">
                    <div className="font-semibold text-[#111827] flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-[#087A50]" />
                      <span>
                        {new Date(item.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B]">
                      {item.assignedTo?.name || "Assigned Rep"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCall(item)}
                    className="w-8 h-8 rounded-xl bg-[#E9F8F0] hover:bg-[#D1F2E0] text-[#087A50] flex items-center justify-center transition cursor-pointer"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onWhatsApp(item)}
                    className="w-8 h-8 rounded-xl bg-[#E9F8F0] hover:bg-[#D1F2E0] text-[#087A50] flex items-center justify-center transition cursor-pointer"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
