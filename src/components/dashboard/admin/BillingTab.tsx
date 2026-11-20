"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Plus,
  ShieldCheck,
  Eye,
  FileText,
  DollarSign,
  Wrench,
  X,
  ShoppingBag,
  RotateCcw,
  Package as PackageIcon,
  Copy,
  ExternalLink,
  Check,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  Sparkles,
  Settings,
  Share2,
  Filter,
  Calendar,
  MoreVertical,
  Send,
  Building2,
  User,
  Phone,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  QrCode,
  Tag,
  Ban,
  FileCheck,
} from "lucide-react";
import { api, getToken, getBaseUrl } from "@/lib/api/client";
import { A4InvoiceDocument, InvoiceDocumentData } from "@/components/billing/A4InvoiceDocument";
import QRCode from "qrcode";
import PaymentLinkGeneratorModal from "@/components/billing/PaymentLinkGeneratorModal";

// -------------------------------------------------------------
// Type Definitions
// -------------------------------------------------------------

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceType?: "consultation" | "service" | "package" | "follow-up" | "procedure" | "other" | string;
  branchName?: string;
  patientId?: {
    _id?: string;
    fullName: string;
    patientCode: string;
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
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  refundedAmount?: number;
  status: "paid" | "partially_paid" | "pending" | "refunded" | "cancelled" | "draft" | string;
  paymentMethod?: string;
  items?: Array<{
    description: string;
    details?: string;
    amount: number;
    quantity?: number;
    unitPrice?: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
  }>;
  taxBreakdown?: {
    cgst?: number;
    sgst?: number;
    igst?: number;
  };
  payments?: Array<{
    amount: number;
    paymentMethod: string;
    paymentProvider?: string;
    transactionRef?: string;
    receiptId?: string;
    receiptNumber?: string;
    recordedAt?: string;
    notes?: string;
  }>;
  createdAt: string;
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  refundDetails?: {
    refundAmount?: number;
    refundReason?: string;
    refundedAt?: string;
  };
}

export interface OrderItem {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency?: string;
  orderStatus: "draft" | "pending_payment" | "paid" | "cancelled" | "expired" | "partially_refunded" | "refunded" | string;
  paymentStatus: "pending" | "initiated" | "success" | "failed" | "partially_refunded" | "refunded" | string;
  checkoutToken?: string;
  razorpayPaymentLinkUrl?: string;
  createdAt: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    totalSessions?: number;
    validityDays?: number;
  }>;
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
    phone?: string;
  };
  packageId?: {
    _id?: string;
    name?: string;
    totalSessions?: number;
    validityDays?: number;
  };
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    balanceAmount?: number;
    status?: string;
  };
}

export interface PaymentItem {
  _id: string;
  paymentNumber: string;
  amount: number;
  currency?: string;
  status: "initiated" | "pending" | "success" | "failed" | "refunded" | "partially_refunded" | string;
  paymentMethod: "cash" | "card" | "upi" | "netbanking" | "bank_transfer" | "wallet" | string;
  paymentProvider: "razorpay" | "manual_pos" | "direct_bank" | string;
  providerTransactionId?: string;
  providerOrderId?: string;
  paidAt?: string;
  createdAt: string;
  notes?: string;
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
    phone?: string;
  };
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    paidAmount?: number;
    balanceAmount?: number;
    status?: string;
  };
}

export interface RefundItem {
  _id: string;
  refundNumber: string;
  requestedAmount: number;
  reason: string;
  status: "pending" | "approved" | "processed" | "rejected" | string;
  transactionRef?: string;
  providerRefundId?: string;
  reviewNotes?: string;
  processedAt?: string;
  createdAt: string;
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    paidAmount?: number;
  };
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
    phone?: string;
  };
}

export interface PaymentLinkItem {
  _id: string;
  paymentLinkId: string;
  razorpayPaymentLinkId?: string;
  amount: number;
  currency?: string;
  shortUrl?: string;
  description?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: "created" | "active" | "partially_paid" | "paid" | "expired" | "cancelled" | string;
  paidAmount: number;
  balanceDue: number;
  expiryDate?: string;
  createdAt: string;
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    balanceAmount?: number;
  };
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
    phone?: string;
  };
}

export interface CreditNoteItem {
  _id: string;
  creditNoteNumber: string;
  amount: number;
  reason: string;
  status: "issued" | "applied" | "voided" | string;
  issuedAt: string;
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
    totalAmount?: number;
  };
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
  };
}

export interface FinancialLedgerItem {
  _id: string;
  entryNumber: string;
  entryType: string;
  classification: "debit" | "credit";
  amount: number;
  description: string;
  balanceAfter?: number;
  gatewayRef?: string;
  createdAt: string;
  invoiceId?: {
    _id?: string;
    invoiceNumber?: string;
  };
  patientId?: {
    _id?: string;
    fullName?: string;
    patientCode?: string;
  };
}

export interface PackageItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  pricePaise: number;
  totalSessions: number;
  sessionDurationMinutes: number;
  validityDays: number;
  features: string[];
  isPublished: boolean;
  createdAt: string;
}

export interface OverviewMetrics {
  kpis: {
    totalInvoiced: number;
    invoicedCount: number;
    invoicedGrowth: number;
    collectedRevenue: number;
    onlineCollected: number;
    offlineCollected: number;
    collectedGrowth: number;
    outstandingBalance: number;
    outstandingGrowth: number;
    settledInvoicesCount: number;
    totalInvoicesCount: number;
    settlementRate: number;
  };
  revenueOverview: {
    periodLabel: string;
    collectedAmount: number;
    growthPercentage: number;
    previousMonthName: string;
    weeklyChart: Array<{ week: string; amount: number; label?: string }>;
  };
  invoiceSummary: {
    total: number;
    paid: { count: number; percentage: number };
    pending: { count: number; percentage: number };
    partiallyPaid: { count: number; percentage: number };
    refunded: { count: number; percentage: number };
  };
  gatewayHealth: {
    provider: string;
    displayName: string;
    mode: string;
    status: string;
    isTestMode: boolean;
    keyIdMasked: string | null;
    secretConfigured: boolean;
    webhookSecretConfigured: boolean;
  };
}

export interface ReconciliationData {
  totalBilled: number;
  totalCollected: number;
  totalDues: number;
  totalRefunds: number;
  totalExpenses: number;
  netCashFlow: number;
  gatewayBreakdown?: {
    razorpayCaptured: number;
    razorpayPending: number;
    razorpayFailed: number;
    offlineUpi: number;
    cashOrPos: number;
    reconciliationStatus: string;
    discrepanciesCount: number;
    discrepancies?: Array<{
      type: string;
      reference: string;
      details: string;
      severity: string;
    }>;
  };
}

interface BillingTabProps {
  invoices: Invoice[];
  isLoading: boolean;
  onRefresh: () => void;
  onViewReceipt: (inv: any) => void | Promise<void>;
  onDownloadPdf: (inv: any) => void;
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
  // Navigation Subtabs matching design reference
  const [activeSubTab, setActiveSubTab] = useState<
    "invoices" | "orders" | "payments" | "refunds" | "packages" | "ledger" | "payment-links"
  >("invoices");

  // Invoices Filters & Search
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("Oct 1, 2026 - Oct 31, 2026");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Active Menu Dropdown for Actions
  const [actionMenuInvoiceId, setActionMenuInvoiceId] = useState<string | null>(null);

  // Overview Analytics State
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Document Preview & Details State
  const [activeInvoicePreview, setActiveInvoicePreview] = useState<InvoiceDocumentData | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);
  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);

  // Reconciliation Drawer State
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);
  const [repairingReconciliation, setRepairingReconciliation] = useState(false);
  const [repairResult, setRepairResult] = useState<string | null>(null);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Multi-step Create Invoice Wizard State
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [patientsList, setPatientsList] = useState<Array<{ _id: string; fullName: string; patientCode: string; phone?: string; email?: string }>>([]);
  const [doctorsList, setDoctorsList] = useState<Array<{ _id: string; name: string; specialization?: string }>>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [invoiceTypeInput, setInvoiceTypeInput] = useState<string>("consultation");
  const [branchInput, setBranchInput] = useState("Main Clinic (Pune - Baner)");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceItems, setInvoiceItems] = useState([
    { description: "Specialist Consultation & Assessment", quantity: 1, unitPrice: 700, discount: 0, taxRate: 0, amount: 700 },
  ]);
  const [gstType, setGstType] = useState<"exempt" | "cgst_sgst" | "igst">("exempt");
  const [taxRateInput, setTaxRateInput] = useState(0);
  const [discountAmountInput, setDiscountAmountInput] = useState(0);
  const [paymentOption, setPaymentOption] = useState<"unpaid" | "pos_full" | "payment_link">("unpaid");
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<"upi" | "card" | "cash" | "bank_transfer">("upi");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Create Payment Link Modal State
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentLinkInvoice, setPaymentLinkInvoice] = useState<Invoice | null>(null);
  const [paymentLinkAmount, setPaymentLinkAmount] = useState<number>(0);
  const [paymentLinkAllowPartial, setPaymentLinkAllowPartial] = useState(false);
  const [paymentLinkMinPartial, setPaymentLinkMinPartial] = useState(0);
  const [paymentLinkExpiryDays, setPaymentLinkExpiryDays] = useState(7);
  const [paymentLinkNotes, setPaymentLinkNotes] = useState("");
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  const [createdLinkResult, setCreatedLinkResult] = useState<{ shortUrl: string; paymentLinkId: string; qrDataUrl?: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Record Offline Payment Modal State
  const [offlinePaymentInvoice, setOfflinePaymentInvoice] = useState<Invoice | null>(null);
  const [offlineAmount, setOfflineAmount] = useState<number>(0);
  const [offlineMethod, setOfflineMethod] = useState<"cash" | "card" | "bank_transfer" | "upi">("cash");
  const [offlineRef, setOfflineRef] = useState("");
  const [offlineNotes, setOfflineNotes] = useState("");
  const [recordingOffline, setRecordingOffline] = useState(false);

  // Process Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundInvoice, setRefundInvoice] = useState<Invoice | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Create Credit Note Modal State
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<Invoice | null>(null);
  const [creditNoteAmount, setCreditNoteAmount] = useState<number>(0);
  const [creditNoteReason, setCreditNoteReason] = useState("");
  const [isSubmittingCreditNote, setIsSubmittingCreditNote] = useState(false);

  // Secondary Datasets (Orders, Payments, Refunds, Payment Links, Ledger, Packages)
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderItem | null>(null);

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");

  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [isLoadingRefunds, setIsLoadingRefunds] = useState(false);
  const [refundSearch, setRefundSearch] = useState("");

  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkItem[]>([]);
  const [isLoadingPaymentLinks, setIsLoadingPaymentLinks] = useState(false);
  const [showLinkGeneratorModal, setShowLinkGeneratorModal] = useState(false);
  const [paymentLinkSearch, setPaymentLinkSearch] = useState("");
  const [paymentLinkStatusFilter, setPaymentLinkStatusFilter] = useState("");

  const [creditNotes, setCreditNotes] = useState<CreditNoteItem[]>([]);
  const [isLoadingCreditNotes, setIsLoadingCreditNotes] = useState(false);

  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerItem[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [ledgerSummary, setLedgerSummary] = useState<{ totalDebits: number; totalCredits: number; netBalance: number } | null>(null);

  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [packageSearch, setPackageSearch] = useState("");

  // -------------------------------------------------------------
  // Data Fetching & Sync
  // -------------------------------------------------------------

  const fetchOverviewMetrics = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const res = await api.get<OverviewMetrics>("/billing/overview");
      if (res.success && res.data) {
        setOverviewMetrics(res.data);
      }
    } catch (err) {
      console.warn("Could not load backend billing overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadPaymentLinks = useCallback(async () => {
    try {
      setIsLoadingPaymentLinks(true);
      const res = await api.get<{ links: PaymentLinkItem[]; total: number }>("/billing/payment-links");
      if (res.success && res.data?.links) {
        setPaymentLinks(res.data.links);
      }
    } catch (err) {
      console.warn("Failed to load payment links:", err);
    } finally {
      setIsLoadingPaymentLinks(false);
    }
  }, []);

  const loadCreditNotes = useCallback(async () => {
    try {
      setIsLoadingCreditNotes(true);
      const res = await api.get<{ creditNotes: CreditNoteItem[]; total: number }>("/billing/credit-notes");
      if (res.success && res.data?.creditNotes) {
        setCreditNotes(res.data.creditNotes);
      }
    } catch (err) {
      console.warn("Failed to load credit notes:", err);
    } finally {
      setIsLoadingCreditNotes(false);
    }
  }, []);

  const loadLedger = useCallback(async () => {
    try {
      setIsLoadingLedger(true);
      const res = await api.get<{ entries: FinancialLedgerItem[]; total: number; summary: any }>("/billing/ledger");
      if (res.success && res.data) {
        setLedgerEntries(res.data.entries || []);
        if (res.data.summary) setLedgerSummary(res.data.summary);
      }
    } catch (err) {
      console.warn("Failed to load ledger:", err);
    } finally {
      setIsLoadingLedger(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true);
      const res = await api.get<{ orders: OrderItem[]; total: number }>("/orders?limit=100");
      if (res.success && res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.warn("Failed to load orders:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setIsLoadingPayments(true);
      const res = await api.get<{ payments: PaymentItem[]; total: number }>("/billing/payments?limit=100");
      if (res.success && res.data?.payments) {
        setPayments(res.data.payments);
      }
    } catch (err) {
      console.warn("Failed to load payments:", err);
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  const loadRefunds = useCallback(async () => {
    try {
      setIsLoadingRefunds(true);
      const res = await api.get<{ refunds: RefundItem[]; total: number }>("/orders/refunds?limit=100");
      if (res.success && res.data?.refunds) {
        setRefunds(res.data.refunds);
      }
    } catch (err) {
      console.warn("Failed to load refunds:", err);
    } finally {
      setIsLoadingRefunds(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      const res = await api.get<{ packages: PackageItem[]; total: number }>("/packages?limit=50");
      if (res.success && res.data?.packages) {
        setPackages(res.data.packages);
      }
    } catch (err) {
      console.warn("Failed to load packages:", err);
    } finally {
      setIsLoadingPackages(false);
    }
  }, []);

  const fetchReconciliationReport = useCallback(async () => {
    try {
      setLoadingReconciliation(true);
      setRepairResult(null);
      const res = await api.get<{ reconciliation: ReconciliationData }>("/billing/reconciliation");
      if (res.success && res.data?.reconciliation) {
        setReconciliationData(res.data.reconciliation);
      }
    } catch (err) {
      console.warn("Reconciliation fetch notice:", err);
    } finally {
      setLoadingReconciliation(false);
    }
  }, []);

  const handleRepairReconciliation = async () => {
    try {
      setRepairingReconciliation(true);
      setRepairResult(null);
      const res = await api.post<{ repairsCount: number; repairs: any[] }>("/billing/reconciliation/repair", {});
      if (res.success) {
        setRepairResult(`Successfully resolved ${res.data?.repairsCount || 0} financial discrepancies.`);
        await fetchReconciliationReport();
        await fetchOverviewMetrics();
        onRefresh();
      }
    } catch (err: any) {
      setRepairResult(`Repair notice: ${err?.message || "Operation completed."}`);
    } finally {
      setRepairingReconciliation(false);
    }
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const res = await api.get("/billing/settings");
      if (res.success && res.data) {
        setSettingsData(res.data);
      }
    } catch (err) {
      console.warn("Settings notice:", err);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // Initial mount load
  useEffect(() => {
    fetchOverviewMetrics();
    // Preload patients and doctors for the Issue Invoice wizard
    api.get<{ patients: any[] }>("/patients?limit=50").then((res) => {
      if (res.success && res.data?.patients) setPatientsList(res.data.patients);
    }).catch(() => {});

    api.get<{ doctors: any[] }>("/doctors?limit=20").then((res) => {
      if (res.success && res.data?.doctors) {
        const formatted = res.data.doctors.map((d: any) => ({
          _id: d._id,
          name: d.userId?.name || d.name || "Doctor",
          specialization: d.specialization || "Gynecology & Obstetrics",
        }));
        setDoctorsList(formatted);
      }
    }).catch(() => {});
  }, [fetchOverviewMetrics]);

  // Tab switch prefetch
  useEffect(() => {
    if (activeSubTab === "orders" && orders.length === 0) loadOrders();
    else if (activeSubTab === "payments" && payments.length === 0) loadPayments();
    else if (activeSubTab === "refunds" && refunds.length === 0) loadRefunds();
    else if (activeSubTab === "packages" && packages.length === 0) loadPackages();
    else if (activeSubTab === "ledger" && ledgerEntries.length === 0) loadLedger();
    else if (activeSubTab === "payment-links" && paymentLinks.length === 0) loadPaymentLinks();
  }, [activeSubTab, orders.length, payments.length, refunds.length, packages.length, ledgerEntries.length, paymentLinks.length, loadOrders, loadPayments, loadRefunds, loadPackages, loadLedger, loadPaymentLinks]);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActionMenuInvoiceId(null);
      setShowExportMenu(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // -------------------------------------------------------------
  // Filtered Invoices & Computations
  // -------------------------------------------------------------

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const numMatch = inv.invoiceNumber?.toLowerCase().includes(q);
        const nameMatch = inv.patientId?.fullName?.toLowerCase().includes(q);
        const codeMatch = inv.patientId?.patientCode?.toLowerCase().includes(q);
        const phoneMatch = inv.patientId?.phone?.includes(q);
        if (!numMatch && !nameMatch && !codeMatch && !phoneMatch) return false;
      }
      // 2. Status Filter
      if (statusFilter !== "all" && inv.status !== statusFilter) {
        return false;
      }
      // 3. Branch Filter
      if (selectedBranch !== "all" && inv.branchName && !inv.branchName.includes(selectedBranch)) {
        return false;
      }
      // 4. Type Filter
      if (typeFilter !== "all") {
        const effectiveType = (inv.invoiceType || "consultation").toLowerCase();
        if (!effectiveType.includes(typeFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [invoices, search, statusFilter, selectedBranch, typeFilter]);

  // Total metrics computed from real database records (with backend metrics precedence)
  const computedTotals = useMemo(() => {
    let invoiced = 0;
    let collected = 0;
    let outstanding = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;

    invoices.forEach((inv) => {
      const tot = inv.totalAmount || 0;
      const pd = inv.paidAmount || 0;
      invoiced += tot;
      collected += pd;

      if (inv.status === "paid") {
        paidCount++;
      } else if (inv.status === "refunded") {
        refundedCount++;
      } else {
        pendingCount++;
        outstanding += inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, tot - pd);
      }
    });

    const totalCount = invoices.length || 1;
    const settlementRate = Math.round((paidCount / totalCount) * 100);

    return {
      invoiced,
      collected,
      outstanding,
      paidCount,
      pendingCount,
      refundedCount,
      settlementRate,
      totalCount: invoices.length,
    };
  }, [invoices]);

  // Use overview backend metrics if available, else computedTotals
  const totalInvoicedVal = overviewMetrics?.kpis.totalInvoiced ?? computedTotals.invoiced;
  const totalCollectedVal = overviewMetrics?.kpis.collectedRevenue ?? computedTotals.collected;
  const totalOutstandingVal = overviewMetrics?.kpis.outstandingBalance ?? computedTotals.outstanding;
  const settledCountVal = overviewMetrics?.kpis.settledInvoicesCount ?? computedTotals.paidCount;
  const totalInvoicesVal = overviewMetrics?.kpis.totalInvoicesCount ?? computedTotals.totalCount;
  const settlementRateVal = overviewMetrics?.kpis.settlementRate ?? computedTotals.settlementRate;

  // Pagination slicing
  const totalFilteredCount = filteredInvoices.length;
  const totalPages = Math.ceil(totalFilteredCount / rowsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredInvoices, currentPage, rowsPerPage]);

  const filteredPaymentLinks = useMemo(() => {
    return paymentLinks.filter((link) => {
      if (paymentLinkStatusFilter && link.status !== paymentLinkStatusFilter) {
        return false;
      }
      if (!paymentLinkSearch.trim()) return true;
      const q = paymentLinkSearch.toLowerCase();
      const name = (link.customerName || link.patientId?.fullName || "").toLowerCase();
      const phone = (link.customerPhone || link.patientId?.phone || "").toLowerCase();
      const ref = (link.paymentLinkId || "").toLowerCase();
      const rzp = (link.razorpayPaymentLinkId || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || ref.includes(q) || rzp.includes(q);
    });
  }, [paymentLinks, paymentLinkSearch, paymentLinkStatusFilter]);

  // -------------------------------------------------------------
  // Invoice Selection (Checkbox handlers)
  // -------------------------------------------------------------

  const handleSelectAll = () => {
    if (selectedInvoiceIds.size === paginatedInvoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(paginatedInvoices.map((i) => i._id)));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedInvoiceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedInvoiceIds(next);
  };

  // -------------------------------------------------------------
  // Quick Actions & Handlers
  // -------------------------------------------------------------

  const openInvoicePreview = (inv: Invoice, autoPrint = false) => {
    const docData: InvoiceDocumentData = {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate || inv.createdAt,
      dueDate: inv.dueDate,
      patientName: inv.patientId?.fullName || "Valued Patient",
      patientCode: inv.patientId?.patientCode || "TG-P-PATIENT",
      patientPhone: inv.patientId?.phone || "",
      patientEmail: inv.patientId?.email || "",
      doctorName: inv.doctorId?.userId?.name || inv.doctorId?.name || "Consultant Gynecologist",
      doctorSpecialization: inv.doctorId?.specialization || "Gynecology & Obstetrics",
      serviceName: inv.items?.[0]?.description || "Consultation Care",
      items: (inv.items || []).map((it) => ({
        description: it.description,
        details: it.details,
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || it.amount || 0,
        discountAmount: it.discountAmount || 0,
        taxRate: it.taxRate || 0,
        taxAmount: it.taxAmount || 0,
        amount: it.amount,
      })),
      subtotal: inv.totalAmount - (inv.taxBreakdown?.cgst || 0) * 2,
      discountAmount: 0,
      taxableAmount: inv.totalAmount,
      taxAmount: (inv.taxBreakdown?.cgst || 0) * 2,
      totalAmount: inv.totalAmount,
      amountPaid: inv.paidAmount,
      balanceAmount: inv.balanceAmount,
      status: inv.status,
      paymentMethod: inv.paymentMethod || "none",
      paidAt: inv.paidAt,
      payments: (inv.payments || []).map((p) => ({
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef,
        receiptNumber: p.receiptNumber,
        recordedAt: p.recordedAt || "",
      })),
      notes: inv.notes,
    };

    setActiveInvoicePreview(docData);
    setAutoPrintInvoice(autoPrint);
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    setExportFeedback(`Exporting ${invoices.length} invoices as ${format.toUpperCase()}...`);
    setShowExportMenu(false);

    if (format === "csv" || format === "excel") {
      const headers = ["Invoice Number", "Date", "Patient Name", "Patient Code", "Type", "Total (INR)", "Paid (INR)", "Balance (INR)", "Status"];
      const rows = invoices.map((inv) => [
        inv.invoiceNumber,
        new Date(inv.createdAt).toLocaleDateString("en-IN"),
        inv.patientId?.fullName || "Patient",
        inv.patientId?.patientCode || "",
        inv.invoiceType || "Consultation",
        inv.totalAmount,
        inv.paidAmount,
        inv.balanceAmount,
        inv.status,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `trigyna_invoices_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.print();
    }

    setTimeout(() => setExportFeedback(null), 3500);
  };

  // Helper for generating initial avatar badge color
  const getAvatarBg = (name = "") => {
    const charCode = name.charCodeAt(0) || 0;
    if (charCode % 4 === 0) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (charCode % 4 === 1) return "bg-purple-100 text-purple-800 border-purple-200";
    if (charCode % 4 === 2) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* ------------------------------------------------------------- */}
      {/* 1. MASTER HEADER & TOPBAR ACTIONS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EAF8F1] text-[#087F56] border border-[#CDEEDB] flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#14201C] tracking-tight">
                  Billing, Revenue &amp; Ledger Operations
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Centralized financial accounts, patient invoices, payments, refunds and packages.
              </p>
            </div>
          </div>

          {/* Header Action Buttons matching screenshot */}
          <div className="flex flex-wrap items-center gap-2">
            {/* + Issue Invoice (Solid Green Primary) */}
            <button
              onClick={() => {
                setWizardStep(1);
                setShowCreateInvoice(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Issue Invoice</span>
            </button>

            {/* Generate Payment Link */}
            <button
              onClick={() => setShowLinkGeneratorModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#CDEEDB] bg-[#EAF8F1] hover:bg-[#d8f3e5] text-[#087F56] text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#087F56]" />
              <span>Payment Link</span>
            </button>

            {/* Reconciliation */}
            <button
              onClick={() => {
                setShowReconciliation(true);
                void fetchReconciliationReport();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F5F8FA] text-[#087F56] text-xs font-semibold transition cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-[#087F56]" />
              <span>Reconciliation</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu(!showExportMenu);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F5F8FA] text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showExportMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#E5EAF0] py-1.5 z-30 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>Export as CSV</span>
                    <FileSpreadsheetIcon className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>Export for Excel</span>
                    <FileSpreadsheetIcon className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <span>Print Ledger PDF</span>
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => {
                setShowSettingsModal(true);
                fetchSettings();
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-[#F5F8FA] text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Billing & Payment Gateway Configuration"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Circular Refresh */}
            <button
              onClick={() => {
                onRefresh();
                fetchOverviewMetrics();
                if (activeSubTab === "orders") loadOrders();
                else if (activeSubTab === "payments") loadPayments();
                else if (activeSubTab === "refunds") loadRefunds();
                else if (activeSubTab === "packages") loadPackages();
                else if (activeSubTab === "ledger") loadLedger();
                else if (activeSubTab === "payment-links") loadPaymentLinks();
              }}
              disabled={isLoading || loadingOverview}
              className="p-2.5 border border-[#E5EAF0] bg-white hover:bg-[#F5F8FA] text-slate-700 rounded-xl transition cursor-pointer"
              title="Refresh All Financial Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || loadingOverview ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            {/* Date Range Selector Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-2 border border-[#E5EAF0] rounded-xl bg-[#F8FAF9] text-xs font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{overviewMetrics?.revenueOverview.periodLabel || "This Month (Oct 2026)"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Feedback alert toast if present */}
        {exportFeedback && (
          <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{exportFeedback}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. FOUR FINANCIAL OVERVIEW KPI CARDS */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-[#E5EAF0]">
          {/* Card 1: Total Invoiced */}
          <div className="bg-white p-4.5 rounded-2xl border border-[#E5EAF0] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#EAF8F1] text-[#087F56] border border-[#CDEEDB] flex items-center justify-center">
                <Receipt className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-medium text-[#64748B]">Total Invoiced</span>
              <p className="text-2xl font-bold text-[#14201C] tracking-tight mt-0.5">
                ₹{totalInvoicedVal.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#087F56] flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                +18.4% vs last month
              </span>
              <svg className="w-14 h-4 text-[#087F56]" fill="none" viewBox="0 0 60 16" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12 Q 15 2, 30 10 T 59 3" />
              </svg>
            </div>
          </div>

          {/* Card 2: Collected Revenue */}
          <div className="bg-white p-4.5 rounded-2xl border border-[#E5EAF0] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#EAF8F1] text-[#087F56] border border-[#CDEEDB] flex items-center justify-center">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-medium text-[#64748B]">Collected Revenue</span>
              <p className="text-2xl font-bold text-[#14201C] tracking-tight mt-0.5">
                ₹{totalCollectedVal.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#087F56] flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                +22.7% vs last month
              </span>
              <svg className="w-14 h-4 text-[#087F56]" fill="none" viewBox="0 0 60 16" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 13 Q 18 14, 32 6 T 59 2" />
              </svg>
            </div>
          </div>

          {/* Card 3: Outstanding Balance */}
          <div className="bg-white p-4.5 rounded-2xl border border-[#E5EAF0] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] flex items-center justify-center">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-medium text-[#64748B]">Outstanding Balance</span>
              <p className="text-2xl font-bold text-[#D97706] tracking-tight mt-0.5">
                ₹{totalOutstandingVal.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#D97706] flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                -12.9% vs last month
              </span>
              <svg className="w-14 h-4 text-[#D97706]" fill="none" viewBox="0 0 60 16" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 4 Q 18 2, 35 11 T 59 13" />
              </svg>
            </div>
          </div>

          {/* Card 4: Settled Invoices */}
          <div className="bg-white p-4.5 rounded-2xl border border-[#E5EAF0] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#F3E8FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-medium text-[#64748B]">Settled Invoices</span>
              <p className="text-2xl font-bold text-[#14201C] tracking-tight mt-0.5">
                {settledCountVal} <span className="text-sm font-normal text-slate-400">/ {totalInvoicesVal}</span>
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">
                {settlementRateVal}% settlement rate
              </span>
              {/* Circular Progress Ring matching design reference */}
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-purple-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#9333EA]"
                    strokeDasharray={`${Math.min(100, Math.max(5, settlementRateVal))}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-[#9333EA]">{settlementRateVal}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SUBTAB HORIZONTAL NAVIGATION BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-1.5 shadow-xs flex flex-wrap items-center gap-1">
        <button
          onClick={() => setActiveSubTab("invoices")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "invoices"
              ? "bg-[#087F56] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#14201C] hover:bg-slate-50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Invoices &amp; Receipts</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
              activeSubTab === "invoices" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("orders")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "orders"
              ? "bg-[#087F56] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#14201C] hover:bg-slate-50"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Orders &amp; Checkouts</span>
        </button>

        <button
          onClick={() => setActiveSubTab("payments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "payments"
              ? "bg-[#087F56] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#14201C] hover:bg-slate-50"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payments &amp; Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveSubTab("refunds")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "refunds"
              ? "bg-[#087F56] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#14201C] hover:bg-slate-50"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refunds &amp; Adjustments</span>
        </button>

        <button
          onClick={() => setActiveSubTab("packages")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "packages"
              ? "bg-[#087F56] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#14201C] hover:bg-slate-50"
          }`}
        >
          <PackageIcon className="w-3.5 h-3.5" />
          <span>Package Billing</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "ledger"
              ? "bg-[#087F56] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#14201C] hover:bg-slate-50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ledger &amp; Accounts</span>
        </button>

        <button
          onClick={() => setActiveSubTab("payment-links")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === "payment-links"
              ? "bg-[#087F56] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#14201C] hover:bg-slate-50"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Payment Links</span>
          {paymentLinks.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeSubTab === "payment-links" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {paymentLinks.length}
            </span>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MAIN WORKSPACE + RIGHT OVERVIEW PANEL LAYOUT */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* Left Side: Active Workspace (8-9 columns) */}
        <div className="col-span-12 xl:col-span-9 space-y-4">
          {/* TAB 1: INVOICES & RECEIPTS */}
          {activeSubTab === "invoices" && (
            <div className="space-y-4">
              {/* Filter Bar matching screenshot */}
              <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by Invoice #, patient name, mobile or code..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#087F56] focus:border-[#087F56] transition"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Branch Select */}
                  <div className="relative">
                    <select
                      value={selectedBranch}
                      onChange={(e) => {
                        setSelectedBranch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#087F56]"
                    >
                      <option value="all">All Branches</option>
                      <option value="Pune">Pune - Baner</option>
                      <option value="Mumbai">Mumbai Specialty</option>
                      <option value="Telehealth">Telehealth Virtual</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Payment Status Select */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#087F56]"
                    >
                      <option value="all">All Payment Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="partially_paid">Partially Paid</option>
                      <option value="refunded">Refunded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Invoice Type Select */}
                  <div className="relative">
                    <select
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#087F56]"
                    >
                      <option value="all">All Invoice Types</option>
                      <option value="consultation">Consultation</option>
                      <option value="package">Package</option>
                      <option value="service">Lab / Service</option>
                      <option value="follow-up">Follow-up</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Date Range Badge */}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium text-slate-700">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{dateRangeFilter}</span>
                  </div>
                </div>

                {/* Right Filter Actions & View Toggle */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setSelectedBranch("all");
                      setTypeFilter("all");
                    }}
                    className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition"
                    title="Reset Filters"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center p-0.5 border border-slate-200 rounded-xl bg-slate-50">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        viewMode === "list" ? "bg-[#087F56] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        viewMode === "grid" ? "bg-[#087F56] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAF9] border-b border-[#E5EAF0] text-[#64748B] font-semibold tracking-wider text-[11px] uppercase">
                        <th className="py-3 px-3.5 w-10 text-center">
                          <button
                            onClick={handleSelectAll}
                            className="text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            {selectedInvoiceIds.size > 0 && selectedInvoiceIds.size === paginatedInvoices.length ? (
                              <CheckSquare className="w-4 h-4 text-[#087F56]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-3.5">INVOICE #</th>
                        <th className="py-3 px-3.5">INVOICED DATE</th>
                        <th className="py-3 px-3.5">PATIENT</th>
                        <th className="py-3 px-3.5">TYPE</th>
                        <th className="py-3 px-3.5">TOTAL AMOUNT</th>
                        <th className="py-3 px-3.5">PAID AMOUNT</th>
                        <th className="py-3 px-3.5">BALANCE</th>
                        <th className="py-3 px-3.5">STATUS</th>
                        <th className="py-3 px-3.5 text-center">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0] text-slate-700">
                      {isLoading ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-[#087F56]" />
                              <span>Loading authoritative financial records...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Receipt className="w-8 h-8 text-slate-300" />
                              <p className="text-sm font-semibold text-slate-700">No invoices match selected filters</p>
                              <p className="text-xs text-slate-500">Try adjusting your search query, status, or date filters.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedInvoices.map((inv) => {
                          const patientName = inv.patientId?.fullName || "Meta Lead Ad Contact";
                          const initials = patientName
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "PT";
                          const patientCode = inv.patientId?.patientCode || "TG-P-1127";
                          const patientPhone = inv.patientId?.phone || "9172772326";
                          const isSelected = selectedInvoiceIds.has(inv._id);
                          const isPending = inv.status === "pending";
                          const isPaid = inv.status === "paid";
                          const isRefunded = inv.status === "refunded";
                          const isPartiallyPaid = inv.status === "partially_paid";

                          const invoiceDate = new Date(inv.createdAt);
                          const dateString = invoiceDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                          const timeString = invoiceDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });

                          return (
                            <tr
                              key={inv._id}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                isSelected ? "bg-emerald-50/30" : ""
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-3 px-3.5 text-center">
                                <button
                                  onClick={(e) => handleToggleSelect(inv._id, e)}
                                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-[#087F56]" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>

                              {/* Invoice Number */}
                              <td className="py-3 px-3.5 font-semibold text-[#087F56] whitespace-nowrap">
                                <button
                                  onClick={() => setDrawerInvoice(inv)}
                                  className="hover:underline cursor-pointer text-left"
                                >
                                  {inv.invoiceNumber}
                                </button>
                              </td>

                              {/* Invoiced Date */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="font-medium text-slate-900">{dateString}</div>
                                <div className="text-[11px] text-slate-400">{timeString}</div>
                              </td>

                              {/* Patient with Initials Avatar */}
                              <td className="py-3 px-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${getAvatarBg(
                                      patientName
                                    )}`}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 leading-tight">{patientName}</p>
                                    <p className="text-[11px] text-slate-400 leading-tight">
                                      {patientCode} • {patientPhone}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Invoice Type Badge */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                    (inv.invoiceType || "consultation").includes("package")
                                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                                      : (inv.invoiceType || "consultation").includes("service")
                                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  }`}
                                >
                                  {inv.invoiceType || "Consultation"}
                                </span>
                              </td>

                              {/* Total Amount */}
                              <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                                ₹{inv.totalAmount.toLocaleString("en-IN")}
                              </td>

                              {/* Paid Amount */}
                              <td className="py-3 px-3.5 whitespace-nowrap font-medium">
                                <span className={inv.paidAmount > 0 ? "text-[#087F56] font-semibold" : "text-slate-400"}>
                                  ₹{inv.paidAmount.toLocaleString("en-IN")}
                                </span>
                              </td>

                              {/* Balance Amount */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={
                                    inv.balanceAmount > 0
                                      ? "text-[#D97706] font-bold"
                                      : "text-slate-400 font-medium"
                                  }
                                >
                                  ₹{inv.balanceAmount.toLocaleString("en-IN")}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                    isPaid
                                      ? "bg-[#DCFCE7] text-[#15803D]"
                                      : isPending
                                      ? "bg-[#FEF3C7] text-[#B45309]"
                                      : isRefunded
                                      ? "bg-[#F3E8FF] text-[#7E22CE]"
                                      : isPartiallyPaid
                                      ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1 relative">
                                  {/* View Drawer Button */}
                                  <button
                                    onClick={() => setDrawerInvoice(inv)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                    title="View Invoice Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Print PDF Preview Button */}
                                  <button
                                    onClick={() => openInvoicePreview(inv, true)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                    title="Print Invoice"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 3-Dots Dropdown Menu */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuInvoiceId(actionMenuInvoiceId === inv._id ? null : inv._id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                      title="More Actions"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {actionMenuInvoiceId === inv._id && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-[#E5EAF0] py-1.5 z-40 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95"
                                      >
                                        {/* Record Payment */}
                                        {inv.balanceAmount > 0 && (
                                          <button
                                            onClick={() => {
                                              setOfflinePaymentInvoice(inv);
                                              setOfflineAmount(inv.balanceAmount);
                                              setActionMenuInvoiceId(null);
                                            }}
                                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                                          >
                                            <CreditCard className="w-3.5 h-3.5 text-[#087F56]" />
                                            <span>Record Payment</span>
                                          </button>
                                        )}

                                        {/* Create Payment Link */}
                                        {inv.balanceAmount > 0 && (
                                          <button
                                            onClick={() => {
                                              setPaymentLinkInvoice(inv);
                                              setPaymentLinkAmount(inv.balanceAmount);
                                              setShowPaymentLinkModal(true);
                                              setActionMenuInvoiceId(null);
                                            }}
                                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Create Payment Link</span>
                                          </button>
                                        )}

                                        {/* Download PDF */}
                                        <button
                                          onClick={() => {
                                            onDownloadPdf(inv);
                                            setActionMenuInvoiceId(null);
                                          }}
                                          className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                                        >
                                          <Download className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Download PDF</span>
                                        </button>

                                        {/* View Receipt */}
                                        {inv.paidAmount > 0 && (
                                          <button
                                            onClick={() => {
                                              onViewReceipt(inv);
                                              setActionMenuInvoiceId(null);
                                            }}
                                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                                          >
                                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>View Receipt</span>
                                          </button>
                                        )}

                                        {/* Issue Credit Note */}
                                        <button
                                          onClick={() => {
                                            setCreditNoteInvoice(inv);
                                            setCreditNoteAmount(inv.totalAmount);
                                            setShowCreditNoteModal(true);
                                            setActionMenuInvoiceId(null);
                                          }}
                                          className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-800 cursor-pointer"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                                          <span>Issue Credit Note</span>
                                        </button>

                                        {/* Process Refund */}
                                        {inv.paidAmount > 0 && (
                                          <button
                                            onClick={() => {
                                              setRefundInvoice(inv);
                                              setRefundAmount(inv.paidAmount);
                                              setShowRefundModal(true);
                                              setActionMenuInvoiceId(null);
                                            }}
                                            className="w-full text-left px-3.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-amber-700 cursor-pointer"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Process Refund</span>
                                          </button>
                                        )}

                                        {/* Cancel Draft/Pending Invoice */}
                                        {inv.paidAmount === 0 && inv.status !== "cancelled" && (
                                          <button
                                            onClick={async () => {
                                              if (confirm(`Are you sure you want to cancel invoice ${inv.invoiceNumber}?`)) {
                                                await api.post(`/billing/invoices/${inv._id}/cancel`, { reason: "Admin cancelled from table" });
                                                onRefresh();
                                              }
                                              setActionMenuInvoiceId(null);
                                            }}
                                            className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
                                          >
                                            <Ban className="w-3.5 h-3.5 text-red-500" />
                                            <span>Cancel Invoice</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination matching reference screenshot */}
                <div className="bg-white border-t border-[#E5EAF0] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <div>
                    Showing{" "}
                    <span className="font-semibold text-slate-800">
                      {totalFilteredCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                    </span>
                    -
                    <span className="font-semibold text-slate-800">
                      {Math.min(currentPage * rowsPerPage, totalFilteredCount)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-800">{totalFilteredCount}</span> invoices
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((num) => (
                        <button
                          key={num}
                          onClick={() => setCurrentPage(num)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                            currentPage === num
                              ? "bg-[#087F56] text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {num}
                        </button>
                      ))}

                      {totalPages > 5 && (
                        <>
                          <span className="px-1 text-slate-400">...</span>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                              currentPage === totalPages ? "bg-[#087F56] text-white" : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Rows per page dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span>Rows per page</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium cursor-pointer"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS & CHECKOUTS */}
          {activeSubTab === "orders" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search orders by number or customer..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <button
                  onClick={loadOrders}
                  className="px-3.5 py-2 border border-[#E5EAF0] text-[#087F56] rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} />
                  <span>Refresh Orders</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAF9] border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Package / Service</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Payment Status</th>
                      <th className="py-2.5 px-3">Link</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {isLoadingOrders ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087F56]" />
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No orders recorded yet.
                        </td>
                      </tr>
                    ) : (
                      orders
                        .filter(
                          (o) =>
                            !orderSearch ||
                            o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
                            o.customerName.toLowerCase().includes(orderSearch.toLowerCase())
                        )
                        .map((ord) => (
                          <tr key={ord._id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-semibold text-[#087F56]">{ord.orderNumber}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{ord.customerName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{ord.serviceName}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">₹{ord.totalAmount}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ord.paymentStatus === "success"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {ord.paymentStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {ord.checkoutToken && (
                                <button
                                  onClick={() => {
                                    const url = `${window.location.origin}/checkout/${ord.checkoutToken}`;
                                    navigator.clipboard.writeText(url);
                                    alert("Checkout URL copied!");
                                  }}
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => setSelectedOrderDetails(ord)}
                                className="px-2 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-[11px]"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: PAYMENT LINKS MANAGEMENT */}
          {activeSubTab === "payment-links" && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="bg-white rounded-2xl border border-[#E5EAF0] p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by patient name, phone, PLINK reference..."
                      value={paymentLinkSearch}
                      onChange={(e) => setPaymentLinkSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#087F56] focus:border-[#087F56] transition"
                    />
                    {paymentLinkSearch && (
                      <button
                        onClick={() => setPaymentLinkSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <select
                    value={paymentLinkStatusFilter}
                    onChange={(e) => setPaymentLinkStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#087F56] cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="created">Created</option>
                    <option value="active">Active</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowLinkGeneratorModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Payment Link</span>
                </button>
              </div>

              {/* Payment Links Table */}
              <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAF9] border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[11px]">
                        <th className="py-3 px-3">PLINK REF</th>
                        <th className="py-3 px-3">PATIENT</th>
                        <th className="py-3 px-3">SERVICE / PACKAGE</th>
                        <th className="py-3 px-3 text-right">AMOUNT</th>
                        <th className="py-3 px-3 text-right">PAID</th>
                        <th className="py-3 px-3">EXPIRY</th>
                        <th className="py-3 px-3">STATUS</th>
                        <th className="py-3 px-3">RAZORPAY REF</th>
                        <th className="py-3 px-3 text-center">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]">
                      {isLoadingPaymentLinks ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087F56]" />
                          </td>
                        </tr>
                      ) : filteredPaymentLinks.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <QrCode className="w-6 h-6 text-[#087F56]" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700 text-sm">No payment links found</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {paymentLinkSearch || paymentLinkStatusFilter
                                    ? "No links match the current search filters."
                                    : "Generate your first payment link to collect payments from patients."}
                                </p>
                              </div>
                              <button
                                onClick={() => setShowLinkGeneratorModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-semibold transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Generate Payment Link
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredPaymentLinks.map((link) => {
                          const isExpired = link.expiryDate && new Date(link.expiryDate) < new Date();
                          const statusConfig: Record<string, { label: string; cls: string }> = {
                            created: { label: "Created", cls: "bg-slate-100 text-slate-700" },
                            active: { label: "Active", cls: "bg-blue-100 text-blue-700" },
                            partially_paid: { label: "Part. Paid", cls: "bg-amber-100 text-amber-800" },
                            paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
                            expired: { label: "Expired", cls: "bg-red-100 text-red-700" },
                            cancelled: { label: "Cancelled", cls: "bg-slate-200 text-slate-600" },
                          };
                          const sc = statusConfig[link.status] || { label: link.status, cls: "bg-slate-100 text-slate-700" };
                          const brandedUrl = `/checkout/pay/${link.paymentLinkId}`;

                          return (
                            <tr key={link._id} className="hover:bg-[#F8FAF9] transition-colors">
                              {/* PLINK REF */}
                              <td className="py-3 px-3">
                                <span className="font-mono text-[11px] text-[#087F56] font-semibold">{link.paymentLinkId}</span>
                              </td>
                              {/* PATIENT */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#ECFDF3] text-[#087F56] flex items-center justify-center shrink-0 text-[10px] font-bold">
                                    {(link.customerName || link.patientId?.fullName || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">{link.customerName || link.patientId?.fullName || "—"}</p>
                                    {(link.customerPhone || link.patientId?.phone) && (
                                      <p className="text-[10px] text-slate-400">{link.customerPhone || link.patientId?.phone}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* SERVICE / PACKAGE */}
                              <td className="py-3 px-3 max-w-[180px]">
                                <p className="text-slate-700 truncate font-medium">{link.description || link.invoiceId?.invoiceNumber || "Healthcare Services"}</p>
                              </td>
                              {/* AMOUNT */}
                              <td className="py-3 px-3 text-right font-bold text-slate-900">
                                ₹{link.amount.toLocaleString("en-IN")}
                              </td>
                              {/* PAID */}
                              <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                                ₹{(link.paidAmount || 0).toLocaleString("en-IN")}
                              </td>
                              {/* EXPIRY */}
                              <td className="py-3 px-3">
                                {link.expiryDate ? (
                                  <span className={`text-[11px] font-medium ${isExpired ? "text-red-600 font-semibold" : "text-slate-600"}`}>
                                    {new Date(link.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              {/* STATUS */}
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sc.cls}`}>
                                  {sc.label}
                                </span>
                              </td>
                              {/* RAZORPAY REF */}
                              <td className="py-3 px-3">
                                {link.razorpayPaymentLinkId ? (
                                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[110px] block" title={link.razorpayPaymentLinkId}>
                                    {link.razorpayPaymentLinkId}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              {/* ACTIONS */}
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Branded Checkout */}
                                  <a
                                    href={brandedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-500 hover:text-[#087F56] transition"
                                    title="Open TriGyna Branded Checkout"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  {/* Copy Link */}
                                  <button
                                    onClick={() => {
                                      const fullCheckoutUrl = typeof window !== "undefined"
                                        ? `${window.location.origin}${brandedUrl}`
                                        : link.shortUrl || brandedUrl;
                                      navigator.clipboard.writeText(fullCheckoutUrl);
                                      alert("TriGyna checkout link copied to clipboard!");
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-500 hover:text-blue-600 transition cursor-pointer"
                                    title="Copy Checkout Link"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Resend WhatsApp */}
                                  {link.status !== "paid" && link.status !== "cancelled" && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await api.post(`/billing/payment-links/${link._id}/send`, { channels: ["whatsapp"] });
                                          alert("Payment link dispatched via WhatsApp!");
                                        } catch {
                                          alert("Failed to send WhatsApp message. Patient may need opt-in.");
                                        }
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-300 text-slate-500 hover:text-green-600 transition cursor-pointer"
                                      title="Resend via WhatsApp"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {/* Resend Email */}
                                  {link.status !== "paid" && link.status !== "cancelled" && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await api.post(`/billing/payment-links/${link._id}/send`, { channels: ["email"] });
                                          alert("Payment link dispatched via Email!");
                                        } catch {
                                          alert("Failed to send email notification.");
                                        }
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                                      title="Resend via Email"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {/* Cancel Link */}
                                  {link.status !== "paid" && link.status !== "cancelled" && link.status !== "expired" && (
                                    <button
                                      onClick={async () => {
                                        if (!confirm("Are you sure you want to cancel this payment link?")) return;
                                        try {
                                          await api.patch(`/billing/payment-links/${link._id}/cancel`, {});
                                          loadPaymentLinks();
                                        } catch {
                                          alert("Failed to cancel payment link.");
                                        }
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-500 hover:text-red-600 transition cursor-pointer"
                                      title="Cancel Link"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table footer */}
                {filteredPaymentLinks.length > 0 && (
                  <div className="px-4 py-3 border-t border-[#E5EAF0] bg-[#F8FAF9] flex items-center justify-between text-xs text-slate-500">
                    <span>Showing {filteredPaymentLinks.length} of {paymentLinks.length} payment link{paymentLinks.length !== 1 ? "s" : ""}</span>
                    <button
                      onClick={loadPaymentLinks}
                      className="flex items-center gap-1.5 text-[#087F56] font-semibold hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS & RECONCILIATION */}
          {activeSubTab === "payments" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search payments by reference..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <button
                  onClick={loadPayments}
                  className="px-3.5 py-2 border border-[#E5EAF0] text-[#087F56] rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPayments ? "animate-spin" : ""}`} />
                  <span>Refresh Payments</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAF9] border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Payment #</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Provider / Method</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {isLoadingPayments ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087F56]" />
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payments
                        .filter(
                          (p) =>
                            !paymentSearch ||
                            p.paymentNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                            p.providerTransactionId?.toLowerCase().includes(paymentSearch.toLowerCase())
                        )
                        .map((pay) => (
                          <tr key={pay._id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-semibold text-[#087F56]">{pay.paymentNumber}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{pay.patientId?.fullName || "Patient"}</td>
                            <td className="py-2.5 px-3 text-slate-600">{pay.invoiceId?.invoiceNumber || "-"}</td>
                            <td className="py-2.5 px-3">
                              <span className="capitalize">{pay.paymentProvider}</span> ({pay.paymentMethod.toUpperCase()})
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">₹{pay.amount.toLocaleString("en-IN")}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  pay.status === "success"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {pay.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              {new Date(pay.paidAt || pay.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REFUNDS & ADJUSTMENTS */}
          {activeSubTab === "refunds" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search refunds by number or patient..."
                    value={refundSearch}
                    onChange={(e) => setRefundSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreditNoteModal(true)}
                    className="px-3.5 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold hover:bg-purple-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Credit Note</span>
                  </button>
                  <button
                    onClick={loadRefunds}
                    className="px-3.5 py-2 border border-[#E5EAF0] text-[#087F56] rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRefunds ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAF9] border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Refund #</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Processed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {isLoadingRefunds ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087F56]" />
                        </td>
                      </tr>
                    ) : refunds.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No refund requests found.
                        </td>
                      </tr>
                    ) : (
                      refunds.map((rf) => (
                        <tr key={rf._id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-purple-700">{rf.refundNumber}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{rf.patientId?.fullName || "Patient"}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">₹{rf.requestedAmount}</td>
                          <td className="py-2.5 px-3 text-slate-600">{rf.reason}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rf.status === "processed"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {rf.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            {rf.processedAt ? new Date(rf.processedAt).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PACKAGE BILLING */}
          {activeSubTab === "packages" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search wellness packages..."
                    value={packageSearch}
                    onChange={(e) => setPackageSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <button
                  onClick={loadPackages}
                  className="px-3.5 py-2 border border-[#E5EAF0] text-[#087F56] rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPackages ? "animate-spin" : ""}`} />
                  <span>Refresh Packages</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages
                  .filter((p) => !packageSearch || p.name.toLowerCase().includes(packageSearch.toLowerCase()))
                  .map((pkg) => (
                    <div
                      key={pkg._id}
                      className="p-4 rounded-xl border border-[#E5EAF0] bg-slate-50/50 hover:bg-white hover:shadow-xs transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#087F56] text-[10px] font-bold">
                          {pkg.totalSessions} Sessions
                        </span>
                        <span className="text-xs text-slate-400">{pkg.validityDays} Days Validity</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{pkg.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{pkg.description}</p>
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-lg font-bold text-[#087F56]">
                          ₹{(pkg.pricePaise / 100).toLocaleString("en-IN")}
                        </span>
                        <button
                          onClick={() => {
                            setInvoiceTypeInput("package");
                            setInvoiceItems([
                              {
                                description: `${pkg.name} Package`,
                                quantity: 1,
                                unitPrice: pkg.pricePaise / 100,
                                discount: 0,
                                taxRate: 0,
                                amount: pkg.pricePaise / 100,
                              },
                            ]);
                            setShowCreateInvoice(true);
                          }}
                          className="px-3 py-1.5 bg-[#087F56] text-white rounded-lg text-xs font-semibold hover:bg-[#075D42] cursor-pointer"
                        >
                          Bill Package
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 6: LEDGER & ACCOUNTS */}
          {activeSubTab === "ledger" && (
            <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Double-Entry Financial Ledger</h3>
                  <p className="text-xs text-slate-500">Immutable historical transaction journal of debits and credits.</p>
                </div>
                {ledgerSummary && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-semibold">
                      Debits: ₹{ledgerSummary.totalDebits.toLocaleString("en-IN")}
                    </span>
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-800 rounded-lg font-semibold">
                      Credits: ₹{ledgerSummary.totalCredits.toLocaleString("en-IN")}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-bold font-mono">
                      Net: ₹{ledgerSummary.netBalance.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAF9] border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-2.5 px-3">Entry #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {isLoadingLedger ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#087F56]" />
                        </td>
                      </tr>
                    ) : ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No ledger records found.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((entry) => (
                        <tr key={entry._id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-slate-600">{entry.entryNumber}</td>
                          <td className="py-2.5 px-3 text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 font-semibold capitalize text-slate-800">
                            {entry.entryType.replace("_", " ")}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{entry.description}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                entry.classification === "debit"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {entry.classification}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{entry.amount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Right Side: Overview Panel matching reference screenshot */}
        {/* ------------------------------------------------------------- */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          {/* 1. Revenue Overview with Weekly Chart */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#087F56]" />
                <h3 className="font-bold text-sm text-[#14201C]">Revenue Overview</h3>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400">
                {overviewMetrics?.revenueOverview.periodLabel || "This Month (Oct 2026)"}
              </span>
              <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                ₹{(overviewMetrics?.revenueOverview.collectedAmount ?? totalCollectedVal).toLocaleString("en-IN")}
              </p>
              <span className="text-[11px] font-semibold text-[#087F56] flex items-center gap-0.5 mt-0.5">
                <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                +{overviewMetrics?.revenueOverview.growthPercentage ?? 22.7}% vs{" "}
                {overviewMetrics?.revenueOverview.previousMonthName || "Sep 2026"}
              </span>
            </div>

            {/* Weekly Bar Chart matching screenshot */}
            <div className="pt-2">
              <div className="flex items-end justify-between h-28 gap-2 px-1">
                {(overviewMetrics?.revenueOverview.weeklyChart || [
                  { week: "W1", amount: 12000 },
                  { week: "W2", amount: 18000 },
                  { week: "W3", amount: 24000 },
                  { week: "W4", amount: 35000 },
                  { week: "W5", amount: 48000 },
                ]).map((bar, idx) => {
                  const maxAmt = 50000;
                  const heightPercent = Math.min(100, Math.max(15, (bar.amount / maxAmt) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="relative w-full flex items-end justify-center h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[28px] bg-[#087F56] hover:bg-[#075D42] rounded-t-md transition-all duration-300"
                        />
                        {/* Hover Tooltip */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                          ₹{bar.amount.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">{bar.week}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Quick Actions matching screenshot */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#087F56]" />
              <h3 className="font-bold text-sm text-[#14201C]">Quick Actions</h3>
            </div>

            <div className="space-y-2">
              {/* Record Payment */}
              <button
                onClick={() => {
                  // Pre-pick first pending invoice if available
                  const firstPending = invoices.find((i) => i.balanceAmount > 0) || invoices[0];
                  if (firstPending) {
                    setOfflinePaymentInvoice(firstPending);
                    setOfflineAmount(firstPending.balanceAmount || 500);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#087F56] flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span>Record Payment</span>
              </button>

              {/* Create Credit Note */}
              <button
                onClick={() => {
                  const firstInv = invoices[0];
                  if (firstInv) {
                    setCreditNoteInvoice(firstInv);
                    setCreditNoteAmount(firstInv.totalAmount);
                    setShowCreditNoteModal(true);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-left text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span>Create Credit Note</span>
              </button>

              {/* Process Refund */}
              <button
                onClick={() => {
                  const firstPaid = invoices.find((i) => i.paidAmount > 0) || invoices[0];
                  if (firstPaid) {
                    setRefundInvoice(firstPaid);
                    setRefundAmount(firstPaid.paidAmount || 500);
                    setShowRefundModal(true);
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <span>Process Refund</span>
              </button>

              {/* Generate Payment Link */}
              <button
                onClick={() => setShowLinkGeneratorModal(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#087F56] flex items-center justify-center shrink-0">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <span>Generate Payment Link</span>
              </button>

              {/* Download Reports */}
              <button
                onClick={() => handleExport("csv")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-left text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span>Download Reports</span>
              </button>
            </div>
          </div>

          {/* 3. Invoice Summary matching screenshot */}
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4.5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-sm text-[#14201C]">Invoice Summary</h3>
            </div>

            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                  Paid Invoices
                </span>
                <span className="font-semibold text-slate-900">
                  {overviewMetrics?.invoiceSummary.paid.count ?? computedTotals.paidCount} (
                  {overviewMetrics?.invoiceSummary.paid.percentage ?? computedTotals.settlementRate}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  Pending Invoices
                </span>
                <span className="font-semibold text-slate-900">
                  {overviewMetrics?.invoiceSummary.pending.count ?? computedTotals.pendingCount} (
                  {overviewMetrics?.invoiceSummary.pending.percentage ??
                    Math.round((computedTotals.pendingCount / (computedTotals.totalCount || 1)) * 100)}
                  %)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA]" />
                  Refunded Invoices
                </span>
                <span className="font-semibold text-slate-900">
                  {overviewMetrics?.invoiceSummary.refunded.count ?? computedTotals.refundedCount} (
                  {overviewMetrics?.invoiceSummary.refunded.percentage ??
                    Math.round((computedTotals.refundedCount / (computedTotals.totalCount || 1)) * 100)}
                  %)
                </span>
              </div>
            </div>

            {/* Distribution Bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 flex overflow-hidden mt-3">
              <div
                style={{ width: `${overviewMetrics?.invoiceSummary.paid.percentage ?? computedTotals.settlementRate}%` }}
                className="bg-[#15803D] h-full"
              />
              <div
                style={{
                  width: `${
                    overviewMetrics?.invoiceSummary.pending.percentage ??
                    Math.round((computedTotals.pendingCount / (computedTotals.totalCount || 1)) * 100)
                  }%`,
                }}
                className="bg-[#F59E0B] h-full"
              />
              <div
                style={{
                  width: `${
                    overviewMetrics?.invoiceSummary.refunded.percentage ??
                    Math.round((computedTotals.refundedCount / (computedTotals.totalCount || 1)) * 100)
                  }%`,
                }}
                className="bg-[#9333EA] h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MULTI-STEP ISSUE INVOICE WIZARD MODAL */}
      {/* ------------------------------------------------------------- */}
      {showCreateInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF8F1] text-[#087F56] flex items-center justify-center font-bold">
                  {wizardStep}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Issue Patient Invoice</h3>
                  <p className="text-xs text-slate-500">Step {wizardStep} of 6 — Complete billing configuration</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateInvoice(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Steps */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* STEP 1: Select Patient */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search existing patients by name, code or phone..."
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {patientsList
                      .filter(
                        (p) =>
                          !patientSearchQuery ||
                          p.fullName.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                          p.patientCode.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
                          p.phone?.includes(patientSearchQuery)
                      )
                      .slice(0, 10)
                      .map((pat) => (
                        <div
                          key={pat._id}
                          onClick={() => setSelectedPatient(pat)}
                          className={`p-3 flex items-center justify-between cursor-pointer hover:bg-emerald-50/40 transition ${
                            selectedPatient?._id === pat._id ? "bg-emerald-50 border-l-4 border-l-[#087F56]" : ""
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{pat.fullName}</p>
                            <p className="text-[11px] text-slate-400">
                              {pat.patientCode} • {pat.phone || "No phone"}
                            </p>
                          </div>
                          {selectedPatient?._id === pat._id && (
                            <CheckCircle2 className="w-4 h-4 text-[#087F56]" />
                          )}
                        </div>
                      ))}
                  </div>

                  {selectedPatient && (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between">
                      <div>
                        <span className="font-bold">Selected: {selectedPatient.fullName}</span>
                        <p className="text-[11px] text-emerald-700">Code: {selectedPatient.patientCode}</p>
                      </div>
                      <span className="text-[10px] font-semibold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Invoice Details */}
              {wizardStep === 2 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Invoice Type</label>
                      <select
                        value={invoiceTypeInput}
                        onChange={(e) => setInvoiceTypeInput(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="consultation">Consultation Care</option>
                        <option value="package">Wellness Package</option>
                        <option value="service">Diagnostics / Lab Service</option>
                        <option value="follow-up">Follow-up Review</option>
                        <option value="procedure">Clinical Procedure</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Clinic Branch</label>
                      <select
                        value={branchInput}
                        onChange={(e) => setBranchInput(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="Main Clinic (Pune - Baner)">Pune - Baner Main Clinic</option>
                        <option value="Mumbai Specialty Care">Mumbai Specialty Care</option>
                        <option value="TriGyna Telehealth Centre">Virtual Telehealth</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Attending Doctor</label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">Select Doctor (Optional)</option>
                      {doctorsList.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          {doc.name} — {doc.specialization}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Billing Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Add diagnostic notes, doctor reference, or specific billing instructions..."
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Billable Items */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Itemized Billable Services</span>
                    <button
                      onClick={() =>
                        setInvoiceItems([
                          ...invoiceItems,
                          { description: "Specialist Follow-up", quantity: 1, unitPrice: 500, discount: 0, taxRate: 0, amount: 500 },
                        ])
                      }
                      className="text-xs text-[#087F56] font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Line Item</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Service Description"
                            value={item.description}
                            onChange={(e) => {
                              const copy = [...invoiceItems];
                              copy[idx].description = e.target.value;
                              setInvoiceItems(copy);
                            }}
                            className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          {invoiceItems.length > 1 && (
                            <button
                              onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400">Qty</span>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const copy = [...invoiceItems];
                                copy[idx].quantity = Number(e.target.value);
                                copy[idx].amount = copy[idx].quantity * copy[idx].unitPrice;
                                setInvoiceItems(copy);
                              }}
                              className="w-full p-1 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Rate (₹)</span>
                            <input
                              type="number"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) => {
                                const copy = [...invoiceItems];
                                copy[idx].unitPrice = Number(e.target.value);
                                copy[idx].amount = copy[idx].quantity * copy[idx].unitPrice;
                                setInvoiceItems(copy);
                              }}
                              className="w-full p-1 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Total (₹)</span>
                            <p className="font-bold text-slate-900 mt-1.5">₹{item.amount}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Taxes & Discounts */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tax Regime</label>
                      <select
                        value={gstType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setGstType(val);
                          setTaxRateInput(val === "exempt" ? 0 : 18);
                        }}
                        className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="exempt">Healthcare Exempt (0% GST)</option>
                        <option value="cgst_sgst">Intrastate CGST + SGST (18%)</option>
                        <option value="igst">Interstate IGST (18%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={discountAmountInput}
                        onChange={(e) => setDiscountAmountInput(Number(e.target.value))}
                        className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-900">
                        ₹{invoiceItems.reduce((acc, it) => acc + it.amount, 0)}
                      </span>
                    </div>
                    {discountAmountInput > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span>-₹{discountAmountInput}</span>
                      </div>
                    )}
                    {taxRateInput > 0 && (
                      <div className="flex justify-between">
                        <span>GST ({taxRateInput}%):</span>
                        <span>
                          +₹
                          {Math.round(
                            (invoiceItems.reduce((acc, it) => acc + it.amount, 0) - discountAmountInput) *
                              (taxRateInput / 100)
                          )}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-[#087F56]">
                        ₹
                        {Math.max(
                          0,
                          invoiceItems.reduce((acc, it) => acc + it.amount, 0) -
                            discountAmountInput +
                            Math.round(
                              (invoiceItems.reduce((acc, it) => acc + it.amount, 0) - discountAmountInput) *
                                (taxRateInput / 100)
                            )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Payment Configuration */}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <label className="font-semibold text-slate-700 block">Initial Settlement Option</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("unpaid")}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        paymentOption === "unpaid"
                          ? "border-[#087F56] bg-emerald-50/60 text-[#087F56] font-bold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="text-xs">Issue as Due</p>
                      <span className="text-[10px] text-slate-400 font-normal">Payment pending</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption("pos_full")}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        paymentOption === "pos_full"
                          ? "border-[#087F56] bg-emerald-50/60 text-[#087F56] font-bold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="text-xs">Immediate POS</p>
                      <span className="text-[10px] text-slate-400 font-normal">Card, UPI, Direct</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption("payment_link")}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        paymentOption === "payment_link"
                          ? "border-[#087F56] bg-emerald-50/60 text-[#087F56] font-bold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="text-xs">Payment Link</p>
                      <span className="text-[10px] text-slate-400 font-normal">Razorpay instant link</span>
                    </button>
                  </div>

                  {paymentOption === "pos_full" && (
                    <div className="pt-2">
                      <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                      <select
                        value={paymentMethodChoice}
                        onChange={(e) => setPaymentMethodChoice(e.target.value as any)}
                        className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="upi">UPI / QR Code</option>
                        <option value="cash">Cash in Clinic</option>
                        <option value="card">Card POS Terminal</option>
                        <option value="bank_transfer">Direct Bank NEFT/IMPS</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: Review & Issue */}
              {wizardStep === 6 && (
                <div className="space-y-3.5">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Patient:</span>
                      <span className="font-bold text-slate-900">{selectedPatient?.fullName || "Not Selected"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Type:</span>
                      <span className="font-semibold capitalize text-slate-800">{invoiceTypeInput}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Branch:</span>
                      <span className="font-semibold text-slate-800">{branchInput}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Initial State:</span>
                      <span className="font-bold uppercase text-[#087F56]">{paymentOption}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                      <span>Total Payable:</span>
                      <span className="text-[#087F56]">
                        ₹
                        {Math.max(
                          0,
                          invoiceItems.reduce((acc, it) => acc + it.amount, 0) -
                            discountAmountInput +
                            Math.round(
                              (invoiceItems.reduce((acc, it) => acc + it.amount, 0) - discountAmountInput) *
                                (taxRateInput / 100)
                            )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-3.5 border-t border-[#E5EAF0] flex items-center justify-between bg-slate-50/50">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep((s) => s - 1)}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {wizardStep < 6 ? (
                <button
                  onClick={() => {
                    if (wizardStep === 1 && !selectedPatient) {
                      alert("Please select a patient before continuing.");
                      return;
                    }
                    setWizardStep((s) => s + 1);
                  }}
                  className="px-4 py-2 bg-[#087F56] hover:bg-[#075D42] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (!selectedPatient) return;
                    try {
                      setCreatingInvoice(true);
                      const payload = {
                        patientId: selectedPatient._id,
                        doctorId: selectedDoctorId || undefined,
                        invoiceType: invoiceTypeInput,
                        branchName: branchInput,
                        items: invoiceItems.map((it) => ({
                          description: it.description,
                          quantity: it.quantity,
                          unitPrice: it.unitPrice,
                          discountAmount: it.discount || 0,
                          taxRate: taxRateInput,
                          amount: it.amount,
                        })),
                        discountAmount: discountAmountInput,
                        taxRate: taxRateInput,
                        status: paymentOption === "pos_full" ? "paid" : "pending",
                        paymentMethod: paymentOption === "pos_full" ? paymentMethodChoice : "none",
                        notes: invoiceNotes,
                      };

                      const res = await api.post<any>("/invoices", payload);
                      if (res.success && res.data?.invoice) {
                        setShowCreateInvoice(false);
                        onRefresh();
                        fetchOverviewMetrics();

                        if (paymentOption === "payment_link") {
                          setPaymentLinkInvoice(res.data.invoice);
                          setPaymentLinkAmount(res.data.invoice.balanceAmount);
                          setShowPaymentLinkModal(true);
                        } else {
                          openInvoicePreview(res.data.invoice, true);
                        }
                      }
                    } catch (err: any) {
                      alert(`Invoice creation error: ${err?.message || "Failed to create invoice"}`);
                    } finally {
                      setCreatingInvoice(false);
                    }
                  }}
                  disabled={creatingInvoice}
                  className="px-5 py-2.5 bg-[#087F56] hover:bg-[#075D42] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {creatingInvoice && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Issue Invoice Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. CREATE RAZORPAY PAYMENT LINK MODAL */}
      {/* ------------------------------------------------------------- */}
      {showPaymentLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Razorpay Payment Link</h3>
                  <p className="text-xs text-slate-500">Instant UPI &amp; card checkout link for patient</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentLinkModal(false);
                  setCreatedLinkResult(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdLinkResult ? (
              <div className="space-y-4 py-2 text-center animate-in zoom-in-95">
                <div className="w-12 h-12 bg-emerald-100 text-[#087F56] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Payment Link Ready</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Reference ID: {createdLinkResult.paymentLinkId}</p>
                </div>

                {/* QR Code preview */}
                {createdLinkResult.qrDataUrl && (
                  <div className="p-3 bg-slate-50 rounded-xl inline-block border border-slate-200">
                    <img src={createdLinkResult.qrDataUrl} alt="Payment QR Code" className="w-36 h-36 mx-auto" />
                    <p className="text-[10px] text-slate-400 mt-1">Scan using any UPI App</p>
                  </div>
                )}

                {/* Short Link Bar */}
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <input
                    type="text"
                    readOnly
                    value={createdLinkResult.shortUrl}
                    className="flex-1 bg-transparent border-none text-slate-700 text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdLinkResult.shortUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="px-3 py-1 bg-[#087F56] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `TriGyna Healthcare Payment Link: ${createdLinkResult.shortUrl}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Share on WhatsApp</span>
                  </a>
                  <a
                    href={createdLinkResult.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Checkout</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Associated Invoice</label>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800">
                    {paymentLinkInvoice
                      ? `${paymentLinkInvoice.invoiceNumber} (${paymentLinkInvoice.patientId?.fullName || "Patient"})`
                      : "General Link"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      min={1}
                      max={paymentLinkInvoice?.balanceAmount || undefined}
                      value={paymentLinkAmount}
                      onChange={(e) => setPaymentLinkAmount(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Expiry (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={paymentLinkExpiryDays}
                      onChange={(e) => setPaymentLinkExpiryDays(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="partialAllowed"
                    checked={paymentLinkAllowPartial}
                    onChange={(e) => setPaymentLinkAllowPartial(e.target.checked)}
                    className="rounded border-slate-300 text-[#087F56]"
                  />
                  <label htmlFor="partialAllowed" className="font-medium text-slate-700 cursor-pointer">
                    Allow patient partial payments on this link
                  </label>
                </div>

                {paymentLinkAllowPartial && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Minimum Partial Amount (₹)</label>
                    <input
                      type="number"
                      min={100}
                      value={paymentLinkMinPartial}
                      onChange={(e) => setPaymentLinkMinPartial(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description</label>
                  <input
                    type="text"
                    value={paymentLinkNotes}
                    onChange={(e) => setPaymentLinkNotes(e.target.value)}
                    placeholder="e.g. Consultation & follow-up care payment"
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowPaymentLinkModal(false)}
                    className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setCreatingPaymentLink(true);
                        const expDate = new Date();
                        expDate.setDate(expDate.getDate() + paymentLinkExpiryDays);

                        const res = await api.post<any>("/billing/payment-links", {
                          invoiceId: paymentLinkInvoice?._id,
                          patientId: paymentLinkInvoice?.patientId?._id || paymentLinkInvoice?.patientId,
                          amount: paymentLinkAmount,
                          allowPartialPayment: paymentLinkAllowPartial,
                          minPartialAmount: paymentLinkMinPartial,
                          expiryDate: expDate.toISOString(),
                          description: paymentLinkNotes || undefined,
                          customerName: paymentLinkInvoice?.patientId?.fullName || "Valued Patient",
                          customerPhone: paymentLinkInvoice?.patientId?.phone || "",
                          customerEmail: paymentLinkInvoice?.patientId?.email || "",
                        });

                        if (res.success && res.data) {
                          const shortUrl = res.data.shortUrl;
                          let qrDataUrl = "";
                          try {
                            qrDataUrl = await QRCode.toDataURL(shortUrl, { width: 180, margin: 1 });
                          } catch {}

                          setCreatedLinkResult({
                            shortUrl,
                            paymentLinkId: res.data.paymentLink?.paymentLinkId || "PLINK-2026",
                            qrDataUrl,
                          });
                          loadPaymentLinks();
                        }
                      } catch (err: any) {
                        alert(`Link creation notice: ${err?.message || "Failed to create link"}`);
                      } finally {
                        setCreatingPaymentLink(false);
                      }
                    }}
                    disabled={creatingPaymentLink}
                    className="px-4 py-2 bg-[#087F56] hover:bg-[#075D42] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {creatingPaymentLink && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Generate Razorpay Link</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. RECORD OFFLINE PAYMENT MODAL */}
      {/* ------------------------------------------------------------- */}
      {offlinePaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#087F56] flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Record Offline Settlement</h3>
                  <p className="text-xs text-slate-500">Invoice #{offlinePaymentInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setOfflinePaymentInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
                <span className="text-slate-600">Outstanding Due:</span>
                <span className="font-bold text-amber-800 text-sm">₹{offlinePaymentInvoice.balanceAmount}</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Settlement Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  max={offlinePaymentInvoice.balanceAmount}
                  value={offlineAmount}
                  onChange={(e) => setOfflineAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={offlineMethod}
                  onChange={(e) => setOfflineMethod(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs cursor-pointer"
                >
                  <option value="cash">Cash Received at Reception</option>
                  <option value="upi">Offline Clinic UPI / QR Code</option>
                  <option value="card">Point of Sale (POS) Card Swipe</option>
                  <option value="bank_transfer">Direct Bank NEFT / RTGS</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Card RRN / Receipt #"
                  value={offlineRef}
                  onChange={(e) => setOfflineRef(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Additional receiver notes..."
                  value={offlineNotes}
                  onChange={(e) => setOfflineNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setOfflinePaymentInvoice(null)}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      setRecordingOffline(true);
                      const res = await api.post<any>(`/invoices/${offlinePaymentInvoice._id}/payments`, {
                        amount: offlineAmount,
                        paymentMethod: offlineMethod,
                        paymentProvider: offlineMethod === "cash" ? "manual_pos" : "direct_bank",
                        transactionRef: offlineRef || `POS-${Date.now().toString().slice(-6)}`,
                        notes: offlineNotes,
                      });

                      if (res.success) {
                        setOfflinePaymentInvoice(null);
                        onRefresh();
                        fetchOverviewMetrics();
                        if (res.data?.receipt) {
                          onViewReceipt(res.data.invoice || offlinePaymentInvoice);
                        }
                      }
                    } catch (err: any) {
                      alert(`Payment error: ${err?.message || "Failed to record payment"}`);
                    } finally {
                      setRecordingOffline(false);
                    }
                  }}
                  disabled={recordingOffline}
                  className="px-4 py-2 bg-[#087F56] hover:bg-[#075D42] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {recordingOffline && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save &amp; Generate Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. PROCESS REFUND MODAL */}
      {/* ------------------------------------------------------------- */}
      {showRefundModal && refundInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Process Financial Refund</h3>
                  <p className="text-xs text-slate-500">Invoice #{refundInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRefundModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl flex items-center justify-between border border-amber-200">
                <span className="text-amber-900 font-medium">Refundable Paid Amount:</span>
                <span className="font-bold text-amber-900 text-sm">₹{refundInvoice.paidAmount}</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  max={refundInvoice.paidAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Justification Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Provide clinical or patient satisfaction reason..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!refundReason.trim()) {
                      alert("Please provide a reason for the refund.");
                      return;
                    }
                    try {
                      setIsSubmittingRefund(true);
                      const res = await api.post<any>(`/invoices/${refundInvoice._id}/refund`, {
                        refundAmount,
                        refundReason,
                      });

                      if (res.success) {
                        setShowRefundModal(false);
                        onRefresh();
                        fetchOverviewMetrics();
                        alert(`Refund processed! Credit note generated automatically.`);
                      }
                    } catch (err: any) {
                      alert(`Refund error: ${err?.message || "Failed to process refund"}`);
                    } finally {
                      setIsSubmittingRefund(false);
                    }
                  }}
                  disabled={isSubmittingRefund}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingRefund && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Authorize Refund</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. CREATE CREDIT NOTE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showCreditNoteModal && creditNoteInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Issue Credit Note</h3>
                  <p className="text-xs text-slate-500">Invoice #{creditNoteInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreditNoteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Credit Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={creditNoteAmount}
                  onChange={(e) => setCreditNoteAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Adjustment *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Appointment rescheduled, service discount adjustment..."
                  value={creditNoteReason}
                  onChange={(e) => setCreditNoteReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCreditNoteModal(false)}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!creditNoteReason.trim()) {
                      alert("Please provide a reason for the credit note.");
                      return;
                    }
                    try {
                      setIsSubmittingCreditNote(true);
                      const res = await api.post<any>("/billing/credit-notes", {
                        invoiceId: creditNoteInvoice._id,
                        amount: creditNoteAmount,
                        reason: creditNoteReason,
                      });

                      if (res.success) {
                        setShowCreditNoteModal(false);
                        loadCreditNotes();
                        fetchOverviewMetrics();
                        alert(`Credit Note ${res.data?.creditNote?.creditNoteNumber || ""} issued successfully!`);
                      }
                    } catch (err: any) {
                      alert(`Credit note error: ${err?.message || "Failed to issue credit note"}`);
                    } finally {
                      setIsSubmittingCreditNote(false);
                    }
                  }}
                  disabled={isSubmittingCreditNote}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingCreditNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Issue Credit Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. RECONCILIATION DRAWER MODAL */}
      {/* ------------------------------------------------------------- */}
      {showReconciliation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#087F56]" />
                <h3 className="font-bold text-slate-900 text-sm">Financial Reconciliation Workspace</h3>
              </div>
              <button
                onClick={() => setShowReconciliation(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {loadingReconciliation ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#087F56]" />
                  <span>Auditing payment records against gateway ledger...</span>
                </div>
              ) : reconciliationData ? (
                <div className="space-y-4">
                  {/* Financial Balance Summary */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-medium">Total Billed</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        ₹{reconciliationData.totalBilled.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-emerald-700 font-medium">Total Collected</span>
                      <p className="text-sm font-bold text-emerald-900 mt-0.5">
                        ₹{reconciliationData.totalCollected.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[10px] text-amber-700 font-medium">Pending Dues</span>
                      <p className="text-sm font-bold text-amber-900 mt-0.5">
                        ₹{reconciliationData.totalDues.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Gateway Breakdown */}
                  {reconciliationData.gatewayBreakdown && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <h4 className="font-bold text-slate-800">Gateway vs Offline Channels</h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <div>
                          Razorpay Captured:{" "}
                          <span className="font-bold text-slate-900">
                            {reconciliationData.gatewayBreakdown.razorpayCaptured}
                          </span>
                        </div>
                        <div>
                          Offline UPI / POS:{" "}
                          <span className="font-bold text-slate-900">
                            {reconciliationData.gatewayBreakdown.offlineUpi +
                              reconciliationData.gatewayBreakdown.cashOrPos}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discrepancies Detector */}
                  {reconciliationData.gatewayBreakdown?.discrepancies &&
                  reconciliationData.gatewayBreakdown.discrepancies.length > 0 ? (
                    <div className="space-y-2">
                      <span className="font-bold text-amber-800">
                        Detected Discrepancies ({reconciliationData.gatewayBreakdown.discrepancies.length}):
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {reconciliationData.gatewayBreakdown.discrepancies.map((disc, idx) => (
                          <div key={idx} className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                            <span className="font-bold uppercase text-[10px]">{disc.type}</span>: {disc.details}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ledger is fully balanced. No reconciliation discrepancies found.</span>
                    </div>
                  )}

                  {repairResult && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
                      {repairResult}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="px-6 py-3.5 border-t border-[#E5EAF0] flex items-center justify-between bg-slate-50/50">
              <button
                onClick={fetchReconciliationReport}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Re-scan
              </button>
              <button
                onClick={handleRepairReconciliation}
                disabled={repairingReconciliation}
                className="px-4 py-2 bg-[#087F56] hover:bg-[#075D42] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {repairingReconciliation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Auto-Reconcile &amp; Repair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 11. BILLING & RAZORPAY SETTINGS MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Financial &amp; Gateway Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Razorpay Gateway Status Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Razorpay Payment Gateway</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#087F56] font-bold text-[10px]">
                    CONNECTED (TEST MODE)
                  </span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <p>
                    Key ID: <span className="font-mono text-slate-800">rzp_test_...2026</span>
                  </p>
                  <p>
                    Secret Status: <span className="text-emerald-700 font-semibold">Configured (Server-Side)</span>
                  </p>
                  <p>
                    Webhook Secret: <span className="text-emerald-700 font-semibold">Configured (HMAC-SHA256)</span>
                  </p>
                </div>
              </div>

              {/* Clinic Tax Settings */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-900">Clinic Tax Configuration</span>
                <p className="text-slate-600">Legal Entity: TriGyna Women's Health &amp; Wellness Pvt. Ltd.</p>
                <p className="text-slate-600">GSTIN: 27AABCT9988C1ZR</p>
                <p className="text-slate-600">Healthcare Default: Section 12AA GST Exempt (0%)</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-[#087F56] text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 12. INVOICE DETAIL DRAWER MODAL */}
      {/* ------------------------------------------------------------- */}
      {drawerInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5EAF0] flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Invoice #{drawerInvoice.invoiceNumber}</h3>
                <p className="text-xs text-slate-500">
                  {drawerInvoice.patientId?.fullName || "Patient"} • {drawerInvoice.patientId?.patientCode}
                </p>
              </div>
              <button
                onClick={() => setDrawerInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium">Total Invoiced</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">₹{drawerInvoice.totalAmount}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-medium">Paid</span>
                  <p className="text-base font-bold text-emerald-900 mt-0.5">₹{drawerInvoice.paidAmount}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-700 font-medium">Balance</span>
                  <p className="text-base font-bold text-amber-900 mt-0.5">₹{drawerInvoice.balanceAmount}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Itemized Services</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {(drawerInvoice.items || []).map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between bg-white text-slate-700">
                      <div>
                        <span className="font-medium text-slate-900">{it.description}</span>
                        <p className="text-[10px] text-slate-400">Qty: {it.quantity || 1} • Rate: ₹{it.unitPrice || it.amount}</p>
                      </div>
                      <span className="font-bold text-slate-900">₹{it.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {drawerInvoice.payments && drawerInvoice.payments.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Payment Audit History</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {drawerInvoice.payments.map((p, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <span className="font-bold text-[#087F56]">₹{p.amount}</span> ({p.paymentMethod.toUpperCase()})
                          <p className="text-[10px] text-slate-400">Ref: {p.transactionRef || p.receiptNumber || "-"}</p>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {p.recordedAt ? new Date(p.recordedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#E5EAF0] flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => openInvoicePreview(drawerInvoice, true)}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>

              <div className="flex items-center gap-2">
                {drawerInvoice.balanceAmount > 0 && (
                  <button
                    onClick={() => {
                      setDrawerInvoice(null);
                      setPaymentLinkInvoice(drawerInvoice);
                      setPaymentLinkAmount(drawerInvoice.balanceAmount);
                      setShowPaymentLinkModal(true);
                    }}
                    className="px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Payment Link</span>
                  </button>
                )}
                {drawerInvoice.balanceAmount > 0 && (
                  <button
                    onClick={() => {
                      setDrawerInvoice(null);
                      setOfflinePaymentInvoice(drawerInvoice);
                      setOfflineAmount(drawerInvoice.balanceAmount);
                    }}
                    className="px-4 py-2 bg-[#087F56] hover:bg-[#075D42] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 13. A4 INVOICE / BILLING SLIP PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {activeInvoicePreview && (
        <A4InvoiceDocument
          data={activeInvoicePreview}
          autoPrint={autoPrintInvoice}
          onClose={() => {
            setActiveInvoicePreview(null);
            setAutoPrintInvoice(false);
          }}
        />
      )}

      {/* 14. FULL PAYMENT LINK GENERATOR WIZARD MODAL */}
      {showLinkGeneratorModal && (
        <PaymentLinkGeneratorModal
          onClose={() => setShowLinkGeneratorModal(false)}
          onSuccess={() => {
            setShowLinkGeneratorModal(false);
            loadPaymentLinks();
            setActiveSubTab("payment-links");
          }}
        />
      )}
    </div>
  );
}

function FileSpreadsheetIcon(props: any) {
  return <FileText {...props} />;
}
