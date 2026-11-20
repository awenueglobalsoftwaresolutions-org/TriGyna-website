"use client";

import React from "react";
import { Users, Calendar, ArrowRight } from "lucide-react";
import { UpcomingItem } from "./types";

interface FollowUpUpcomingWidgetProps {
  upcomingList: UpcomingItem[];
  onViewAllClick: () => void;
  onItemClick?: (id: string) => void;
}

export function FollowUpUpcomingWidget({
  upcomingList,
  onViewAllClick,
  onItemClick,
}: FollowUpUpcomingWidgetProps) {
  // If list is empty, supply clean empty state or default items
  const items = upcomingList.length > 0
    ? upcomingList.slice(0, 3)
    : [
        {
          _id: "up_1",
          followUpCode: "FLW-2026-007",
          patientName: "Sunita Deshmukh",
          patientCode: "TG0023",
          phone: "9820010023",
          date: "28 Oct",
          time: "11:00 AM",
          displaySlot: "28 Oct, 11:00 AM",
          mode: "Online Video Consultation",
          status: "scheduled",
        },
        {
          _id: "up_2",
          followUpCode: "FLW-2026-008",
          patientName: "Neha Singh",
          patientCode: "TG0016",
          phone: "9820010016",
          date: "28 Oct",
          time: "03:30 PM",
          displaySlot: "28 Oct, 03:30 PM",
          mode: "Online Video Consultation",
          status: "scheduled",
        },
        {
          _id: "up_3",
          followUpCode: "FLW-2026-009",
          patientName: "Kavya Mehta",
          patientCode: "TG0020",
          phone: "9820010020",
          date: "30 Oct",
          time: "04:30 PM",
          displaySlot: "30 Oct, 04:30 PM",
          mode: "Phone Follow-up",
          status: "scheduled",
        },
      ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="bg-white border border-[#E5EAF0] rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
            <Users className="w-3.5 h-3.5 text-[#087A50]" />
            <span>Upcoming (Next 7 Days)</span>
          </div>
          <button
            type="button"
            onClick={onViewAllClick}
            className="text-xs text-[#087A50] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <span>View All</span>
          </button>
        </div>

        {/* List of 3 items */}
        <div className="divide-y divide-[#F8FAFC] mt-2">
          {items.map((item) => (
            <div
              key={item._id}
              onClick={() => onItemClick?.(item._id)}
              className="py-2.5 flex items-center justify-between gap-2 hover:bg-gray-50/60 rounded-xl px-1.5 transition-colors cursor-pointer"
            >
              {/* Patient info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#087A50] border border-emerald-100 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {getInitials(item.patientName)}
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold text-[#111827] block truncate">
                    {item.patientName}
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    {item.patientCode}
                  </span>
                </div>
              </div>

              {/* Slot */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#111827] shrink-0">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                <span>{item.displaySlot}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
