"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Download,
  Printer,
  CreditCard,
  Receipt as ReceiptIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
  FileText,
  Search,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { api, getToken, getBaseUrl } from "@/lib/api/client";
import {
  A4PaymentReceipt,
  BillingReceiptModal,
  PaymentReceiptData,
  ReceiptItem,
} from "@/components/billing/A4PaymentReceipt";
import {
  A4InvoiceDocument,
  InvoiceDocumentData,
} from "@/components/billing/A4InvoiceDocument";

interface InvoiceItem {
  description: string;
  details?: string;
  quantity?: number;
  unitPrice?: number;
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
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  items: InvoiceItem[];
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  doctorId?: {
    _id?: string;
    userId?: { name?: string };
    name?: string;
    qualifications?: string;
    specialization?: string;
  };
  appointmentId?: {
    _id?: string;
    appointmentCode?: string;
    serviceName?: string;
    appointmentDate?: string;
    consultationMode?: string;
  };
}

interface PaymentRecord {
  _id: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentProvider: string;
  providerTransactionId?: string;
  status: "initiated" | "pending" | "success" | "failed" | "refunded";
  paidAt?: string;
  createdAt: string;
  invoiceId?: {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
  };
  receiptId?: {
    _id: string;
    receiptNumber: string;
  };
}

interface ReceiptRecord {
  _id: string;
  receiptNumber: string;
  amountReceived: number;
  currency: string;
  paymentMethod: string;
  providerTransactionId?: string;
  issuedAt: string;
  status: string;
  invoiceId?: {
    _id: string;
    invoiceNumber: string;
  };
  appointmentId?: {
    serviceName?: string;
    appointmentDate?: string;
  };
  doctorId?: {
    userId?: { name?: string };
    name?: string;
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

interface BillingSummary {
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  unpaidCount: number;
  settledCount: number;
}

export default function PaymentsInvoicesPage() {
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "receipts" | "refunds">("invoices");

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Document Modals
  const [activeInvoice, setActiveInvoice] = useState<InvoiceDocumentData | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptData | null>(null);
  const [autoPrintModal, setAutoPrintModal] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  // Pay Now State & Modal
  const [checkoutModalInvoice, setCheckoutModalInvoice] = useState<InvoiceRecord | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<{
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedInvoiceForRefund, setSelectedInvoiceForRefund] = useState<InvoiceRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(500);
  const [refundReason, setRefundReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);

  // Filter/Search
  const [searchQuery, setSearchQuery] = useState("");

  const [refreshCount, setRefreshCount] = useState(0);
  const refetchFinancials = useCallback(() => {
    setRefreshCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadAllBillingData = async () => {
      try {
        setLoading(true);
        const [invRes, payRes, recRes, refRes, sumRes] = await Promise.all([
          api.get<{ invoices: InvoiceRecord[] }>("/patient/me/invoices"),
          api.get<{ payments: PaymentRecord[] }>("/patient/me/payments"),
          api.get<{ receipts: ReceiptRecord[] }>("/patient/me/receipts"),
          api.get<{ refundRequests: RefundRequest[] }>("/patient/me/refund-requests"),
          api.get<{ summary: BillingSummary }>("/patient/me/billing-summary"),
        ]);

        if (isMounted) {
          if (invRes.success && invRes.data) {
            setInvoices(invRes.data.invoices || []);
          }
          if (payRes.success && payRes.data) {
            setPayments(payRes.data.payments || []);
          }
          if (recRes.success && recRes.data) {
            setReceipts(recRes.data.receipts || []);
          }
          if (refRes.success && refRes.data) {
            setRefundRequests(refRes.data.refundRequests || []);
          }
          if (sumRes.success && sumRes.data?.summary) {
            setSummary(sumRes.data.summary);
          }
        }
      } catch (err) {
        console.error("Failed to fetch billing data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAllBillingData();
    return () => {
      isMounted = false;
    };
  }, [refreshCount]);

  // Derived or backend summary metrics
  const totalInvoiced = summary ? summary.totalInvoiced : invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalPaid = summary ? summary.totalPaid : invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const outstandingBalance = summary
    ? summary.outstandingBalance
    : invoices.reduce((acc, i) => {
        if (i.status === "pending" || i.status === "partially_paid") {
          return acc + (i.balanceAmount !== undefined ? i.balanceAmount : Math.max(0, i.totalAmount - (i.paidAmount || 0)));
        }
        return acc;
      }, 0);
  const settledCount = summary ? summary.settledCount : invoices.filter((i) => i.status === "paid").length;

  // View Invoice Document Handler
  const handleOpenInvoice = (inv: InvoiceRecord) => {
    const formatted: InvoiceDocumentData = {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate || inv.createdAt,
      dueDate: inv.dueDate,
      patientName: inv.patientId?.fullName || "Valued Patient",
      patientCode: inv.patientId?.patientCode || "—",
      patientPhone: inv.patientId?.phone || "—",
      patientEmail: inv.patientId?.email,
      patientAddress: inv.patientId?.address,
      doctorName: inv.doctorId?.userId?.name || inv.doctorId?.name || "Consultant Care Team",
      doctorQualifications: inv.doctorId?.qualifications,
      doctorSpecialization: inv.doctorId?.specialization,
      serviceName: inv.items?.[0]?.description || "Clinical Consultation",
      appointmentCode: inv.appointmentId?.appointmentCode,
      appointmentDateTime: inv.appointmentId?.appointmentDate
        ? new Date(inv.appointmentId.appointmentDate).toLocaleDateString("en-GB")
        : undefined,
      appointmentMode: inv.appointmentId?.consultationMode || "Clinical Consultation",
      items: inv.items && inv.items.length > 0
        ? inv.items.map((it) => ({
            description: it.description,
            details: it.details,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || it.amount,
            amount: it.amount,
          }))
        : [
            {
              description: inv.items?.[0]?.description || "Consultation & Healthcare Services",
              quantity: 1,
              unitPrice: inv.totalAmount,
              amount: inv.totalAmount,
            },
          ],
      currency: "INR",
      subtotal: inv.totalAmount,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount || 0,
      balanceAmount: inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, inv.totalAmount - (inv.paidAmount || 0)),
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      paidAt: inv.paidAt,
    };
    setActiveInvoice(formatted);
  };

  // View Receipt Document Handler
  const handleOpenReceipt = async (inv: InvoiceRecord) => {
    try {
      setLoadingReceiptId(inv._id);
      setActiveReceipt(null);

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
          doctorName: r.doctorName || inv.doctorId?.userId?.name || inv.doctorId?.name || "Consultant Doctor",
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
        alert("Receipt not available: No verified payment record found for this invoice.");
      }
    } catch (err: unknown) {
      console.error("Failed to load receipt:", err);
      alert("Failed to load official receipt. Please try again.");
    } finally {
      setLoadingReceiptId(null);
    }
  };

  // Download Server-Generated Invoice PDF
  const handleDownloadInvoicePdf = (inv: InvoiceRecord) => {
    const token = getToken();
    const apiUrl = getBaseUrl();
    const url = `${apiUrl}/invoices/${inv._id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    window.open(url, "_blank");
  };

  // Download Server-Generated Receipt PDF
  const handleDownloadReceiptPdf = (receiptOrInvoiceId: string) => {
    const token = getToken();
    const apiUrl = getBaseUrl();
    const url = `${apiUrl}/receipts/${receiptOrInvoiceId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    window.open(url, "_blank");
  };

  // -------------------------------------------------------------
  // Pay Now Initiation: Razorpay Order Creation & Checkout
  // -------------------------------------------------------------
  const handleInitiatePayNow = async (inv: InvoiceRecord) => {
    try {
      setIsInitiatingPayment(true);
      setCheckoutModalInvoice(inv);

      const res = await api.post<{
        orderId: string;
        paymentId: string;
        amount: number;
        currency: string;
        keyId: string;
        mode: string;
      }>(`/invoices/${inv._id}/payments/create-order`, {
        amount: inv.balanceAmount,
        paymentMethod: "upi",
      });

      if (res.success && res.data) {
        setCheckoutOrder(res.data);

        // Dynamically load and trigger Razorpay SDK when client-side
        if (typeof window !== "undefined" && res.data.keyId) {
          const loadRazorpay = () =>
            new Promise<boolean>((resolve) => {
              if ((window as any).Razorpay) return resolve(true);
              const script = document.createElement("script");
              script.src = "https://checkout.razorpay.com/v1/checkout.js";
              script.async = true;
              script.onload = () => resolve(true);
              script.onerror = () => resolve(false);
              document.body.appendChild(script);
            });

          const loaded = await loadRazorpay();
          if (loaded && (window as any).Razorpay && !res.data.keyId.includes("mock")) {
            const options = {
              key: res.data.keyId,
              amount: Math.round(res.data.amount * 100),
              currency: res.data.currency || "INR",
              name: "TriGyna Health & Wellness",
              description: `Payment for Invoice #${inv.invoiceNumber}`,
              order_id: res.data.orderId,
              handler: (resp: any) => {
                handleCompletePaymentVerification(
                  resp.razorpay_signature,
                  resp.razorpay_payment_id
                );
              },
              prefill: {
                name: inv.patientId?.fullName || "",
                email: inv.patientId?.email || "",
                contact: inv.patientId?.phone || "",
              },
              theme: {
                color: "#154734",
              },
            };
            try {
              const rzp = new (window as any).Razorpay(options);
              rzp.open();
            } catch (openErr) {
              console.warn("Razorpay popup could not open directly; fallback modal available", openErr);
            }
          }
        }
      } else {
        alert(res.message || "Unable to initiate payment order");
        setCheckoutModalInvoice(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Payment initialization failed");
      setCheckoutModalInvoice(null);
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  // Complete Payment Verification (Razorpay Checkout return or test completion)
  const handleCompletePaymentVerification = async (
    simulatedSignature?: string,
    customPaymentId?: string
  ) => {
    if (!checkoutOrder || !checkoutModalInvoice) return;

    try {
      setIsVerifyingPayment(true);
      const signature = simulatedSignature || `rzp_test_sig_${checkoutOrder.orderId}`;
      const providerPaymentId = customPaymentId || `pay_${Date.now()}`;

      const res = await api.post<{
        payment: PaymentRecord;
        receipt: PaymentReceiptData;
        invoice: InvoiceRecord;
      }>("/invoices/payments/verify", {
        paymentId: checkoutOrder.paymentId,
        orderId: checkoutOrder.orderId,
        razorpay_order_id: checkoutOrder.orderId,
        razorpay_payment_id: providerPaymentId,
        razorpay_signature: signature,
        providerTransactionId: providerPaymentId,
        providerSignature: signature,
        status: "success",
      });

      if (res.success) {
        setPaymentSuccessMessage(`Payment of ₹${checkoutOrder.amount.toLocaleString()} verified successfully!`);
        setTimeout(() => {
          setCheckoutOrder(null);
          setCheckoutModalInvoice(null);
          setPaymentSuccessMessage(null);
          refetchFinancials();
          if (res.data?.receipt) {
            setActiveReceipt(res.data.receipt);
          }
        }, 1200);
      } else {
        alert(res.message || "Payment verification failed");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Payment verification failed");
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Submit Refund Request Handler
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForRefund) return;

    setSubmittingRefund(true);
    try {
      const res = await api.post("/patient/me/refund-requests", {
        invoiceId: selectedInvoiceForRefund._id,
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

  // Filtered lists
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter((i) => i.invoiceNumber.toLowerCase().includes(q) || i.status.toLowerCase().includes(q));
  }, [invoices, searchQuery]);

  return (
    <div className="animate-in fade-in duration-200 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E4EEE7]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#14251F] tracking-tight">
            My Billing, Invoices &amp; Receipts
          </h1>
          <p className="text-xs md:text-sm text-[#68766F] mt-0.5">
            View your healthcare billing history, download official tax invoices, and access payment receipts
          </p>
        </div>

        <button
          onClick={refetchFinancials}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E9E3] hover:bg-gray-50 text-xs font-semibold text-[#154734] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Financial Status KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFBF3] border border-[#F6EBD9] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#7A6348] uppercase tracking-wider block">
            Outstanding Due
          </span>
          <p className="text-2xl font-bold font-mono text-[#14251F] mt-1">₹{outstandingBalance.toLocaleString()}</p>
          <p className="text-[11px] text-[#075B35] font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified balance ledger</span>
          </p>
        </div>

        <div className="bg-white border border-[#E4EEE7] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#68766F] uppercase tracking-wider block">
            Total Invoiced
          </span>
          <p className="text-2xl font-bold font-mono text-[#14251F] mt-1">₹{totalInvoiced.toLocaleString()}</p>
          <p className="text-[11px] text-[#68766F] mt-2">{invoices.length} issued statements</p>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Amount Paid
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-900 mt-1">₹{totalPaid.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">Verified payments to date</p>
        </div>

        <div className="bg-white border border-[#E4EEE7] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-[#68766F] uppercase tracking-wider block">
            Settled Invoices
          </span>
          <p className="text-2xl font-bold font-mono text-[#154734] mt-1">
            {settledCount} <span className="text-xs text-[#68766F] font-normal">/ {invoices.length}</span>
          </p>
          <p className="text-[11px] text-[#68766F] mt-2">With official digital receipts</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E4EEE7] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "invoices"
              ? "bg-[#154734] text-white shadow-xs"
              : "text-[#68766F] hover:bg-gray-100 hover:text-[#18231D]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "payments"
              ? "bg-[#154734] text-white shadow-xs"
              : "text-[#68766F] hover:bg-gray-100 hover:text-[#18231D]"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>My Payments ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("receipts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "receipts"
              ? "bg-[#154734] text-white shadow-xs"
              : "text-[#68766F] hover:bg-gray-100 hover:text-[#18231D]"
          }`}
        >
          <ReceiptIcon className="w-4 h-4" />
          <span>My Receipts ({receipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("refunds")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "refunds"
              ? "bg-[#154734] text-white shadow-xs"
              : "text-[#68766F] hover:bg-gray-100 hover:text-[#18231D]"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Refunds ({refundRequests.length})</span>
        </button>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-3xl border border-[#E4EEE7] p-5 lg:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-base font-serif font-bold text-[#14251F]">
              Itemized Healthcare Invoices
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E2E9E3] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#154734]"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#68766F] flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#154734]" />
              <span>Loading authentic billing ledger...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8C9892]">No invoice records found.</div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Service / Consultation</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Balance</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {filteredInvoices.map((inv) => {
                    const isSettled = inv.status === "paid";
                    const hasBalance = (inv.balanceAmount || inv.totalAmount - (inv.paidAmount || 0)) > 0;

                    return (
                      <tr key={inv._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#154734]">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 text-[#68766F]">
                          {new Date(inv.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#18231D]">
                            {inv.items?.[0]?.description || "Clinical Healthcare Service"}
                          </div>
                          {inv.doctorId && (
                            <div className="text-[11px] text-[#68756D]">
                              {inv.doctorId.userId?.name || inv.doctorId.name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-right text-[#18231D]">
                          ₹{inv.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono text-right text-emerald-700 font-semibold">
                          ₹{(inv.paidAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono text-right text-amber-700 font-semibold">
                          ₹{(inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount - (inv.paidAmount || 0)).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isSettled
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : inv.status === "partially_paid"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : inv.status === "refunded"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {inv.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pay Now Button */}
                            {hasBalance && inv.status !== "cancelled" && inv.status !== "refunded" && (
                              <button
                                onClick={() => handleInitiatePayNow(inv)}
                                disabled={isInitiatingPayment}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                                title="Pay outstanding balance online"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay Now</span>
                              </button>
                            )}

                            {/* View Billing Receipt Slip */}
                            <button
                              onClick={() => {
                                setAutoPrintModal(false);
                                if (isSettled || inv.paidAmount > 0) {
                                  handleOpenReceipt(inv);
                                } else {
                                  handleOpenInvoice(inv);
                                }
                              }}
                              className="w-8 h-8 rounded-xl bg-[#EDF8F1] hover:bg-[#D5E8DC] text-[#087443] flex items-center justify-center transition cursor-pointer shadow-2xs group"
                              title="View Billing Receipt Slip"
                            >
                              <Eye className="w-4 h-4 transition-transform group-hover:scale-110" />
                            </button>

                            {/* Download / Print Receipt PDF */}
                            <button
                              onClick={() => {
                                setAutoPrintModal(true);
                                if (isSettled || inv.paidAmount > 0) {
                                  handleOpenReceipt(inv);
                                } else {
                                  handleOpenInvoice(inv);
                                }
                              }}
                              className="w-8 h-8 rounded-xl bg-[#F4FAF6] hover:bg-[#E4EEE7] text-[#064A2D] border border-[#D5E2D9] flex items-center justify-center transition cursor-pointer shadow-2xs group"
                              title="Download / Print Receipt"
                            >
                              <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
                            </button>

                            {/* Refund Action */}
                            {isSettled && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForRefund(inv);
                                  setRefundAmount(inv.totalAmount);
                                  setRefundModalOpen(true);
                                }}
                                className="text-[11px] font-semibold text-gray-400 hover:text-red-600 transition ml-1"
                                title="Request Refund"
                              >
                                Refund
                              </button>
                            )}
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
      )}

      {/* TAB 2: PAYMENTS */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-3xl border border-[#E4EEE7] p-5 lg:p-6 shadow-xs space-y-4">
          <h3 className="text-base font-serif font-bold text-[#14251F]">
            Payment Ledger &amp; Transaction History
          </h3>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#68756D] flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#154734]" />
              <span>Loading payment history...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8C9892]">No payment records found.</div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Payment #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Method / Provider</th>
                    <th className="py-3 px-3">Transaction Ref</th>
                    <th className="py-3 px-3 text-right">Amount (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#154734]">{p.paymentNumber}</td>
                      <td className="py-3 px-3 text-[#68756D]">
                        {new Date(p.paidAt || p.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#087443] font-semibold">
                        {p.invoiceId?.invoiceNumber || "—"}
                      </td>
                      <td className="py-3 px-3 uppercase text-[#18231D] font-medium">
                        {p.paymentMethod} • <span className="text-[#68756D] text-[11px]">{p.paymentProvider}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#68756D]">
                        {p.providerTransactionId || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-emerald-800">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            p.status === "success"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : p.status === "failed"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECEIPTS */}
      {activeTab === "receipts" && (
        <div className="bg-white rounded-3xl border border-[#E4EEE7] p-5 lg:p-6 shadow-xs space-y-4">
          <h3 className="text-base font-serif font-bold text-[#14251F]">
            Official Verified Receipts
          </h3>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#68756D] flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#154734]" />
              <span>Loading receipts...</span>
            </div>
          ) : receipts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8C9892]">No receipts generated yet.</div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Receipt #</th>
                    <th className="py-3 px-3">Issued Date</th>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Payment Method</th>
                    <th className="py-3 px-3 text-right">Amount Received</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {receipts.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#154734]">{r.receiptNumber}</td>
                      <td className="py-3 px-3 text-[#68756D]">
                        {new Date(r.issuedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#087443] font-semibold">
                        {r.invoiceId?.invoiceNumber || "—"}
                      </td>
                      <td className="py-3 px-3 uppercase text-[#18231D] font-medium">{r.paymentMethod || "UPI"}</td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-emerald-800">
                        ₹{r.amountReceived.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {r.status || "ISSUED"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              try {
                                setLoadingReceiptId(r._id);
                                const res = await api.get<{ receipt: PaymentReceiptData }>(`/receipts/${r._id}`);
                                if (res.success && res.data?.receipt) {
                                  setActiveReceipt(res.data.receipt);
                                }
                              } finally {
                                setLoadingReceiptId(null);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#154734] hover:bg-emerald-50 transition cursor-pointer"
                            title="View A4 Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadReceiptPdf(r._id)}
                            className="p-1.5 rounded-lg text-[#087443] hover:bg-emerald-50 transition cursor-pointer"
                            title="Download PDF"
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
          )}
        </div>
      )}

      {/* TAB 4: REFUNDS */}
      {activeTab === "refunds" && (
        <div className="bg-white rounded-3xl border border-[#E4EEE7] p-5 lg:p-6 shadow-xs space-y-4">
          <h3 className="text-base font-serif font-bold text-[#14251F]">
            My Refund Requests
          </h3>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#68756D] flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#154734]" />
              <span>Loading refund requests...</span>
            </div>
          ) : refundRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8C9892]">No refund requests filed.</div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E9E3] bg-[#F7F9F7] text-[#68756D] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Request #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3 text-right">Requested (₹)</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E9E3]">
                  {refundRequests.map((ref) => (
                    <tr key={ref._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#154734]">
                        {ref.refundNumber || ref.requestNumber || "REF-REQ"}
                      </td>
                      <td className="py-3 px-3 text-[#68756D]">
                        {new Date(ref.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#087443]">
                        {ref.invoiceId?.invoiceNumber || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-[#18231D]">
                        ₹{(ref.requestedAmount || ref.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-[#68756D] max-w-xs truncate">{ref.reason}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            ref.status === "approved" || ref.status === "processed"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : ref.status === "rejected"
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {ref.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RAZORPAY / SANDBOX PAYMENT CHECKOUT MODAL */}
      {checkoutOrder && checkoutModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E2E9E3] overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E9E3]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#154734]" />
                <h3 className="font-serif font-bold text-base text-[#18231D]">TriGyna Payment Gateway</h3>
              </div>
              <button
                onClick={() => {
                  setCheckoutOrder(null);
                  setCheckoutModalInvoice(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#F7F9F7] p-4 rounded-2xl border border-[#E2E9E3] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#68756D]">Invoice Reference</span>
                <span className="font-mono font-bold text-[#154734]">{checkoutModalInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68756D]">Order ID</span>
                <span className="font-mono text-[#68756D]">{checkoutOrder.orderId}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#18231D] pt-2 border-t border-[#E2E9E3]">
                <span>Payable Amount</span>
                <span className="font-mono text-[#154734]">₹{checkoutOrder.amount.toLocaleString()}</span>
              </div>
            </div>

            {paymentSuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-emerald-900 text-xs">{paymentSuccessMessage}</p>
                <p className="text-[11px] text-emerald-700">Generating and loading official receipt...</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleCompletePaymentVerification()}
                  disabled={isVerifyingPayment}
                  className="w-full py-3 px-4 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {isVerifyingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Payment Signature...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify &amp; Authorize ₹{checkoutOrder.amount.toLocaleString()} Payment</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-[#68756D] text-center">
                  Protected by 256-bit SSL encryption &amp; authoritative HMAC server verification.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* A4 INVOICE PREVIEW MODAL */}
      {activeInvoice && (
        <A4InvoiceDocument
          data={activeInvoice}
          autoPrint={autoPrintModal}
          onClose={() => {
            setActiveInvoice(null);
            setAutoPrintModal(false);
          }}
          onPayNow={() => {
            const originalInv = invoices.find((i) => i._id === activeInvoice._id);
            if (originalInv) {
              setActiveInvoice(null);
              handleInitiatePayNow(originalInv);
            }
          }}
        />
      )}

      {/* PREMIUM BILLING RECEIPT MODAL */}
      {activeReceipt && (
        <BillingReceiptModal
          receiptData={activeReceipt}
          showActions={true}
          autoPrint={autoPrintModal}
          onClose={() => {
            setActiveReceipt(null);
            setAutoPrintModal(false);
          }}
          onDownloadPdf={() => handleDownloadReceiptPdf(activeReceipt._id || activeReceipt.receiptNumber)}
        />
      )}

      {/* REFUND REQUEST MODAL */}
      {refundModalOpen && selectedInvoiceForRefund && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-serif font-bold text-base text-[#14251F]">Request Refund</h3>
              <button onClick={() => setRefundModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundSuccess ? (
              <div className="py-6 text-center text-emerald-700 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p className="font-semibold text-xs">Refund Request Submitted Successfully!</p>
                <p className="text-[11px] text-gray-500">Our finance desk will review it within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-medium text-gray-700 block mb-1">Invoice</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedInvoiceForRefund.invoiceNumber} (Total ₹${selectedInvoiceForRefund.totalAmount})`}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-500"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700 block mb-1">Refund Amount (₹)</label>
                  <input
                    type="number"
                    max={selectedInvoiceForRefund.totalAmount}
                    min={1}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-[#154734] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700 block mb-1">Reason for Refund</label>
                  <textarea
                    rows={3}
                    placeholder="Provide reason for refund request..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-[#154734] focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRefundModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="px-4 py-2 bg-emerald-800 text-white rounded-xl font-medium hover:bg-emerald-900 cursor-pointer"
                  >
                    {submittingRefund ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
