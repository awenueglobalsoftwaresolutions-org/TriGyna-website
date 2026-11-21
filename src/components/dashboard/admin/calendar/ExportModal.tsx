"use client";

import React, { useState } from "react";
import { X, ArrowUpFromLine, FileText, Calendar, Loader2 } from "lucide-react";
import { getBaseUrl, getToken } from "@/lib/api/client";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
  currentDate: Date;
}

export function ExportModal({
  isOpen,
  onClose,
  showNotification,
  currentDate,
}: ExportModalProps) {
  const [format, setFormat] = useState<"csv" | "ics">("csv");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startStr = new Date(year, month, 1).toISOString().split("T")[0];
  const endStr = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const baseUrl = getBaseUrl();
      const token = getToken();

      const url = `${baseUrl}/calendar/export?startDate=${startStr}&endDate=${endStr}&format=${format}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Export failed on server");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `trigyna_calendar_${year}_${month + 1}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showNotification(`Calendar exported as ${format.toUpperCase()} successfully!`);
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to export calendar";
      showNotification(msg, true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-[#087A50]" />
            <h3 className="font-bold text-base text-[#111827]">Export Institutional Calendar</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#64748B]">
          Export active events for <strong className="text-[#111827]">{startStr} to {endStr}</strong>. Exports respect role-based data minimization.
        </p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <button
            onClick={() => setFormat("csv")}
            className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
              format === "csv"
                ? "border-[#087A50] bg-[#E9F8F0]/50 ring-1 ring-[#087A50]"
                : "border-[#E5EAF0] hover:bg-[#F8FAFC]"
            }`}
          >
            <FileText className="w-6 h-6 text-[#087A50]" />
            <div>
              <p className="font-bold text-[#111827]">Spreadsheet (CSV)</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">Excel / Sheets</p>
            </div>
          </button>

          <button
            onClick={() => setFormat("ics")}
            className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
              format === "ics"
                ? "border-[#087A50] bg-[#E9F8F0]/50 ring-1 ring-[#087A50]"
                : "border-[#E5EAF0] hover:bg-[#F8FAFC]"
            }`}
          >
            <Calendar className="w-6 h-6 text-[#087A50]" />
            <div>
              <p className="font-bold text-[#111827]">iCalendar (ICS)</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">Google / Outlook / Apple</p>
            </div>
          </button>
        </div>

        <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E5EAF0] text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Download Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
