"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  Printer,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { api, getToken, getBaseUrl } from "@/lib/api/client";
import {
  A4PaymentReceipt,
  PaymentReceiptData,
  ReceiptItem,
} from "@/components/billing/A4PaymentReceipt";

interface InvoiceItem {
  description: string;
  quantity?: number;
  amount: number;
}

interface InvoiceRecord {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: "pending" | "paid" | "partially_paid" | "cancelled" | "refunded";
  paymentMethod?: string;
  createdAt: string;
  items: InvoiceItem[];
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
    phone?: string;
    email?: string;
  };
  doctorId?: {
    _id?: string;
    name?: string;
    qualifications?: string;
    specialization?: string;
  };
  appointmentId?: {
    _id?: string;
    serviceName?: string;
    appointmentDate?: string;
    consultationMode?: string;
  };
}

interface RefundRequest {
  _id: string;
  refundNumber?: string;
  requestNumber?: string;
  requestedAmount?: number;
  amount?: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed" | "under_review";
  createdAt: string;
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
    totalAmount?: number;
  };
}

export default function PaymentsInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(500);
  const [refundReason, setRefundReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);

  // Selected Receipt Modal for Full A4 Preview & Printing
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptData | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const [refreshCount, setRefreshCount] = useState(0);
  const refetchFinancials = useCallback(() => {
    setRefreshCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [invRes, refRes] = await Promise.all([
          api.get<{ invoices: InvoiceRecord[] }>("/patient/me/invoices"),
          api.get<{ refundRequests: RefundRequest[] }>("/patient/me/refund-requests"),
        ]);

        if (isMounted) {
          if (invRes.success && invRes.data) {
            setInvoices(invRes.data.invoices || []);
          }
          if (refRes.success && refRes.data) {
            setRefundRequests(refRes.data.refundRequests || []);
          }
        }
      } catch (err) {
        console.error("Financials fetch error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshCount]);

  let outstandingTotal = 0;
  invoices.forEach((inv) => {
    if (inv.status === "pending" || inv.status === "partially_paid") {
      outstandingTotal += inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount - (inv.paidAmount || 0);
    }
  });

  const handleOpenReceipt = async (inv: InvoiceRecord) => {
    try {
      setLoadingReceiptId(inv._id);
      setActiveReceipt(null); // Clear previous receipt to prevent flashing outdated records

      interface ApiReceiptPayload extends PaymentReceiptData {
        amountPaid?: number;
      }
      const res = await api.get<{ receipt: ApiReceiptPayload }>(`/receipts/by-invoice/${inv._id}`);
      if (res.success && res.data?.receipt) {
        const r = res.data.receipt;
        const formatted: PaymentReceiptData = {
          _id: r._id,
          receiptNumber: r.receiptNumber,
          invoiceNumber: r.invoiceNumber || inv.invoiceNumber,
          issuedAt: r.issuedAt || inv.createdAt,
          paidAt: r.paidAt || r.issuedAt,
          patientName: r.patientName || inv.patientId?.fullName || "Patient",
          patientCode: r.patientCode || inv.patientId?.patientCode || "—",
          patientPhone: r.patientPhone || inv.patientId?.phone || "—",
          patientEmail: r.patientEmail || inv.patientId?.email,
          doctorName: r.doctorName || inv.doctorId?.name || "Consultant Doctor",
          doctorQualifications: r.doctorQualifications || inv.doctorId?.qualifications || "",
          doctorSpecialization: r.doctorSpecialization || inv.doctorId?.specialization || "Women Health & Wellness",
          serviceName: r.serviceName || inv.items?.[0]?.description || "Clinical Consultation",
          appointmentDateTime: r.appointmentDateTime || (inv.appointmentId?.appointmentDate ? new Date(inv.appointmentId.appointmentDate).toLocaleDateString("en-GB") : undefined),
          duration: r.duration || "30 Minutes",
          appointmentMode: r.appointmentMode || inv.appointmentId?.consultationMode || "Clinical Consultation",
          items:
            Array.isArray(r.items) && r.items.length > 0
              ? r.items.map((it: ReceiptItem) => ({
                  description: it.description,
                  details: it.details,
                  quantity: it.quantity || 1,
                  unitPrice: it.unitPrice !== undefined ? it.unitPrice : it.amount,
                  amount: it.amount,
                }))
              : inv.items?.map((it) => ({
                  description: it.description,
                  details: it.quantity ? `Qty: ${it.quantity}` : undefined,
                  quantity: it.quantity || 1,
                  unitPrice: it.amount,
                  amount: it.amount,
                })) || [],
          paymentMethod: r.paymentMethod || (inv.paymentMethod ? inv.paymentMethod.toUpperCase() : "UPI"),
          providerTransactionId: r.providerTransactionId,
          paymentStatus: r.paymentStatus || (inv.status === "paid" ? "Paid" : inv.status),
          subtotal: r.subtotal !== undefined ? r.subtotal : inv.totalAmount,
          discountAmount: r.discountAmount || 0,
          taxRate: r.taxRate || 0,
          taxAmount: r.taxAmount || 0,
          totalAmount: r.totalAmount !== undefined ? r.totalAmount : inv.totalAmount,
          totalPaid: r.amountPaid !== undefined ? r.amountPaid : (inv.paidAmount || inv.totalAmount),
          balanceAmount: r.balanceAmount !== undefined ? r.balanceAmount : Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)),
          verificationToken: r.verificationToken,
          organization: r.organization,
        };
        setActiveReceipt(formatted);
      } else {
        alert("Receipt not available: No confirmed payment record found for this invoice.");
      }
    } catch (err: unknown) {
      console.error("Failed to load receipt:", err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || "Failed to load receipt record.";
      alert(msg);
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handleDownloadPdf = (inv: InvoiceRecord) => {
    const token = getToken();
    const apiUrl = getBaseUrl();
    const url = `${apiUrl}/receipts/by-invoice/${inv._id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    window.open(url, "_blank");
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setSubmittingRefund(true);
    try {
      const res = await api.post("/patient/me/refund-requests", {
        invoiceId: selectedInvoice._id,
        requestedAmount: Number(refundAmount),
        amount: Number(refundAmount),
        reason: refundReason,
      });

      if (res.success) {
        setRefundSuccess(true);
        setTimeout(() => {
          setRefundModalOpen(false);
          setRefundSuccess(false);
          setRefundReason("");
          refetchFinancials();
        }, 1500);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit refund request");
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className={`space-y-6 ${activeReceipt ? "print:hidden" : ""}`}>
      {/* Header */}
      <div className="pb-2 border-b border-[#E4EEE7]">
        <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
          Payments &amp; Invoices
        </h1>
        <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
          View your payment history, download official invoices, and manage receipts
        </p>
      </div>

      {/* Financial Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFBF3] border border-[#F6EBD9] rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-[#7A6348]">Total Outstanding Balance</p>
          <p className="text-3xl font-bold text-[#14251F] mt-1">₹{outstandingTotal}</p>
          <p className="text-[11px] text-[#075B35] font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All accounts currently in good standing</span>
          </p>
        </div>

        <div className="bg-white border border-[#E4EEE7] rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-[#68766F]">Total Settled Invoices</p>
          <p className="text-3xl font-bold text-[#075B35] mt-1">
            {invoices.filter((i) => i.status === "paid").length}
          </p>
          <p className="text-[11px] text-[#68766F] mt-2">Verified automated payment receipts</p>
        </div>

        <div className="bg-white border border-[#E4EEE7] rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-medium text-[#68766F]">Active Refund Requests</p>
          <p className="text-3xl font-bold text-[#14251F] mt-1">{refundRequests.length}</p>
          <p className="text-[11px] text-[#68766F] mt-2">Subject to 24-hr clinic review</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-[#E4EEE7] p-6 shadow-xs space-y-4">
        <h3 className="text-base font-serif font-bold text-[#14251F]">
          Itemized Invoices &amp; Verified Receipts
        </h3>

        {loading ? (
          <div className="py-12 text-center text-[#68766F] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-[#075B35] animate-spin" />
            <span className="text-xs">Loading billing ledger...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8C9892]">No invoices recorded.</div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-[620px] divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-xs">
              <div className="p-3.5 bg-gray-50 font-bold grid grid-cols-12 text-[#556960]">
                <span className="col-span-3">Invoice Number</span>
                <span className="col-span-3">Date</span>
                <span className="col-span-2">Amount</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>

              {invoices.map((inv) => {
                const isSettled = inv.status === "paid" || inv.status === "partially_paid" || inv.status === "refunded";
                return (
                  <div
                    key={inv._id}
                    className="p-3.5 grid grid-cols-12 items-center hover:bg-gray-50/80 transition"
                  >
                    <span className="col-span-3 font-mono font-bold text-[#075B35]">
                      {inv.invoiceNumber}
                    </span>
                    <span className="col-span-3 text-[#68766F]">
                      {new Date(inv.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="col-span-2 font-bold text-[#14251F]">₹{inv.totalAmount}</span>
                    <span className="col-span-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === "paid"
                            ? "bg-[#EDF8F1] text-[#075B35]"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </span>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {isSettled ? (
                        <>
                          <button
                            onClick={() => handleOpenReceipt(inv)}
                            disabled={loadingReceiptId === inv._id}
                            className="p-1.5 rounded-lg text-[#075B35] hover:bg-[#EDF8F1] transition cursor-pointer"
                            title="View &amp; Print A4 Receipt"
                          >
                            {loadingReceiptId === inv._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            className="p-1.5 rounded-lg text-[#087443] hover:bg-[#EDF8F1] transition cursor-pointer"
                            title="Download Official PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {inv.status === "paid" && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setRefundAmount(inv.totalAmount);
                                setRefundModalOpen(true);
                              }}
                              className="text-[11px] font-semibold text-gray-500 hover:text-red-600 transition ml-1"
                            >
                              Refund
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          Unpaid
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Refund Requests List */}
      {refundRequests.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E4EEE7] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif font-bold text-[#14251F]">
                Manual Refund Requests
              </h3>
              <p className="text-xs text-[#68766F] mt-0.5">
                Track status of payment adjustments and refund claims
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F4F8F5] text-[#075B35] border border-[#E4EEE7]">
              {refundRequests.length} {refundRequests.length === 1 ? "Request" : "Requests"}
            </span>
          </div>

          {/* Mobile View: Dedicated Responsive Cards (No cramped columns or awkward gaps) */}
          <div className="sm:hidden space-y-3">
            {refundRequests.map((rf) => {
              const displayAmount = rf.requestedAmount !== undefined ? rf.requestedAmount : (rf.amount || 0);
              const refNumber = rf.refundNumber || `REF-${new Date(rf.createdAt).getFullYear()}-${rf._id.slice(-4)}`;
              return (
                <div key={rf._id} className="p-4 bg-[#F8FAF9] rounded-2xl border border-[#E4EEE7] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#075B35] bg-[#EDF8F1] px-2 py-0.5 rounded-md">
                      {refNumber}
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rf.status === "approved" || rf.status === "processed"
                          ? "bg-[#EDF8F1] text-[#075B35]"
                          : rf.status === "rejected"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {rf.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#14251F] leading-snug">{rf.reason}</p>
                    {rf.invoiceId?.invoiceNumber && (
                      <p className="text-[11px] text-[#68766F] mt-0.5">
                        Invoice: <span className="font-mono font-medium text-[#14251F]">{rf.invoiceId.invoiceNumber}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E4EEE7]/80 text-xs">
                    <span className="text-[#68766F]">
                      {new Date(rf.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="font-bold text-sm text-[#075B35]">
                      ₹{displayAmount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Perfectly Proportioned 12-Column Table (6-2-2-2 Grid, No Awkward Gap) */}
          <div className="hidden sm:block divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-xs">
            <div className="p-3.5 bg-gray-50 font-bold grid grid-cols-12 text-[#556960] items-center">
              <span className="col-span-6">Request Details &amp; Reason</span>
              <span className="col-span-2">Date</span>
              <span className="col-span-2 text-right pr-2">Amount</span>
              <span className="col-span-2 text-right">Review Status</span>
            </div>
            {refundRequests.map((rf) => {
              const displayAmount = rf.requestedAmount !== undefined ? rf.requestedAmount : (rf.amount || 0);
              const refNumber = rf.refundNumber || `REF-${new Date(rf.createdAt).getFullYear()}-${rf._id.slice(-4)}`;
              return (
                <div key={rf._id} className="p-3.5 grid grid-cols-12 items-center hover:bg-gray-50/80 transition">
                  <div className="col-span-6 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] font-bold text-[#075B35] bg-[#EDF8F1] px-1.5 py-0.5 rounded">
                        {refNumber}
                      </span>
                      {rf.invoiceId?.invoiceNumber && (
                        <span className="text-[10px] text-[#68766F]">
                          (Inv: {rf.invoiceId.invoiceNumber})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-[#14251F] block">{rf.reason}</span>
                  </div>
                  <span className="col-span-2 text-[#68766F]">
                    {new Date(rf.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="col-span-2 text-right pr-2 font-bold text-sm text-[#14251F]">
                    ₹{displayAmount}
                  </span>
                  <div className="col-span-2 text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rf.status === "approved" || rf.status === "processed"
                          ? "bg-[#EDF8F1] text-[#075B35]"
                          : rf.status === "rejected"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {rf.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-serif font-bold text-[#14251F]">Request Invoice Refund</h3>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#075B35] mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-[#14251F]">Refund Request Logged</h4>
                <p className="text-xs text-[#68766F]">
                  Our administration will evaluate your request according to the 24-hr notice policy.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRefundSubmit} className="py-4 space-y-3 text-xs">
                <div>
                  <span className="text-[#68766F] block">Invoice:</span>
                  <span className="font-mono font-bold text-[#075B35]">
                    {selectedInvoice.invoiceNumber}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-[#14251F] block mb-1">Claimed Refund Amount (₹)</label>
                  <input
                    type="number"
                    max={selectedInvoice.totalAmount}
                    min={1}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-[#14251F] block mb-1">Reason for Refund *</label>
                  <textarea
                    rows={2}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Provide justification: consultation reschedule, technical failure, etc."
                    className="w-full p-2.5 rounded-xl border border-[#D5E8DC] bg-[#F8FAF9] text-[#14251F]"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="w-full py-2.5 bg-[#075B35] hover:bg-[#064A2D] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {submittingRefund ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Submit for Review</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      </div>

      {/* FULL A4 RECEIPT MODAL (Matching Exact User Reference Design) */}
      {activeReceipt && (
        <div className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible print:block">
          <div className="receipt-modal-dialog relative bg-white rounded-3xl max-w-[225mm] w-full p-4 sm:p-6 shadow-2xl border border-[#E4EEE7] animate-in zoom-in-95 duration-150 my-auto print:static print:p-0 print:m-0 print:max-w-none print:border-none print:rounded-none print:shadow-none print:bg-transparent">
            {/* Modal Close Button */}
            <div className="no-print flex items-center justify-between pb-3 mb-2 border-b border-[#E4EEE7]">
              <span className="text-xs font-semibold text-[#68766F]">
                Official Payment Receipt • {activeReceipt.receiptNumber}
              </span>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded A4 Receipt Component */}
              <A4PaymentReceipt
                receipt={activeReceipt}
                showActions={true}
                onDownloadPdf={() => {
                  const token = getToken();
                  const apiUrl = getBaseUrl();
                  const targetId = activeReceipt._id || activeReceipt.receiptNumber || activeReceipt.invoiceNumber;
                  window.open(`${apiUrl}/receipts/${targetId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`, "_blank");
                }}
              />
          </div>
        </div>
      )}
    </div>
  );
}
