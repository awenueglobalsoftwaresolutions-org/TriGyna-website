"use client";

import React from "react";
import { Users, Plus, Upload, Download } from "lucide-react";

interface CrmPageHeaderProps {
  onAddLead: () => void;
  onImport: () => void;
  onExportCsv: () => void;
  isExporting?: boolean;
}

export function CrmPageHeader({
  onAddLead,
  onImport,
  onExportCsv,
  isExporting = false,
}: CrmPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Icon, Title & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#E9F8F0] border border-[#D1F2E0] flex items-center justify-center text-[#087A50] shadow-2xs shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-[#111827] tracking-tight leading-tight">
            CRM &amp; Leads
          </h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-0.5 font-normal leading-normal">
            Manage enquiries, nurture leads, schedule follow-ups and convert patients.
          </p>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* + Add Lead Primary Button */}
        <button
          type="button"
          onClick={onAddLead}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead</span>
        </button>

        {/* Import Button */}
        <button
          type="button"
          onClick={onImport}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F7F9FC] text-[#111827] border border-[#E5EAF0] text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <Upload className="w-4 h-4 text-[#64748B]" />
          <span>Import</span>
        </button>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExportCsv}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F7F9FC] text-[#111827] border border-[#E5EAF0] text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#64748B]" />
          <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
        </button>
      </div>
    </div>
  );
}
