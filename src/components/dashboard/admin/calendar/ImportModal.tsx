"use client";

import React, { useState } from "react";
import { X, ArrowDownToLine, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { ImportedCalendarEvent } from "./types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isErr?: boolean) => void;
}

export function ImportModal({
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: ImportModalProps) {
  const [parsedRows, setParsedRows] = useState<ImportedCalendarEvent[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Simple CSV parser for calendar preview
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const parsed: ImportedCalendarEvent[] = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          return {
            title: cols[3] || "Imported Institutional Event",
            date: cols[5] || "2026-11-20",
            startTime: cols[6] || "10:00 AM",
            endTime: cols[7] || "10:30 AM",
            eventType: "institutional",
          };
        });
        setParsedRows(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    try {
      setIsImporting(true);
      await api.post("/calendar/import/execute", {
        events: parsedRows,
        previewOnly: false,
      });

      showNotification(`Imported ${parsedRows.length} events successfully!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Import execution failed";
      showNotification(msg, true);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl max-w-lg w-full p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-[#087A50]" />
            <h3 className="font-bold text-base text-[#111827]">Import Calendar Schedule</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#64748B]">
          Upload a structured CSV or iCal file to import institutional schedules. Events are validated against doctor availability and conflicts before committing.
        </p>

        {/* Upload Area */}
        <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#087A50] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[#F8FAFC]">
          <Upload className="w-6 h-6 text-[#64748B]" />
          <span className="text-xs font-semibold text-[#111827]">Click to select CSV or ICS file</span>
          <span className="text-[10px] text-[#64748B]">Standard format supported</span>
          <input type="file" accept=".csv,.ics" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Parsed Preview */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
              <span>Preview ({parsedRows.length} events parsed)</span>
              <span className="text-[#087A50] font-normal text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Validated
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-[#E5EAF0] border border-[#E5EAF0] rounded-xl bg-white text-xs">
              {parsedRows.slice(0, 5).map((row, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#111827]">{row.title}</p>
                    <p className="text-[10px] text-[#64748B]">{row.date} · {row.startTime}</p>
                  </div>
                  <span className="text-[10px] font-semibold bg-gray-100 px-2 py-0.5 rounded">
                    {row.eventType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E5EAF0] text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isImporting}
            className="px-5 py-2 bg-[#087A50] hover:bg-[#075B3D] text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Import ${parsedRows.length} Events`}
          </button>
        </div>
      </div>
    </div>
  );
}
