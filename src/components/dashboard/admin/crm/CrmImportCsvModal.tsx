"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface CrmImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
}

export function CrmImportCsvModal({
  isOpen,
  onClose,
  onSuccess,
  showNotification,
}: CrmImportCsvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    validCount: number;
    duplicateCount: number;
    errorCount: number;
    errors: any[];
    previewRows: any[];
  } | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  if (!isOpen) return null;

  const parseCsvText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (currentline.length === 0) continue;

      const obj: Record<string, string> = {};
      headers.forEach((h, index) => {
        const cleanHeader = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        const val = currentline[index] || "";
        if (cleanHeader.includes("name")) obj.fullName = val;
        else if (cleanHeader.includes("phone") || cleanHeader.includes("mobile")) obj.phone = val;
        else if (cleanHeader.includes("email")) obj.email = val;
        else if (cleanHeader.includes("service")) obj.serviceInterest = val;
        else if (cleanHeader.includes("source")) obj.source = val;
        else if (cleanHeader.includes("priority")) obj.priority = val;
      });

      if (obj.fullName || obj.phone) {
        rows.push(obj);
      }
    }
    return rows;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setPreviewData(null);

    try {
      const text = await selectedFile.text();
      const rows = parseCsvText(text);

      if (rows.length === 0) {
        showNotification("No readable data rows found in CSV", true);
        setIsParsing(false);
        return;
      }

      setParsedRows(rows);

      // Call preview API
      const res = await api.post<{
        totalRows: number;
        validCount: number;
        duplicateCount: number;
        errorCount: number;
        errors: any[];
        previewRows: any[];
      }>("/crm/import/preview", { rows });

      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        showNotification(res.message || "Failed to validate CSV", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to parse CSV file", true);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsExecuting(true);
    try {
      const res = await api.post<{ insertedCount: number; skippedCount: number }>(
        "/crm/import/execute",
        {
          rows: parsedRows,
          skipDuplicates,
        }
      );

      if (res.success) {
        showNotification(
          `Import complete! ${res.data?.insertedCount || 0} leads created, ${res.data?.skippedCount || 0} skipped.`
        );
        onSuccess();
        onClose();
      } else {
        showNotification(res.message || "Failed to execute import", true);
      }
    } catch (err: any) {
      showNotification(err?.message || "Error importing leads", true);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#E9F8F0] border-b border-[#D1F2E0] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#087A50] text-white flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Import Leads from CSV</h3>
              <p className="text-xs text-[#075B3D]">
                Bulk intake with duplicate prevention and schema validation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white text-[#64748B] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto">
          {/* File Upload Drop Area */}
          <div className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6 text-center hover:border-[#087A50] transition-colors bg-[#F7F9FC]">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-[#087A50] mx-auto opacity-80" />
              <div>
                <span className="font-bold text-[#087A50] hover:underline">
                  Click to select CSV file
                </span>{" "}
                <span className="text-[#64748B]">or drag and drop</span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Columns recognized: Name, Phone, Email, Service, Source, Priority
              </p>
            </label>
            {file && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-[#E5EAF0] font-semibold text-[#111827]">
                <span>{file.name}</span>
                <span className="text-[#64748B]">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Parsing State */}
          {isParsing && (
            <div className="py-6 text-center text-[#64748B] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#087A50]" />
              <span>Validating columns and checking duplicates in database...</span>
            </div>
          )}

          {/* Validation & Preview Summary */}
          {previewData && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Stat Chips */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 font-semibold block">Valid Leads</span>
                  <span className="text-xl font-bold text-[#087A50]">{previewData.validCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[11px] text-amber-800 font-semibold block">Duplicates Detected</span>
                  <span className="text-xl font-bold text-amber-800">{previewData.duplicateCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-[11px] text-red-800 font-semibold block">Invalid Rows</span>
                  <span className="text-xl font-bold text-red-700">{previewData.errorCount}</span>
                </div>
              </div>

              {/* Duplicate Handling Option */}
              <div className="p-3 bg-[#F7F9FC] rounded-xl border border-[#E5EAF0]">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#111827]">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 text-[#087A50] rounded"
                  />
                  <span>Skip duplicate phone records (Recommended to prevent patient clutter)</span>
                </label>
              </div>

              {/* Preview Table */}
              <div>
                <h4 className="font-bold text-[#111827] mb-1.5">First {previewData.previewRows.length} Rows Preview</h4>
                <div className="border border-[#E5EAF0] rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[#64748B]">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Service</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]">
                      {previewData.previewRows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#F7F9FC]">
                          <td className="py-2 px-3 text-[#64748B]">{r.rowNumber}</td>
                          <td className="py-2 px-3 font-semibold text-[#111827]">{r.fullName || "—"}</td>
                          <td className="py-2 px-3 font-mono">{r.phone || "—"}</td>
                          <td className="py-2 px-3 text-[#64748B]">{r.serviceInterest}</td>
                          <td className="py-2 px-3">
                            {r.isDuplicate ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Duplicate
                              </span>
                            ) : r.isValid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-[#087A50]">
                                Valid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F7F9FC] border-t border-[#E5EAF0] px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#111827] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!previewData || isExecuting || (previewData.validCount === 0 && !skipDuplicates)}
            onClick={handleExecuteImport}
            className="px-5 py-2 rounded-xl bg-[#087A50] hover:bg-[#075B3D] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing to Database...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Import Leads</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
