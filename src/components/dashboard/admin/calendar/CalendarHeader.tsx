"use client";

import React from "react";
import {
  CalendarDays,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

interface CalendarHeaderProps {
  onCreateEvent: () => void;
  onImport: () => void;
  onExport: () => void;
}

export function CalendarHeader({
  onCreateEvent,
  onImport,
  onExport,
}: CalendarHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 lg:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#E9F8F0] border border-[#A7F3D0]/60 text-[#087A50] flex items-center justify-center shrink-0 shadow-2xs">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold text-[#111827] tracking-tight">
            Master Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-normal">
            Unified scheduling: doctor appointments, care follow-ups, staff leaves, and clinical tasks
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 flex-wrap">
        <button
          onClick={onCreateEvent}
          className="bg-[#087A50] hover:bg-[#075B3D] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>

        <button
          onClick={onImport}
          className="border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#334155] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          title="Import calendar from CSV or iCal"
        >
          <ArrowDownToLine className="w-4 h-4 text-[#64748B]" />
          <span>Import</span>
        </button>

        <button
          onClick={onExport}
          className="border border-[#E5EAF0] bg-white hover:bg-[#F8FAFC] text-[#334155] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          title="Export calendar to CSV or iCal"
        >
          <ArrowUpFromLine className="w-4 h-4 text-[#64748B]" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}
