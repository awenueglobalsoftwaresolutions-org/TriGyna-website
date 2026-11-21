"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard,
  IndianRupee,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
  AlertCircle,
  Receipt,
  User,
  Eye,
  Calendar,
  Stethoscope,
  RefreshCw,
  Printer,
  Plus,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import { A4InvoiceDocument } from "@/components/billing/A4InvoiceDocument";
import PaymentLinkGeneratorModal from "@/components/billing/PaymentLinkGeneratorModal";

interface DoctorInvoice {
  _id: string;
  invoiceNumber: string;
  patientId?: {
    _id: string;
    patientCode: string;
    fullName: string;
    phone?: string;
    email?: string;
  };
  appointmentId?: {
    _id: string;
    appointmentCode: string;
    serviceName: string;
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    mode: string;
  };
  totalAmount: number;
  paidAmount: number;
  balanceAmount?: number;
  status: string;
  paymentMethod?: string;
  issueDate: string;
  createdAt?: string;
  items?: Array<{ description: string; amount: number; quantity: number }>;
}

interface DoctorBillingSummary {
  totalConsultationBilled: number;
  totalConsultationCollected: number;
  totalPendingDues: number;
  paidCount: number;
  pendingCount: number;
}

export function DoctorBillingTab() {
  const [invoices, setInvoices] = useState<DoctorInvoice[]>([]);
  const [summary, setSummary] = useState<DoctorBillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<DoctorInvoice | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  const showNotification = useCallback((msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchDoctorBilling = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{
        invoices: DoctorInvoice[];
        summary: DoctorBillingSummary;
        total: number;
      }>("/doctor/billing?limit=100");

      if (res.data) {
        setInvoices(res.data.invoices || []);
        setSummary(res.data.summary || null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load doctor billing records";
      showNotification(msg, true);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchDoctorBilling();
  }, [fetchDoctorBilling]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = inv.invoiceNumber?.toLowerCase() || "";
        const pName = inv.patientId?.fullName?.toLowerCase() || "";
        const pCode = inv.patientId?.patientCode?.toLowerCase() || "";
        const apptCode = inv.appointmentId?.appointmentCode?.toLowerCase() || "";
        const sName = inv.appointmentId?.serviceName?.toLowerCase() || "";
        if (!num.includes(q) && !pName.includes(q) && !pCode.includes(q) && !apptCode.includes(q) && !sName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const handleDownloadInvoicePdf = (invoiceId: string) => {
    const token = getToken() || "";
    const baseUrl = getBaseUrl();
    window.open(`${baseUrl}/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token)}`, "_blank");
    showNotification("Downloading official invoice PDF...");
  };

  const handleDownloadReceiptPdf = (invoiceId: string) => {
    const token = getToken() || "";
    const baseUrl = getBaseUrl();
    window.open(`${baseUrl}/invoices/${invoiceId}/receipt/pdf?token=${encodeURIComponent(token)}`, "_blank");
    showNotification("Downloading official receipt PDF...");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-bounce-in ${
            notification.isError
              ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
              : "bg-[#EDF8F1] border-[#A7F3D0] text-[#065F46]"
          }`}
        >
          {notification.isError ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E1E9E3] rounded-3xl p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#154734] uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Financial Workspace</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#17251E]">Consultation Billing &amp; Settlements</h2>
          <p className="text-xs text-[#65746B] mt-0.5">
            Monitor verified consultation fee billings, patient settlement statuses, and official GST tax receipts.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowPaymentLinkModal(true)}
            className="px-4 py-2 bg-[#154734] text-white hover:bg-[#0f3426] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Payment Link</span>
          </button>
          <button
            type="button"
            onClick={fetchDoctorBilling}
            disabled={isLoading}
            className="px-4 py-2 bg-[#EDF8F1] text-[#154734] hover:bg-[#D5EFE0] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#EDF8F1] border border-[#CDE5D6] rounded-3xl p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#154734] flex items-center justify-center font-bold shadow-2xs border border-[#A8DAC0]">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#65746B] block">Total Invoiced Consultation</span>
              <span className="text-2xl font-extrabold text-[#17251E] font-mono">
                ₹{(summary?.totalConsultationBilled || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#154734] font-bold block mt-3">
            Across {invoices.length} consultation encounters
          </span>
        </div>

        <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-3xl p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#16A34A] flex items-center justify-center font-bold shadow-2xs border border-[#BBF7D0]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#65746B] block">Collected / Cleared</span>
              <span className="text-2xl font-extrabold text-[#15803D] font-mono">
                ₹{(summary?.totalConsultationCollected || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#16A34A] font-bold block mt-3">
            ✓ {summary?.paidCount || 0} Fully settled invoices
          </span>
        </div>

        <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-3xl p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#D97706] flex items-center justify-center font-bold shadow-2xs border border-[#FDE68A]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#65746B] block">Outstanding Patient Dues</span>
              <span className="text-2xl font-extrabold text-[#B45309] font-mono">
                ₹{(summary?.totalPendingDues || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#D97706] font-bold block mt-3">
            {summary?.pendingCount || 0} Pending patient settlements
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E1E9E3] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "All Bills" },
            { id: "paid", label: "Paid" },
            { id: "pending", label: "Pending" },
            { id: "partially_paid", label: "Partially Paid" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === f.id
                  ? "bg-[#154734] text-white shadow-xs font-bold"
                  : "bg-[#F8FAFC] text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice, patient, code..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#154734]"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-[#E1E9E3] rounded-3xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-7 h-7 text-[#154734] animate-spin mb-2" />
            <p className="text-xs text-[#65746B]">Loading consultation invoices from MongoDB...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#65746B] space-y-1">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">No consultation invoices found</p>
            <p>Invoices created for your appointments and clinical consultations will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#17251E]">
              <thead className="bg-[#FAFCFB] border-b border-[#E1E9E3] text-[11px] font-bold text-[#65746B] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Invoice Number</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Encounter Details</th>
                  <th className="py-3.5 px-4">Total Fee</th>
                  <th className="py-3.5 px-4">Settlement Status</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E9E3]">
                {filteredInvoices.map((inv) => {
                  const bal =
                    inv.balanceAmount !== undefined
                      ? inv.balanceAmount
                      : Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));

                  return (
                    <tr key={inv._id} className="hover:bg-[#FAFCFB] transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#154734]">
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">
                          {inv.patientId?.fullName || "Clinical Patient"}
                        </div>
                        {inv.patientId?.patientCode && (
                          <div className="text-[10px] font-mono text-gray-400">
                            {inv.patientId.patientCode}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">
                          {inv.appointmentId?.serviceName || inv.items?.[0]?.description || "Consultation Encounter"}
                        </div>
                        {inv.appointmentId?.appointmentCode && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            {inv.appointmentId.appointmentCode} • {inv.appointmentId.mode || "Online"}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-extrabold text-[#17251E]">
                          ₹{(inv.totalAmount || 0).toLocaleString("en-IN")}
                        </span>
                        {bal > 0 && (
                          <span className="block text-[10px] text-[#B45309] font-semibold">
                            Due: ₹{bal.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            inv.status === "paid"
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : inv.status === "partially_paid"
                              ? "bg-[#FEF3C7] text-[#B45309]"
                              : "bg-[#FEE2E2] text-[#991B1B]"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                        {new Date(inv.issueDate || inv.createdAt || Date.now()).toLocaleDateString("en-IN")}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Receipt Slip Icon */}
                          <button
                            type="button"
                            onClick={() => {
                              setAutoPrintInvoice(false);
                              setViewingInvoice(inv);
                            }}
                            className="w-8 h-8 rounded-xl bg-[#EDF8F1] hover:bg-[#D5E8DC] text-[#087443] flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
                            title="View Billing Receipt Slip"
                            aria-label="View Receipt"
                          >
                            <Eye className="w-4 h-4 transition-transform group-hover:scale-110" />
                          </button>

                          {/* Download / Print Receipt Icon */}
                          <button
                            type="button"
                            onClick={() => {
                              setAutoPrintInvoice(true);
                              setViewingInvoice(inv);
                            }}
                            className="w-8 h-8 rounded-xl bg-[#F4FAF6] hover:bg-[#E4EEE7] text-[#064A2D] border border-[#D5E2D9] flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
                            title="Download / Print Receipt"
                            aria-label="Download or Print Receipt"
                          >
                            <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Link Generator Modal */}
      {showPaymentLinkModal && (
        <PaymentLinkGeneratorModal
          isOpen={showPaymentLinkModal}
          onClose={() => setShowPaymentLinkModal(false)}
          onSuccess={() => {
            fetchDoctorBilling();
            showNotification("Payment link generated and dispatched successfully!");
          }}
          userRole="doctor"
        />
      )}

      {/* A4 Tax Invoice / Billing Slip Modal View */}
      {viewingInvoice && (
        <A4InvoiceDocument
          invoice={viewingInvoice}
          autoPrint={autoPrintInvoice}
          onClose={() => {
            setViewingInvoice(null);
            setAutoPrintInvoice(false);
          }}
        />
      )}
    </div>
  );
}
