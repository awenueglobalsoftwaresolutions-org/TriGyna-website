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
  Printer,
  RefreshCw,
  X,
  TrendingUp,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import {
  BillingReceipt,
  BillingReceiptModal,
  PaymentReceiptData,
} from "@/components/billing/BillingReceipt";

export interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  patientId?: {
    _id?: string;
    fullName?: string;
    phone?: string;
    patientCode?: string;
    email?: string;
  };
  doctorId?: {
    _id?: string;
    name?: string;
    userId?: { name?: string };
    qualifications?: string;
    specialization?: string;
  };
  appointmentId?: {
    _id?: string;
    appointmentCode?: string;
    serviceName?: string;
    appointmentDate?: string;
    mode?: string;
  };
  totalAmount: number;
  paidAmount: number;
  balanceAmount?: number;
  status: string;
  paymentMethod?: string;
  issueDate: string;
  paidAt?: string | Date;
  items?: Array<{
    description: string;
    amount: number;
    quantity: number;
    unitPrice?: number;
    details?: string;
  }>;
  subtotal?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  organizationSnapshot?: any;
}

export interface SalesOrderItem {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  consultationMode?: string;
  packageId?: {
    _id?: string;
    name?: string;
    totalSessions?: number;
    validityDays?: number;
  };
  leadId?: {
    _id?: string;
    fullName?: string;
    phone?: string;
    status?: string;
  };
  patientId?: {
    _id?: string;
    fullName?: string;
    phone?: string;
    patientCode?: string;
  };
  items: Array<{
    description: string;
    details?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  checkoutToken: string;
  paymentLink?: string;
  paymentAttempts?: Array<{
    _id?: string;
    provider: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    amount: number;
    status: string;
    attemptedAt: string;
    error?: string;
  }>;
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
    status?: string;
    totalAmount?: number;
  };
  receiptId?: {
    _id?: string;
    receiptNumber?: string;
    verificationToken?: string;
    issuedAt?: string;
  };
  createdAt: string;
}

interface SalesInvoicesTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
}

export function SalesInvoicesTab({ showNotification }: SalesInvoicesTabProps) {
  // Main view segment: Invoices vs Assisted Orders
  const [activeSection, setActiveSection] = useState<"invoices" | "orders">("invoices");

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<InvoiceItem | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<SalesOrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SalesOrderItem | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Fetch Invoices
  const fetchInvoices = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setIsLoading(true);
        else setIsRefreshing(true);

        const res = await api.get<{ invoices: InvoiceItem[] }>("/invoices?limit=100");
        if (res.data?.invoices) {
          setInvoices(res.data.invoices);
        }
      } catch {
        showNotification("Failed to load invoices and revenue ledger", true);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showNotification]
  );

  // Fetch Orders
  const fetchOrders = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setOrdersLoading(true);
        else setIsRefreshing(true);

        const res = await api.get<{ orders: SalesOrderItem[]; total: number }>("/orders?limit=100");
        if (res.data?.orders) {
          setOrders(res.data.orders);
        }
      } catch {
        showNotification("Failed to load assisted checkout orders", true);
      } finally {
        setOrdersLoading(false);
        setIsRefreshing(false);
      }
    },
    [showNotification]
  );

  useEffect(() => {
    fetchInvoices();
    fetchOrders();
  }, [fetchInvoices, fetchOrders]);

  // Aggregate totals for Invoices
  const revenueSummary = useMemo(() => {
    let totalRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let pendingBalance = 0;
    let totalBilled = 0;

    invoices.forEach((inv) => {
      const total = inv.totalAmount || 0;
      const paid = inv.paidAmount || (inv.status === "paid" ? total : 0);
      totalBilled += total;

      if (inv.status === "paid") {
        totalRevenue += paid;
        paidCount++;
      } else {
        pendingCount++;
        pendingBalance += Math.max(0, total - paid);
        totalRevenue += paid;
      }
    });

    const collectionRate =
      totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : 100;

    return {
      totalRevenue,
      paidCount,
      pendingCount,
      pendingBalance,
      totalBilled,
      collectionRate,
    };
  }, [invoices]);

  // Aggregate totals for Orders
  const ordersSummary = useMemo(() => {
    let totalOrdersRevenue = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let failedOrdersCount = 0;

    orders.forEach((ord) => {
      if (ord.orderStatus === "paid" || ord.paymentStatus === "success") {
        totalOrdersRevenue += ord.paidAmount || ord.totalAmount || 0;
        paidOrdersCount++;
      } else if (
        ord.orderStatus === "pending_payment" ||
        ord.paymentStatus === "initiated" ||
        ord.paymentStatus === "pending"
      ) {
        pendingOrdersCount++;
      } else if (ord.paymentStatus === "failed") {
        failedOrdersCount++;
      }
    });

    return {
      totalOrdersRevenue,
      paidOrdersCount,
      pendingOrdersCount,
      failedOrdersCount,
      totalOrders: orders.length,
    };
  }, [orders]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = inv.invoiceNumber?.toLowerCase() || "";
        const pName = inv.patientId?.fullName?.toLowerCase() || "";
        const pPhone = inv.patientId?.phone?.toLowerCase() || "";
        const pCode = inv.patientId?.patientCode?.toLowerCase() || "";
        if (
          !num.includes(q) &&
          !pName.includes(q) &&
          !pPhone.includes(q) &&
          !pCode.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (orderStatusFilter !== "all") {
        if (
          orderStatusFilter === "paid" &&
          ord.orderStatus !== "paid" &&
          ord.paymentStatus !== "success"
        )
          return false;
        if (
          orderStatusFilter === "pending" &&
          ord.orderStatus !== "pending_payment" &&
          ord.paymentStatus !== "initiated" &&
          ord.paymentStatus !== "pending"
        )
          return false;
        if (orderStatusFilter === "failed" && ord.paymentStatus !== "failed")
          return false;
      }
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const num = ord.orderNumber?.toLowerCase() || "";
        const cName = ord.customerName?.toLowerCase() || "";
        const cPhone = ord.customerPhone || "";
        const sName = ord.serviceName?.toLowerCase() || "";
        if (
          !num.includes(q) &&
          !cName.includes(q) &&
          !cPhone.includes(q) &&
          !sName.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Download / Print Receipt PDF handler
  const handleDownloadReceiptPdf = (invoice: InvoiceItem) => {
    const token = getToken() || "";
    const baseUrl = getBaseUrl();
    const endpoint =
      invoice.status === "paid"
        ? `${baseUrl}/invoices/${invoice._id}/receipt/pdf`
        : `${baseUrl}/invoices/${invoice._id}/pdf`;

    window.open(`${endpoint}?token=${encodeURIComponent(token)}`, "_blank");
    showNotification("Opening official receipt PDF for print / download...");
  };

  // Copy checkout link
  const handleCopyOrderLink = (order: SalesOrderItem) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const checkoutUrl = `${origin}/checkout/${order.checkoutToken}`;
    navigator.clipboard.writeText(checkoutUrl);
    setCopiedOrderId(order._id);
    setTimeout(() => setCopiedOrderId(null), 3000);
    showNotification(`Copied checkout link for Order ${order.orderNumber}`);
  };

  // WhatsApp Share Order Link
  const handleShareOrderWhatsApp = (order: SalesOrderItem) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const checkoutUrl = `${origin}/checkout/${order.checkoutToken}`;
    const cleanPhone = (order.customerPhone || "").replace(/\D/g, "");
    const msg = `Hello ${order.customerName},\n\nHere is your official booking and payment link for *${order.serviceName}* (Order ${order.orderNumber} — ₹${order.totalAmount.toLocaleString("en-IN")}):\n${checkoutUrl}\n\nYou can pay securely via UPI, Card, or NetBanking. Our medical team is ready to assist you!`;
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Convert InvoiceItem to PaymentReceiptData
  const formatReceiptData = (inv: InvoiceItem): PaymentReceiptData => {
    const pName = inv.patientId?.fullName || "Valued Patient";
    const pCode = inv.patientId?.patientCode || "TG-PT";
    const pPhone = inv.patientId?.phone || "—";
    const pEmail = inv.patientId?.email;
    const docName =
      inv.doctorId?.userId?.name || inv.doctorId?.name || "Dr. Harshali Sutar";
    const sName =
      inv.appointmentId?.serviceName ||
      inv.items?.[0]?.description ||
      "Clinical Healthcare Service";

    const items =
      inv.items && inv.items.length > 0
        ? inv.items.map((it) => ({
            description: it.description || "Healthcare Consultation",
            details: it.details,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || it.amount || 0,
            amount: it.amount || (it.quantity || 1) * (it.unitPrice || 0),
          }))
        : [
            {
              description: sName,
              quantity: 1,
              unitPrice: inv.totalAmount || 0,
              amount: inv.totalAmount || 0,
            },
          ];

    const total = inv.totalAmount || 0;
    const paid = inv.paidAmount || (inv.status === "paid" ? total : 0);
    const balance =
      inv.balanceAmount !== undefined
        ? inv.balanceAmount
        : Math.max(0, total - paid);

    return {
      _id: inv._id,
      receiptNumber: inv.invoiceNumber.replace("INV-", "RCP-"),
      invoiceNumber: inv.invoiceNumber,
      issuedAt: inv.issueDate || new Date().toISOString(),
      paidAt: inv.paidAt || inv.issueDate || new Date().toISOString(),
      patientName: pName,
      patientCode: pCode,
      patientPhone: pPhone,
      patientEmail: pEmail,
      doctorName: docName,
      doctorQualifications:
        inv.doctorId?.qualifications || "MBBS, MD (Homoeopathy)",
      doctorSpecialization:
        inv.doctorId?.specialization || "Women Health & Wellness",
      serviceName: sName,
      appointmentDateTime: inv.appointmentId?.appointmentDate || "",
      appointmentMode: inv.appointmentId?.mode || "Clinical Encounter",
      items,
      paymentMethod: inv.paymentMethod || "UPI / Online",
      providerTransactionId: inv.invoiceNumber,
      paymentStatus: inv.status === "paid" ? "Paid" : inv.status,
      subtotal: inv.subtotal || total,
      discountAmount: inv.discountAmount || 0,
      taxRate: inv.taxRate || 0,
      taxAmount: inv.taxAmount || 0,
      totalAmount: total,
      totalPaid: paid,
      balanceAmount: balance,
      verificationToken: inv.invoiceNumber,
    };
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E4EEE7] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#EDF8F1] text-[#087443]">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-serif font-bold text-[#064A2D]">
              Revenue, Orders &amp; Billing Ledger
            </h1>
          </div>
          <p className="text-xs text-[#68766F] mt-1">
            Track real-time checkout links, Razorpay payment collections, and clinical billing slips.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Section Segmented Toggle */}
          <div className="inline-flex p-1 bg-[#F4FAF6] rounded-2xl border border-[#D5E2D9]">
            <button
              type="button"
              onClick={() => setActiveSection("invoices")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSection === "invoices"
                  ? "bg-[#064A2D] text-white shadow-xs"
                  : "text-[#68766F] hover:text-[#064A2D]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices ({invoices.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("orders")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSection === "orders"
                  ? "bg-[#064A2D] text-white shadow-xs"
                  : "text-[#68766F] hover:text-[#064A2D]"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Assisted Orders ({orders.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeSection === "invoices") fetchInvoices(true);
              else fetchOrders(true);
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F4FAF6] hover:bg-[#E4EEE7] text-[#064A2D] text-xs font-semibold border border-[#D5E2D9] transition cursor-pointer disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: INVOICES & MEDICAL RECEIPTS                                     */}
      {/* ========================================================================= */}
      {activeSection === "invoices" && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Total Revenue Collected */}
            <div className="bg-white border border-[#E4EEE7] rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-[#087443]/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#68766F]">
                  Total Revenue Collected
                </span>
                <div className="w-9 h-9 rounded-2xl bg-[#EDF8F1] text-[#087443] flex items-center justify-center font-bold border border-[#D5E8DC]">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#064A2D] tracking-tight">
                ₹{revenueSummary.totalRevenue.toLocaleString("en-IN")}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#087443] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{revenueSummary.paidCount} Fully Paid Receipts</span>
              </div>
            </div>

            {/* Card 2: Total Invoices Issued */}
            <div className="bg-white border border-[#E4EEE7] rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-[#087443]/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#68766F]">
                  Total Invoices Issued
                </span>
                <div className="w-9 h-9 rounded-2xl bg-[#F4FAF6] text-[#14251F] flex items-center justify-center font-bold border border-[#E4EEE7]">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#14251F] tracking-tight">
                {invoices.length}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#68766F] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#087443]" />
                <span>{revenueSummary.collectionRate}% Collection Rate</span>
              </div>
            </div>

            {/* Card 3: Pending Collections */}
            <div className="bg-white border border-[#E4EEE7] rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#68766F]">
                  Pending Collections
                </span>
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-950 tracking-tight">
                ₹{revenueSummary.pendingBalance.toLocaleString("en-IN")}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {revenueSummary.pendingCount} Pending Patient Settlements
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E4EEE7] rounded-2xl p-3 sm:p-4 shadow-2xs">
            {/* Status Filter Segment */}
            <div className="flex items-center bg-[#F4FAF6] p-1 rounded-xl border border-[#E4EEE7] overflow-x-auto">
              {[
                { id: "all", label: "All Invoices", count: invoices.length },
                { id: "paid", label: "Paid", count: revenueSummary.paidCount },
                {
                  id: "pending",
                  label: "Pending",
                  count: revenueSummary.pendingCount,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === f.id
                      ? "bg-[#064A2D] text-white shadow-2xs font-bold"
                      : "text-[#68766F] hover:text-[#14251F] hover:bg-white/60"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      statusFilter === f.id
                        ? "bg-white/20 text-white"
                        : "bg-[#E4EEE7] text-[#68766F]"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Field */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#889890] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice #, patient, phone..."
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-[#E4EEE7] bg-[#F8FAF9] text-xs text-[#14251F] placeholder-[#889890] focus:outline-none focus:ring-2 focus:ring-[#087443] focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#889890] hover:text-[#14251F] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white border border-[#E4EEE7] rounded-3xl overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-[#087443] animate-spin mb-3" />
                <p className="text-xs font-semibold text-[#14251F]">
                  Fetching authenticated invoices &amp; receipts...
                </p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-16 text-center text-xs text-[#68766F]">
                No invoices matching selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#14251F]">
                  <thead className="bg-[#F8FAF9] border-b border-[#E4EEE7] text-[10px] font-bold text-[#68766F] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5">Invoice Number</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Payment Mode</th>
                      <th className="py-3.5 px-4">Issue Date</th>
                      <th className="py-3.5 px-5 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EEE7]">
                    {filteredInvoices.map((inv) => {
                      const isPaid = inv.status === "paid";
                      const pName = inv.patientId?.fullName || "General Patient";
                      const pPhone = inv.patientId?.phone || "—";
                      const pCode = inv.patientId?.patientCode || "TG-PT";

                      return (
                        <tr
                          key={inv._id}
                          className="hover:bg-[#F8FAF9]/80 transition-colors"
                        >
                          {/* Invoice Number */}
                          <td className="py-3.5 px-5 font-mono font-bold text-[#064A2D] text-xs">
                            {inv.invoiceNumber}
                          </td>

                          {/* Patient Profile */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#EDF8F1] text-[#087443] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#D5E8DC]">
                                {pName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-[#14251F] text-xs truncate">
                                  {pName}
                                </p>
                                <p className="text-[10px] text-[#68766F] font-mono truncate">
                                  {pCode} • {pPhone}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-extrabold text-[#14251F] font-mono text-xs">
                            ₹{(inv.totalAmount || 0).toLocaleString("en-IN")}
                            {!isPaid && (inv.paidAmount || 0) > 0 && (
                              <span className="block text-[10px] font-normal text-amber-700">
                                Paid: ₹{inv.paidAmount?.toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>

                          {/* Status Pill */}
                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#EDF8F1] text-[#087443] border border-[#CDE5D6]">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Payment Mode */}
                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-mono text-[#68766F] uppercase">
                              {inv.paymentMethod || "UPI / Online"}
                            </span>
                          </td>

                          {/* Issue Date */}
                          <td className="py-3.5 px-4 text-[#68766F] font-mono text-[11px]">
                            {inv.issueDate
                              ? new Date(inv.issueDate).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "—"}
                          </td>

                          {/* Actions: View / Print Slip */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAutoPrintReceipt(false);
                                  setViewingReceipt(inv);
                                }}
                                className="w-8 h-8 rounded-xl bg-[#EDF8F1] hover:bg-[#D5E8DC] text-[#087443] flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
                                title="View Billing Receipt Slip"
                                aria-label="View Receipt"
                              >
                                <Eye className="w-4 h-4 transition-transform group-hover:scale-110" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setAutoPrintReceipt(true);
                                  setViewingReceipt(inv);
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: ASSISTED ORDERS & RAZORPAY PAYMENT TRACKING                    */}
      {/* ========================================================================= */}
      {activeSection === "orders" && (
        <div className="space-y-6 animate-fade-in">
          {/* Orders KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Orders */}
            <div className="bg-white border border-[#E4EEE7] rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-[#087443]/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#68766F]">Total Orders</span>
                <div className="w-8 h-8 rounded-xl bg-[#EDF8F1] text-[#087443] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#064A2D] tracking-tight">
                {ordersSummary.totalOrders}
              </div>
              <div className="mt-2 text-[11px] text-[#68766F]">
                Assisted checkout orders created
              </div>
            </div>

            {/* Card 2: Converted Revenue */}
            <div className="bg-white border border-[#E4EEE7] rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-[#087443]/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#68766F]">Converted Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-900 tracking-tight">
                ₹{ordersSummary.totalOrdersRevenue.toLocaleString("en-IN")}
              </div>
              <div className="mt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{ordersSummary.paidOrdersCount} Paid Orders</span>
              </div>
            </div>

            {/* Card 3: Awaiting Payment */}
            <div className="bg-white border border-[#E4EEE7] rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#68766F]">Awaiting Payment</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-950 tracking-tight">
                {ordersSummary.pendingOrdersCount}
              </div>
              <div className="mt-2 text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Active Razorpay checkout links</span>
              </div>
            </div>

            {/* Card 4: Failed / Abandoned */}
            <div className="bg-white border border-[#E4EEE7] rounded-3xl p-5 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#68766F]">Failed Attempts</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-950 tracking-tight">
                {ordersSummary.failedOrdersCount}
              </div>
              <div className="mt-2 text-[11px] text-rose-700 font-medium">
                Payment attempt drops / gateway declines
              </div>
            </div>
          </div>

          {/* Search & Status Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E4EEE7] rounded-2xl p-3 sm:p-4 shadow-2xs">
            <div className="flex items-center bg-[#F4FAF6] p-1 rounded-xl border border-[#E4EEE7] overflow-x-auto">
              {[
                { id: "all", label: "All Orders", count: orders.length },
                { id: "pending", label: "Awaiting Payment", count: ordersSummary.pendingOrdersCount },
                { id: "paid", label: "Paid", count: ordersSummary.paidOrdersCount },
                { id: "failed", label: "Failed", count: ordersSummary.failedOrdersCount },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    orderStatusFilter === f.id
                      ? "bg-[#064A2D] text-white shadow-2xs font-bold"
                      : "text-[#68766F] hover:text-[#14251F] hover:bg-white/60"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      orderStatusFilter === f.id
                        ? "bg-white/20 text-white"
                        : "bg-[#E4EEE7] text-[#68766F]"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#889890] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search order #, customer, service..."
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-[#E4EEE7] bg-[#F8FAF9] text-xs text-[#14251F] placeholder-[#889890] focus:outline-none focus:ring-2 focus:ring-[#087443] focus:bg-white transition"
              />
              {orderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setOrderSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#889890] hover:text-[#14251F] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-[#E4EEE7] rounded-3xl overflow-hidden shadow-xs">
            {ordersLoading ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-[#087443] animate-spin mb-3" />
                <p className="text-xs font-semibold text-[#14251F]">
                  Loading assisted checkout orders...
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-16 text-center text-xs text-[#68766F]">
                No orders found matching selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#14251F]">
                  <thead className="bg-[#F8FAF9] border-b border-[#E4EEE7] text-[10px] font-bold text-[#68766F] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5">Order #</th>
                      <th className="py-3.5 px-4">Customer / Lead</th>
                      <th className="py-3.5 px-4">Service / Package</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Order Status</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4">Created</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EEE7]">
                    {filteredOrders.map((ord) => {
                      const isPaid =
                        ord.orderStatus === "paid" || ord.paymentStatus === "success";
                      const isFailed = ord.paymentStatus === "failed";
                      const attemptsCount = ord.paymentAttempts?.length || 0;
                      const hasCopied = copiedOrderId === ord._id;

                      return (
                        <tr key={ord._id} className="hover:bg-[#F8FAF9]/80 transition-colors">
                          {/* Order Number */}
                          <td className="py-3.5 px-5 font-mono font-bold text-[#064A2D] text-xs">
                            {ord.orderNumber}
                          </td>

                          {/* Customer Name & Phone */}
                          <td className="py-3.5 px-4">
                            <div className="min-w-0">
                              <p className="font-bold text-[#14251F] text-xs truncate">
                                {ord.customerName}
                              </p>
                              <p className="text-[10px] text-[#68766F] font-mono truncate">
                                {ord.customerPhone}
                              </p>
                            </div>
                          </td>

                          {/* Service / Package */}
                          <td className="py-3.5 px-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-xs truncate">
                                {ord.serviceName}
                              </p>
                              {ord.packageId?.totalSessions && (
                                <p className="text-[10px] text-[#087443] font-medium">
                                  {ord.packageId.totalSessions} Sessions &bull; {ord.packageId.validityDays || 90}d validity
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-extrabold text-[#14251F] text-xs">
                              ₹{ord.totalAmount.toLocaleString("en-IN")}
                            </span>
                            {ord.discountAmount > 0 && (
                              <span className="block text-[10px] text-emerald-700 font-sans">
                                (Disc: -₹{ord.discountAmount.toLocaleString("en-IN")})
                              </span>
                            )}
                          </td>

                          {/* Order Status */}
                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[#EDF8F1] text-[#087443] border border-[#CDE5D6]">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </span>
                            ) : isFailed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Awaiting Pay
                              </span>
                            )}
                          </td>

                          {/* Payment Attempt Status */}
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {attemptsCount > 0 ? (
                              <span className="text-gray-600">
                                {attemptsCount} attempt{attemptsCount > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-gray-400">Link issued</span>
                            )}
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-4 text-[#68766F] font-mono text-[11px]">
                            {new Date(ord.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDetails(ord)}
                                className="w-7 h-7 rounded-lg bg-[#F4FAF6] hover:bg-[#E4EEE7] text-[#064A2D] border border-[#D5E2D9] flex items-center justify-center transition cursor-pointer"
                                title="View Itemized Order Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Copy Link */}
                              <button
                                type="button"
                                onClick={() => handleCopyOrderLink(ord)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                                  hasCopied
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : "bg-[#EDF8F1] hover:bg-[#D5E8DC] text-[#087443] border-[#D5E8DC]"
                                }`}
                                title="Copy Checkout Link"
                              >
                                {hasCopied ? (
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* WhatsApp Share */}
                              {ord.customerPhone && (
                                <button
                                  type="button"
                                  onClick={() => handleShareOrderWhatsApp(ord)}
                                  className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition cursor-pointer"
                                  title="Share Checkout Link via WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Open Checkout Page in new tab */}
                              <a
                                href={`/checkout/${ord.checkoutToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 flex items-center justify-center transition cursor-pointer"
                                title="Test Public Checkout Page"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
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
        </div>
      )}

      {/* 5. Standard Billing Receipt Slip Modal */}
      {viewingReceipt && (
        <BillingReceiptModal
          receiptData={formatReceiptData(viewingReceipt)}
          showActions={true}
          autoPrint={autoPrintReceipt}
          onClose={() => {
            setViewingReceipt(null);
            setAutoPrintReceipt(false);
          }}
          onDownloadPdf={() => handleDownloadReceiptPdf(viewingReceipt)}
        />
      )}

      {/* 6. Order Details & Payment Attempts Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#CBD5E1] space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EDF8F1] text-[#087443] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Order {selectedOrderDetails.orderNumber}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Assisted Checkout &amp; Pricing Snapshot
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Customer summary */}
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800 block">
                    {selectedOrderDetails.customerName}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {selectedOrderDetails.customerPhone} &bull; {selectedOrderDetails.customerEmail || "No email"}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    selectedOrderDetails.orderStatus === "paid"
                      ? "bg-[#EDF8F1] text-[#087443]"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {selectedOrderDetails.orderStatus}
                </span>
              </div>

              {/* Items Breakdown */}
              <div className="border border-[#E2E8F0] rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                  Purchased Items Snapshot
                </span>
                {selectedOrderDetails.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-none">
                    <div>
                      <p className="font-semibold text-gray-800">{it.description}</p>
                      {it.details && <p className="text-[10px] text-gray-400">{it.details}</p>}
                    </div>
                    <span className="font-mono font-bold text-gray-700">
                      {it.quantity} &times; ₹{it.unitPrice.toLocaleString("en-IN")} = ₹{it.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}

                <div className="pt-2 border-t border-gray-200 space-y-1 text-right">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{selectedOrderDetails.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {selectedOrderDetails.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Promotional Discount:</span>
                      <span className="font-mono">-₹{selectedOrderDetails.discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#064A2D] text-sm pt-1 border-t border-gray-100">
                    <span>Total Amount:</span>
                    <span className="font-mono">₹{selectedOrderDetails.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Payment Attempts */}
              <div className="border border-[#E2E8F0] rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                  Razorpay Payment Attempts ({selectedOrderDetails.paymentAttempts?.length || 0})
                </span>
                {(!selectedOrderDetails.paymentAttempts || selectedOrderDetails.paymentAttempts.length === 0) ? (
                  <p className="text-gray-400 text-[11px]">No checkout attempts recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {selectedOrderDetails.paymentAttempts.map((att, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 text-[11px]">
                        <div>
                          <span className="font-semibold uppercase text-gray-700">{att.provider}</span>
                          {att.providerOrderId && (
                            <span className="text-[10px] text-gray-400 font-mono ml-1.5">
                              {att.providerOrderId}
                            </span>
                          )}
                          {att.error && <p className="text-rose-600 text-[10px]">{att.error}</p>}
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-1.5 py-0.2 rounded-full font-bold text-[9px] uppercase ${
                              att.status === "success"
                                ? "bg-emerald-100 text-emerald-800"
                                : att.status === "failed"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {att.status}
                          </span>
                          <p className="text-[9px] text-gray-400 font-mono">
                            {new Date(att.attemptedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => handleCopyOrderLink(selectedOrderDetails)}
                className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Checkout Link</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesInvoicesTab;
