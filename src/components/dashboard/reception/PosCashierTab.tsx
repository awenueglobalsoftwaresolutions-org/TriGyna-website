"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Receipt,
  Search,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  X,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Patient } from "./QueueDeskTab";
import { A4PaymentReceipt, PaymentReceiptData } from "@/components/billing/A4PaymentReceipt";
import { api } from "@/lib/api/client";

export interface Invoice {
  _id: string;
  invoiceCode?: string;
  invoiceNumber?: string;
  patientId: Patient;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number; amount?: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  status: "draft" | "issued" | "paid" | "partially_paid" | "void";
  paymentMethod?: string;
  appointmentId?: string | { _id: string };
  createdAt: string;
}

interface PosCashierTabProps {
  invoices: Invoice[];
  patients: Patient[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateInvoice: (invoiceData: Record<string, unknown>) => Promise<Invoice | null>;
  preselectedPatientId?: string;
}

export function PosCashierTab({
  invoices,
  patients,
  isLoading,
  onRefresh,
  onCreateInvoice,
  preselectedPatientId,
}: PosCashierTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create POS Invoice Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingPatientId, setBillingPatientId] = useState(preselectedPatientId || "");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "issued">("paid");
  const [discountAmount, setDiscountAmount] = useState(0);

  // Line Items
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: "Dr. Harshali Sutar Clinical Consultation", quantity: 1, unitPrice: 800 },
  ]);

  // A4 Receipt Modal
  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const subtotal = lineItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
  const total = Math.max(0, subtotal - discountAmount);

  const addPresetItem = (desc: string, price: number) => {
    setLineItems((prev) => [...prev, { description: desc, quantity: 1, unitPrice: price }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: "description" | "quantity" | "unitPrice", value: unknown) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleOpenCreateModal = (patId?: string) => {
    if (patId) setBillingPatientId(patId);
    else if (!billingPatientId && patients.length > 0) setBillingPatientId(patients[0]._id);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingPatientId) return;

    setIsSubmitting(true);
    try {
      const itemsPayload = lineItems.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.quantity * it.unitPrice,
        total: it.quantity * it.unitPrice,
      }));

      const newInv = await onCreateInvoice({
        patientId: billingPatientId,
        items: itemsPayload,
        subtotal,
        discountAmount,
        discount: discountAmount,
        taxAmount: 0,
        tax: 0,
        taxRate: 0,
        total,
        status: paymentStatus,
        paymentMethod,
        paymentStatus: paymentStatus === "paid" ? "Paid" : "pending",
      });

      setIsCreateModalOpen(false);
      setLineItems([{ description: "Dr. Harshali Sutar Clinical Consultation", quantity: 1, unitPrice: 800 }]);
      setDiscountAmount(0);

      // If paid, preview receipt immediately
      if (newInv && paymentStatus === "paid") {
        await loadReceiptForInvoice(newInv);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadReceiptForInvoice = async (inv: Invoice) => {
    setIsLoadingReceipt(true);
    try {
      const res = await api.get<{ receipt: Record<string, unknown> }>(`/receipts/by-invoice/${inv._id}`);
      if (res.data?.receipt) {
        const r = res.data.receipt;
        const formattedReceipt: PaymentReceiptData = {
          _id: (r._id as string) || inv._id,
          receiptNumber: (r.receiptNumber as string) || (inv.invoiceNumber || inv.invoiceCode || "REC-NEW"),
          invoiceNumber: (r.invoiceNumber as string) || (inv.invoiceNumber || inv.invoiceCode || "INV-NEW"),
          issuedAt: (r.issuedAt as string) || inv.createdAt || new Date().toISOString(),
          paidAt: (r.paidAt as string) || inv.createdAt || new Date().toISOString(),
          patientName: (r.patientName as string) || inv.patientId?.fullName || "Patient",
          patientCode: (r.patientCode as string) || inv.patientId?.patientCode || "PAT",
          patientPhone: (r.patientPhone as string) || inv.patientId?.phone || "",
          doctorName: (r.doctorName as string) || "Dr. Harshali Sutar",
          doctorQualifications: (r.doctorQualifications as string) || "BHMS, MD (Homoeopathy), PGDEMS",
          doctorSpecialization: (r.doctorSpecialization as string) || "Gynaecology & Classical Homoeopathy",
          serviceName: (r.serviceName as string) || "Homoeopathic Clinical Consultation",
          appointmentDateTime: (r.appointmentDateTime as string) || new Date(inv.createdAt).toLocaleString(),
          appointmentMode: (r.appointmentMode as string) || "Clinical Consultation",
          items: Array.isArray(r.items) && r.items.length > 0
            ? (r.items as PaymentReceiptData["items"])
            : inv.items.map((it) => ({
                description: it.description,
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || (it.amount || 0),
                amount: it.amount || (it.total || 0),
              })),
          paymentMethod: (r.paymentMethod as string) || inv.paymentMethod?.toUpperCase() || "UPI",
          providerTransactionId: (r.providerTransactionId as string) || undefined,
          paymentStatus: (r.paymentStatus as string) || "Paid",
          subtotal: typeof r.subtotal === "number" ? r.subtotal : inv.subtotal,
          discountAmount: typeof r.discountAmount === "number" ? r.discountAmount : inv.discount,
          taxRate: typeof r.taxRate === "number" ? r.taxRate : 0,
          taxAmount: typeof r.taxAmount === "number" ? r.taxAmount : 0,
          totalAmount: typeof r.totalAmount === "number" ? r.totalAmount : inv.total,
          totalPaid: typeof r.amountPaid === "number" ? r.amountPaid : inv.total,
          balanceAmount: typeof r.balanceAmount === "number" ? r.balanceAmount : 0,
          verificationToken: (r.verificationToken as string) || undefined,
          organization: (r.organization as PaymentReceiptData["organization"]) || {
            name: "TriGyna Health & Wellness",
            address: { city: "Koregaon Park, Pune, Maharashtra" },
            phone: "+91 89566 27725",
            email: "care@trigyna.com",
            website: "www.trigyna.com",
          },
        };
        setReceiptData(formattedReceipt);
      }
    } catch {
      // Fallback local receipt object
      const localReceipt: PaymentReceiptData = {
        _id: inv._id,
        receiptNumber: inv.invoiceNumber || inv.invoiceCode || "REC-POS",
        invoiceNumber: inv.invoiceNumber || inv.invoiceCode || "INV-POS",
        issuedAt: inv.createdAt,
        paidAt: inv.createdAt,
        patientName: inv.patientId?.fullName || "Patient",
        patientCode: inv.patientId?.patientCode || "PAT",
        patientPhone: inv.patientId?.phone || "",
        doctorName: "Dr. Harshali Sutar",
        doctorQualifications: "BHMS, MD (Homoeopathy), PGDEMS",
        doctorSpecialization: "Gynaecology & Classical Homoeopathy",
        serviceName: "Homoeopathic Clinical Consultation",
        items: inv.items.map((it) => ({
          description: it.description,
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice,
          amount: it.total,
        })),
        paymentMethod: inv.paymentMethod?.toUpperCase() || "UPI",
        paymentStatus: "Paid",
        subtotal: inv.subtotal,
        discountAmount: inv.discount,
        taxAmount: inv.tax,
        totalPaid: inv.total,
        organization: {
          name: "TriGyna Health & Wellness",
          address: { city: "Koregaon Park, Pune, Maharashtra" },
          phone: "+91 89566 27725",
          email: "care@trigyna.com",
          website: "www.trigyna.com",
        },
      };
      setReceiptData(localReceipt);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleDownloadPdf = (invId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    window.open(`${apiUrl}/receipts/by-invoice/${invId}/pdf`, "_blank");
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const name = inv.patientId?.fullName?.toLowerCase() || "";
    const phone = inv.patientId?.phone || "";
    const code = (inv.invoiceNumber || inv.invoiceCode || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query) || phone.includes(query) || code.includes(query);
    return matchesStatus && matchesSearch;
  });

  const totalCollected = invoices
    .filter((i) => i.status === "paid")
    .reduce((acc, it) => acc + (it.paidAmount || it.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5ED] text-[#154734] text-xs font-semibold mb-2 border border-[#D1E2D8]">
            <CreditCard className="w-3.5 h-3.5" />
            Front Desk Cashier &amp; POS Receipts
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#17221D]">
            Point of Sale (POS) Billing &amp; Collections
          </h2>
          <p className="text-xs text-[#758277] mt-0.5 max-w-xl">
            Collect consultation fees, homoeopathic medicine dispensary charges, issue official GST receipts, and print QR-verified invoices.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="px-4.5 py-2.5 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create POS Bill &amp; Collect
        </button>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4.5 shadow-xs">
          <p className="text-[11px] text-[#758277] uppercase font-bold tracking-wider">
            Total Invoices Issued
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#154734] mt-1">
            {invoices.length}
          </p>
          <p className="text-[10px] text-[#758277] mt-0.5">Recorded billing receipts</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">
            Collected Revenue
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-[#154734] mt-1">
            ₹{totalCollected.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-700/80 mt-0.5">Paid via UPI, Cash &amp; Card</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4.5 shadow-xs">
          <p className="text-[11px] text-[#758277] uppercase font-bold tracking-wider">
            Settled (Paid) Bills
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 mt-1">
            {invoices.filter((i) => i.status === "paid").length}
          </p>
          <p className="text-[10px] text-[#758277] mt-0.5">100% cleared receipts</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200/80 bg-amber-50/20 p-4.5 shadow-xs">
          <p className="text-[11px] text-amber-800 uppercase font-bold tracking-wider">
            Pending / Issued
          </p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-600 mt-1">
            {invoices.filter((i) => i.status !== "paid").length}
          </p>
          <p className="text-[10px] text-amber-700/80 mt-0.5">Awaiting settlement</p>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-xs overflow-hidden">
        <div className="p-4.5 sm:p-5 border-b border-[#E8E2D6] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#154734]" />
              Front Desk Billing Receipts &amp; Audit Trail
            </h3>
            <p className="text-xs text-[#758277] mt-0.5">
              Review transaction histories, download printable A4 PDFs, and inspect itemized breakdown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#758277]" />
              <input
                type="text"
                placeholder="Search invoice or patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E8E2D6] focus:outline-none focus:ring-2 focus:ring-[#154734]/20 bg-[#FAF8F5]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E2D6]">
              {[
                { key: "all", label: "All" },
                { key: "paid", label: "Paid" },
                { key: "issued", label: "Pending" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                    statusFilter === f.key
                      ? "bg-[#154734] text-white shadow-xs"
                      : "text-[#758277] hover:text-[#154734]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              title="Refresh Invoices"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Invoices List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E2D6] text-[11px] font-bold text-[#154734] uppercase tracking-wider">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Patient Profile</th>
                <th className="py-3 px-4">Billed Services</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D6]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#758277]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2.5 text-[#154734]" />
                    <p className="font-semibold text-xs text-[#154734]">Loading invoices...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#758277]">
                    <Receipt className="w-8 h-8 text-[#758277]/40 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-[#17221D]">No invoices found</p>
                    <p className="text-xs text-[#758277] mt-0.5">Create your first POS bill at the desk.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#154734]">
                      {inv.invoiceNumber || inv.invoiceCode || "INV"}
                    </td>

                    <td className="py-3.5 px-4 text-[#758277]">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#17221D]">
                        {inv.patientId?.fullName || "Patient"}
                      </p>
                      <p className="text-[11px] text-[#758277]">
                        {inv.patientId?.phone || ""}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {inv.items && inv.items.length > 0 ? (
                        <p className="truncate text-[#17221D] font-medium">
                          {inv.items[0].description}
                          {inv.items.length > 1 ? ` (+${inv.items.length - 1} more)` : ""}
                        </p>
                      ) : (
                        <span className="text-[#758277]">Consultation</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#154734]">
                      ₹{inv.total}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-[#EAF5ED] text-[#154734] uppercase border border-[#D1E2D8]">
                        {inv.paymentMethod || "UPI"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => loadReceiptForInvoice(inv)}
                          disabled={isLoadingReceipt}
                          className="px-2.5 py-1 rounded-lg bg-[#154734] hover:bg-[#1E5C45] text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Preview Official A4 Receipt"
                        >
                          {isLoadingReceipt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                          View Receipt
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(inv._id)}
                          className="p-1 rounded-lg border border-[#E8E2D6] text-[#758277] hover:text-[#154734] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create POS Bill */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#154734]" />
                  POS Billing &amp; Payment Cashier
                </h3>
                <p className="text-xs text-[#758277] mt-0.5">
                  Generate itemized clinic bill, calculate discounts, and collect payment
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#154734] mb-1">Select Patient *</label>
                <select
                  required
                  value={billingPatientId}
                  onChange={(e) => setBillingPatientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                >
                  <option value="">-- Choose registered patient --</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.patientCode}) • {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Presets */}
              <div>
                <p className="font-bold text-[#758277] text-[10px] uppercase mb-1.5">Quick Service Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => addPresetItem("Doctor Consultation Fee", 800)}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EAF5ED] text-[#154734] border border-[#E8E2D6] text-[11px] font-semibold cursor-pointer"
                  >
                    + Consultation (₹800)
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetItem("Homoeopathic Medicine Kit (1 Month)", 650)}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EAF5ED] text-[#154734] border border-[#E8E2D6] text-[11px] font-semibold cursor-pointer"
                  >
                    + Medicine Kit (₹650)
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetItem("Follow-Up Review Consultation", 500)}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EAF5ED] text-[#154734] border border-[#E8E2D6] text-[11px] font-semibold cursor-pointer"
                  >
                    + Follow-Up (₹500)
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetItem("Pelvic Ultrasound & Report", 1200)}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EAF5ED] text-[#154734] border border-[#E8E2D6] text-[11px] font-semibold cursor-pointer"
                  >
                    + Ultrasound (₹1200)
                  </button>
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#154734]">Itemized Services / Medications</label>
                  <button
                    type="button"
                    onClick={() => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }])}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Custom Line
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E2D6]">
                      <input
                        type="text"
                        required
                        placeholder="Service description"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        className="flex-1 p-1.5 rounded-lg border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734] text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))}
                        className="w-16 p-1.5 rounded-lg border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734] text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(idx, "unitPrice", Number(e.target.value))}
                        className="w-24 p-1.5 rounded-lg border border-[#E8E2D6] bg-white focus:outline-none focus:border-[#154734] text-xs font-mono"
                      />
                      <span className="w-16 text-right font-mono font-bold text-[#154734]">
                        ₹{item.quantity * item.unitPrice}
                      </span>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1 text-[#758277] hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Totals */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E2D6] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#758277]">Subtotal:</span>
                  <span className="font-mono font-semibold">₹{subtotal}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#758277]">Special Concession / Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-24 p-1 rounded-lg border border-[#E8E2D6] bg-white text-right font-mono text-xs focus:outline-none focus:border-[#154734]"
                  />
                </div>

                <div className="flex justify-between items-center text-sm font-bold text-[#154734] pt-2 border-t border-[#E8E2D6]">
                  <span>NET PAYABLE TOTAL:</span>
                  <span className="font-mono text-base">₹{total}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#154734] mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="upi">UPI / QR Code</option>
                    <option value="cash">Cash Counter</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="net_banking">Net Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#154734] mb-1">Collection Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as "paid" | "issued")}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D6] focus:outline-none focus:border-[#154734]"
                  >
                    <option value="paid">Payment Collected (Issue Receipt)</option>
                    <option value="issued">Bill Issued (Payment Pending)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E2D6] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D6] text-[#758277] hover:bg-[#FAF8F5] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#154734] hover:bg-[#1E5C45] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating Bill...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Issue POS Invoice
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official A4 Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E2D6] w-full max-w-4xl p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6]">
              <div>
                <h3 className="text-base font-serif font-bold text-[#154734]">
                  Official TriGyna Healthcare Payment Receipt
                </h3>
                <p className="text-xs text-[#758277]">
                  Receipt No: {receiptData.receiptNumber} • Verified QR Token
                </p>
              </div>
              <button
                onClick={() => setReceiptData(null)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#758277] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2">
              <A4PaymentReceipt receipt={receiptData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
