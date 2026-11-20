"use client";

import React from "react";
import { Users, Settings, Download, Plus, Loader2 } from "lucide-react";

interface SalesTeamHeaderProps {
  onOpenSettings: () => void;
  onExport: () => void;
  onOpenAddMember: () => void;
  isExporting?: boolean;
}

export const SalesTeamHeader: React.FC<SalesTeamHeaderProps> = ({
  onOpenSettings,
  onExport,
  onOpenAddMember,
  isExporting = false,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
      {/* Left: Icon, Title & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0 border border-[#16A36A]/20 shadow-xs">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Sales Team</h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-normal">
            Manage sales representatives, track performance, targets and conversions.
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5EAF0] text-xs font-semibold text-[#111827] hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Team Settings</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5EAF0] text-xs font-semibold text-[#111827] hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087A50]" />
          ) : (
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
          )}
          <span>Export</span>
        </button>

        <button
          type="button"
          onClick={onOpenAddMember}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] active:scale-[0.99] text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Member</span>
        </button>
      </div>
    </div>
  );
};
