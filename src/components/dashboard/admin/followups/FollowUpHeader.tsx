"use client";

import React from "react";
import { Clock, Plus, Upload, Loader2 } from "lucide-react";

interface FollowUpHeaderProps {
  onScheduleClick: () => void;
  onExportClick: () => void;
  isExporting?: boolean;
}

export function FollowUpHeader({
  onScheduleClick,
  onExportClick,
  isExporting = false,
}: FollowUpHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 lg:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Title & Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#087A50] flex items-center justify-center shadow-xs shrink-0">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-bold text-[#111827] tracking-tight">
              Follow-ups &amp; Recovery Management
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Post-consultation symptom reviews, regimen adjustments, and holistic recovery tracking
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onExportClick}
            disabled={isExporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-[#E5EAF0] text-[#111827] text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087A50]" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-[#64748B]" />
            )}
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={onScheduleClick}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </div>
    </div>
  );
}
