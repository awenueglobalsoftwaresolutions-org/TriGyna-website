"use client";

import React from "react";
import { Plus, Download, RefreshCw, HeartPulse } from "lucide-react";

interface PatientDirectoryHeaderProps {
  onRegisterClick: () => void;
  onExportClick: () => void;
  onRefreshClick?: () => void;
  isExporting?: boolean;
}

export function PatientDirectoryHeader({
  onRegisterClick,
  onExportClick,
  onRefreshClick,
  isExporting = false,
}: PatientDirectoryHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#EAF5ED] via-[#F4FAF6] to-[#E9F8F0] border border-[#D5E5DA] p-5 sm:p-6 shadow-2xs">
      {/* Subtle Healthcare Watermark Emblem in Background */}
      <div className="absolute right-6 -bottom-6 opacity-[0.08] pointer-events-none select-none text-[#087A50]">
        <svg width="220" height="220" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D5EFE0] text-[#087A50] text-[10px] font-bold tracking-wider uppercase mb-1.5 border border-[#BDE5CE]">
            <span>CLINICAL RECORDS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-sans font-bold text-[#111827] tracking-tight">
            Patients Directory
          </h1>

          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-xl">
            Complete electronic health registry, case codes, and clinical intake profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          {onRefreshClick && (
            <button
              type="button"
              onClick={onRefreshClick}
              title="Refresh Records"
              className="p-2.5 rounded-full bg-white text-[#64748B] hover:text-[#087A50] hover:bg-emerald-50 border border-[#D5E5DA] shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onExportClick}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-[#087A50] border border-[#D5E5DA] rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>

          <button
            type="button"
            onClick={onRegisterClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>
    </div>
  );
}

