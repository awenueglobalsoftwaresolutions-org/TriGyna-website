"use client";

import React, { useState } from "react";
import {
  Layers,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import { CalendarStreamsState } from "./types";

interface CalendarStreamsPanelProps {
  streams: CalendarStreamsState;
  onToggleStream: (key: keyof CalendarStreamsState) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  streamCounts: {
    appointments: number;
    followups: number;
    doctorSessions: number;
    staffLeaves: number;
    clinicalTasks: number;
    administrativeEvents?: number;
  };
}

export function CalendarStreamsPanel({
  streams,
  onToggleStream,
  onSelectAll,
  onClearAll,
  streamCounts,
}: CalendarStreamsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const streamItems: Array<{
    key: keyof CalendarStreamsState;
    label: string;
    dotColor: string;
    count: number;
  }> = [
    {
      key: "appointments",
      label: "Appointments",
      dotColor: "bg-[#2563EB]",
      count: streamCounts.appointments,
    },
    {
      key: "followups",
      label: "Follow-ups",
      dotColor: "bg-[#16A34A]",
      count: streamCounts.followups,
    },
    {
      key: "doctorSessions",
      label: "Doctor Sessions",
      dotColor: "bg-[#9333EA]",
      count: streamCounts.doctorSessions,
    },
    {
      key: "staffLeaves",
      label: "Staff Leaves",
      dotColor: "bg-[#DC2626]",
      count: streamCounts.staffLeaves,
    },
    {
      key: "clinicalTasks",
      label: "Clinical Tasks",
      dotColor: "bg-[#D97706]",
      count: streamCounts.clinicalTasks,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#64748B]" />
          <h2 className="text-sm sm:text-base font-bold text-[#111827]">Calendar Streams</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-[#64748B] hover:text-[#111827] rounded-md transition-colors cursor-pointer"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4 text-[#087A50]" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-2.5">
          {streamItems.map((item) => {
            const isChecked = streams[item.key];
            return (
              <div
                key={item.key}
                onClick={() => onToggleStream(item.key)}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  {/* Custom Checkbox */}
                  <div
                    className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-colors border ${
                      isChecked
                        ? "bg-[#087A50] border-[#087A50] text-white"
                        : "border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  {/* Dot */}
                  <span className={`w-2 h-2 rounded-full ${item.dotColor} shrink-0`} />

                  {/* Label */}
                  <span className="text-xs sm:text-sm font-medium text-[#1E293B]">
                    {item.label}
                  </span>
                </div>

                {/* Count Badge */}
                <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md min-w-[24px] text-center font-mono">
                  {item.count}
                </span>
              </div>
            );
          })}

          {/* Quick Actions Footer */}
          <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-between text-[11px] font-semibold text-[#64748B]">
            <button
              onClick={onSelectAll}
              className="hover:text-[#087A50] cursor-pointer"
            >
              Select All
            </button>
            <button
              onClick={onClearAll}
              className="hover:text-[#DC2626] cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
