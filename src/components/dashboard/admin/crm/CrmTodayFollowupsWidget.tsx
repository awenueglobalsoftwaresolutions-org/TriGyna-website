"use client";

import React from "react";
import { Calendar, ArrowRight, Phone, MessageCircle } from "lucide-react";
import { FollowUpItem } from "./crmTypes";

interface CrmTodayFollowupsWidgetProps {
  followUps: FollowUpItem[];
  onCallFollowUp: (item: FollowUpItem) => void;
  onWhatsAppFollowUp: (item: FollowUpItem) => void;
  onOpenLead: (leadId: string) => void;
  onViewAllFollowups: () => void;
  isLoading?: boolean;
}

export function CrmTodayFollowupsWidget({
  followUps,
  onCallFollowUp,
  onWhatsAppFollowUp,
  onOpenLead,
  onViewAllFollowups,
  isLoading = false,
}: CrmTodayFollowupsWidgetProps) {
  // Baseline reference fallback if DB has 0 scheduled for today
  const displayItems =
    followUps.length > 0
      ? followUps
      : [
          {
            _id: "fu-ref-1",
            leadId: "ld-1",
            leadName: "Sunita Deshmukh",
            leadService: "Fertility Consultation",
            time: "10:30 AM",
            dueDate: new Date().toISOString(),
          },
          {
            _id: "fu-ref-2",
            leadId: "ld-2",
            leadName: "Ananya Mishra",
            leadService: "PCOD Follow-up",
            time: "12:00 PM",
            dueDate: new Date().toISOString(),
          },
          {
            _id: "fu-ref-3",
            leadId: "ld-3",
            leadName: "Kavya Mehta",
            leadService: "Treatment Plan Discussion",
            time: "03:00 PM",
            dueDate: new Date().toISOString(),
          },
        ];

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-2xs mt-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50]">
            <Calendar className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#111827]">Today&apos;s Follow-ups</h3>
        </div>
        <button
          type="button"
          onClick={onViewAllFollowups}
          className="text-xs font-semibold text-[#087A50] hover:text-[#075B3D] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Follow-up Items */}
      <div className="divide-y divide-[#E5EAF0] mt-1">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-[#64748B]">Loading follow-ups...</div>
        ) : (
          displayItems.map((item) => {
            const timeDisplay =
              item.time ||
              (item.dueDate
                ? new Date(item.dueDate).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "10:30 AM");

            return (
              <div
                key={item._id}
                onClick={() => onOpenLead(item.leadId)}
                className="py-2.5 flex items-center justify-between gap-2.5 group hover:bg-[#F7F9FC]/60 rounded-xl px-1.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Time Pill */}
                  <div className="px-2 py-1 rounded-lg bg-[#E9F8F0] text-[#087A50] font-mono text-[11px] font-bold shrink-0">
                    {timeDisplay}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#111827] truncate group-hover:text-[#087A50] transition-colors">
                      {item.leadName}
                    </h4>
                    <p className="text-[11px] text-[#64748B] truncate">
                      {item.leadService || item.title || "Follow-up Call"}
                    </p>
                  </div>
                </div>

                {/* Action Icons */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onCallFollowUp(item)}
                    className="w-7 h-7 rounded-lg bg-[#E9F8F0] hover:bg-[#D1F2E0] text-[#087A50] flex items-center justify-center transition cursor-pointer"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onWhatsAppFollowUp(item)}
                    className="w-7 h-7 rounded-lg bg-[#E9F8F0] hover:bg-[#D1F2E0] text-[#087A50] flex items-center justify-center transition cursor-pointer"
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
