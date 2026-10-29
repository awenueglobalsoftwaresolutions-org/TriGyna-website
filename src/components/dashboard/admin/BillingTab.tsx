"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Search,
  RefreshCw,
  Printer,
  Download,
  Loader2,
  Receipt,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patientId?: {
    _id?: string;
    fullName: string;
    patientCode: string;
    phone?: string;
    email?: string;
  };
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "paid" | "partially_paid" | "pending" | "refunded" | "cancelled";
  paymentMethod?: string;
  items?: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>;
  createdAt: string;
}

interface BillingTabProps {
  invoices: Invoice[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewReceipt: (inv: Invoice) => void;
  onDownloadPdf: (inv: Invoice) => void;
  loadingReceiptId: string | null;
}

export function BillingTab({
  invoices,
  isLoading,
  onRefresh,
  onViewReceipt,
  onDownloadPdf,
  loadingReceiptId,
}: BillingTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  React.useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.balanceAmount || 0), 0);
  const paidCount = invoices.filter((inv) => inv.status === "paid").length;

  const filteredInvoices = invoices.filter((inv) => {
    const invNo = inv.invoiceNumber?.toLowerCase() || "";
    const pName = inv.patientId?.fullName?.toLowerCase() || "";
    const pCode = inv.patientId?.patientCode?.toLowerCase() || "";
    const pPhone = inv.patientId?.phone || "";
    const q = search.toLowerCase();

    const matchesSearch = invNo.includes(q) || pName.includes(q) || pCode.includes(q) || pPhone.includes(q);
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154734]/10 text-[#154734] flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#18231D]">Billing &amp; Revenue Operations</h2>
              <p className="text-xs text-[#68756D] mt-0.5">
                Financial accounts, patient invoices, revenue collections, and official digital receipts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3.5 py-2 border border-[#E2E9E3] hover:bg-gray-50 text-[#154734] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              title="Refresh Billing Records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Records</span>
            </button>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#E2E9E3]">
          <div className="p-4 bg-[#F7F9F7] border border-[#E2E9E3] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#68756D] uppercase tracking-wider">Total Invoiced</span>
              <p className="text-xl font-bold font-mono text-[#18231D] mt-1">₹{totalInvoiced.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-[#18231D] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">Collected Revenue</span>
              <p className="text-xl font-bold font-mono text-emerald-900 mt-1">₹{totalCollected.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wider">Outstanding Balance</span>
              <p className="text-xl font-bold font-mono text-amber-900 mt-1">₹{totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-blue-800 uppercase tracking-wider">Settled Invoices</span>
              <p className="text-xl font-bold font-mono text-blue-900 mt-1">
                {paidCount} <span className="text-xs text-[#68756D] font-normal">/ {invoices.length}</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-5 pt-4 border-t border-[#E2E9E3] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Invoice #, patient name, patient code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E9E3] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none bg-white text-[#18231D]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-[#E2E9E3] rounded-xl bg-white text-[#18231D] focus:outline-none font-medium"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid (Fully Settled)</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="pending">Pending Payment</option>
              <option value="refunded">Refunded</option>
            </select>
            <span className="text-xs text-[#68756D] font-medium pl-2 hidden sm:inline">
              {filteredInvoices.length} invoices
            </span>
          </div>
        </div>
      </div>

      {/* Invoices List / Table */}
      <div className="bg-white rounded-2xl border border-[#E2E9E3] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
            <span>Loading verified invoices...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#68756D] flex flex-col items-center gap-2">
            <Receipt className="w-8 h-8 text-gray-300" />
            <p className="font-medium text-[#18231D]">No invoice records found</p>
            <p className="text-[11px] text-[#68756D]">No billing records matched your search filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Invoiced Date</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Paid Amount</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-[#F7F9F7]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#154734]">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-[#68756D]">
                        {new Date(inv.createdAt).toISOString().split("T")[0]}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#18231D]">{inv.patientId?.fullName || "Patient"}</div>
                        <div className="text-[11px] text-[#68756D] font-mono mt-0.5">
                          {inv.patientId?.patientCode || "—"} {inv.patientId?.phone ? `• ${inv.patientId.phone}` : ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-right text-[#18231D]">
                        ₹{inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-right text-emerald-700">
                        ₹{inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-right text-amber-700">
                        ₹{inv.balanceAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            inv.status === "paid"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : inv.status === "partially_paid"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : inv.status === "refunded"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewReceipt(inv)}
                            disabled={loadingReceiptId === inv._id}
                            className="p-1.5 rounded-lg text-[#154734] hover:bg-emerald-50 transition cursor-pointer border border-transparent hover:border-emerald-200"
                            title="View &amp; Print Official A4 Receipt"
                          >
                            {loadingReceiptId === inv._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => onDownloadPdf(inv)}
                            className="p-1.5 rounded-lg text-[#154734] hover:bg-emerald-50 transition cursor-pointer border border-transparent hover:border-emerald-200"
                            title="Download Official PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden divide-y divide-[#E2E9E3]">
              {filteredInvoices.map((inv) => (
                <div key={inv._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#154734]">{inv.invoiceNumber}</span>
                      <h4 className="font-semibold text-sm text-[#18231D] mt-0.5">{inv.patientId?.fullName || "Patient"}</h4>
                      <p className="text-[11px] text-[#68756D] font-mono">{inv.patientId?.patientCode} • {inv.patientId?.phone || "—"}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        inv.status === "paid"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : inv.status === "partially_paid"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : inv.status === "refunded"
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] bg-[#F7F9F7] p-2.5 rounded-xl border border-[#E2E9E3]">
                    <div>
                      <span className="text-[#68756D] block">Total</span>
                      <span className="font-mono font-bold text-[#18231D]">₹{inv.totalAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#68756D] block">Paid</span>
                      <span className="font-mono font-semibold text-emerald-700">₹{inv.paidAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#68756D] block">Balance</span>
                      <span className="font-mono font-semibold text-amber-700">₹{inv.balanceAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onViewReceipt(inv)}
                      disabled={loadingReceiptId === inv._id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-[#E2E9E3] hover:bg-gray-50 text-xs font-semibold text-[#154734] cursor-pointer"
                    >
                      {loadingReceiptId === inv._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                      <span>A4 Receipt</span>
                    </button>
                    <button
                      onClick={() => onDownloadPdf(inv)}
                      className="px-4 py-1.5 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
