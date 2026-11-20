"use client";

import React, { useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Printer,
  Download,
  CreditCard,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  User,
  Stethoscope,
  Calendar,
  ShieldCheck,
  QrCode,
  ArrowRight,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { getBaseUrl, getToken } from "@/lib/api/client";
import { BillingReceipt, PaymentReceiptData } from "./BillingReceipt";
import { printDocumentElement } from "./printUtils";
import QRCode from "qrcode";

export interface InvoiceLineItem {
  description: string;
  details?: string;
  quantity?: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  taxableAmount?: number;
  amount: number;
}

export interface InvoiceDocumentData {
  _id?: string;
  invoiceNumber: string;
  issueDate: string | Date;
  dueDate?: string | Date;
  patientName: string;
  patientCode: string;
  patientPhone: string;
  patientEmail?: string;
  patientAddress?: string;
  doctorName?: string;
  doctorQualifications?: string;
  doctorSpecialization?: string;
  serviceName?: string;
  appointmentCode?: string;
  appointmentDateTime?: string;
  appointmentMode?: string;
  items: InvoiceLineItem[];
  currency?: string;
  subtotal: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  taxableAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  amountPaid?: number;
  balanceAmount: number;
  status: "paid" | "pending" | "partially_paid" | "draft" | "issued" | "overdue" | "cancelled" | "refunded" | string;
  paymentMethod?: string;
  paidAt?: string | Date;
  notes?: string;
  payments?: any[];
  organization?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
  };
}

export interface A4InvoiceDocumentProps {
  data?: InvoiceDocumentData;
  invoice?: any;
  onClose?: () => void;
  onPayNow?: () => void;
  isPaying?: boolean;
  autoPrint?: boolean;
}

function InvoiceQrCode({ value, size = 68 }: { value: string; size?: number }) {
  const [svgContent, setSvgContent] = React.useState<string>("");

  React.useEffect(() => {
    let active = true;
    if (!value) return;

    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      color: {
        dark: "#154734",
        light: "#FFFFFF",
      },
    })
      .then((svg) => {
        if (active) setSvgContent(svg);
      })
      .catch((err) => {
        console.error("QR generation error:", err);
      });

    return () => {
      active = false;
    };
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <div
        className="p-1 bg-white rounded-lg border border-[#D5E8DC] shadow-2xs flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {svgContent ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full select-none"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="w-full h-full bg-[#EDF8F1] animate-pulse rounded" />
        )}
      </div>
      <span className="text-[7.5px] font-bold text-[#154734] mt-1 tracking-wider uppercase">
        Scan to Verify
      </span>
    </div>
  );
}

export function A4InvoiceDocument({
  data: propData,
  invoice,
  onClose,
  onPayNow,
  isPaying = false,
  autoPrint = false,
}: A4InvoiceDocumentProps) {
  const [mounted, setMounted] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"slip" | "invoice">("slip");
  const printRef = useRef<HTMLDivElement>(null);

  // Close on Escape key & Lock background scroll
  React.useEffect(() => {
    setMounted(true);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    const handleBeforePrint = () => {
      document.body.style.overflow = "visible";
    };
    const handleAfterPrint = () => {
      document.body.style.overflow = "hidden";
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    let printTimer: NodeJS.Timeout | undefined;
    if (autoPrint) {
      printTimer = setTimeout(() => {
        const isSlip = viewMode === "slip";
        const targetId = isSlip ? "trigyna-billing-receipt" : "trigyna-invoice-document";
        printDocumentElement(targetId, !isSlip);
      }, 500);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.style.overflow = origOverflow;
      if (printTimer) clearTimeout(printTimer);
    };
  }, [onClose, autoPrint, viewMode]);

  const data: InvoiceDocumentData = React.useMemo(() => {
    if (propData) return propData;
    const inv = invoice || {};
    const pName = inv.patientId?.fullName || inv.patientName || "Valued Patient";
    const pCode = inv.patientId?.patientCode || inv.patientCode || "TG-PT";
    const pPhone = inv.patientId?.phone || inv.patientPhone || "";
    const pEmail = inv.patientId?.email || inv.patientEmail || "";
    const pAddress = inv.patientId?.address || inv.patientAddress || "";
    const docName =
      inv.doctorId?.userId?.name || inv.doctorId?.name || inv.doctorName || "Dr. Ananya Sharma";
    const docQual =
      inv.doctorId?.qualifications || inv.doctorQualifications || "Obstetrician & Gynecologist";
    const sName =
      inv.appointmentId?.serviceName || inv.serviceName || inv.items?.[0]?.description || "Clinical Encounter";
    const apptCode = inv.appointmentId?.appointmentCode || inv.appointmentCode || "";
    const apptDate = inv.appointmentId?.appointmentDate || inv.appointmentDateTime || "";
    const apptMode = inv.appointmentId?.mode || inv.appointmentMode || "Online Consultation";

    const items: InvoiceLineItem[] =
      inv.items && inv.items.length > 0
        ? inv.items.map((it: any) => ({
            description: it.description || "Healthcare Service",
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
    const paid = inv.paidAmount || 0;
    const balance = inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, total - paid);

    return {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber || "INV-TG-001",
      issueDate: inv.issueDate || inv.createdAt || new Date(),
      dueDate: inv.dueDate,
      patientName: pName,
      patientCode: pCode,
      patientPhone: pPhone,
      patientEmail: pEmail,
      patientAddress: pAddress,
      doctorName: docName,
      doctorQualifications: docQual,
      serviceName: sName,
      appointmentCode: apptCode,
      appointmentDateTime: apptDate,
      appointmentMode: apptMode,
      items,
      subtotal: inv.subtotal || total,
      discountAmount: inv.discountAmount || 0,
      taxRate: inv.taxRate || 0,
      taxAmount: inv.taxAmount || 0,
      totalAmount: total,
      paidAmount: paid,
      balanceAmount: balance,
      status: inv.status || "pending",
      paymentMethod: inv.paymentMethod,
      notes: inv.notes,
      organization: inv.organizationSnapshot || inv.organization,
    };
  }, [propData, invoice]);

  const handlePrint = () => {
    const isSlip = viewMode === "slip";
    const targetId = isSlip ? "trigyna-billing-receipt" : "trigyna-invoice-document";
    printDocumentElement(targetId, !isSlip);
  };

  const handleDownloadPdf = () => {
    const token = getToken();
    const apiUrl = getBaseUrl();
    const invoiceId = data._id || data.invoiceNumber;
    const url = `${apiUrl}/invoices/${invoiceId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    window.open(url, "_blank");
  };

  const statusKey = String(data.status || "pending").toLowerCase();
  const isSettled = statusKey === "paid";
  const isPartial = statusKey === "partially_paid";
  const isPayable = (statusKey === "pending" || statusKey === "issued" || isPartial) && data.balanceAmount > 0;

  const issueDateFormatted = data.issueDate
    ? new Date(data.issueDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const dueDateFormatted = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "On Receipt";

  const org = data.organization || {
    name: "TriGyna Health & Wellness",
    address: "Baner Road, Pune, Maharashtra 411045",
    phone: "+91 917-277-2326",
    email: "trigyna.health@gmail.com",
    website: "www.trigyna.com",
    gstin: "27AABCT9988C1ZR",
  };

  const receiptSlipData: PaymentReceiptData = React.useMemo(() => {
    return {
      _id: data._id,
      receiptNumber: data.invoiceNumber,
      invoiceNumber: data.invoiceNumber,
      issuedAt: data.issueDate,
      paidAt: data.paidAt || data.issueDate,
      patientName: data.patientName,
      patientCode: data.patientCode,
      patientPhone: data.patientPhone,
      patientEmail: data.patientEmail,
      doctorName: data.doctorName,
      doctorQualifications: data.doctorQualifications,
      doctorSpecialization: data.doctorSpecialization,
      serviceName: data.serviceName || data.items?.[0]?.description || "Clinical Healthcare",
      appointmentDateTime: data.appointmentDateTime,
      duration: "30 Mins",
      appointmentMode: data.appointmentMode,
      items: data.items.map((it) => ({
        description: it.description,
        details: it.details,
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        amount: it.amount || (it.quantity || 1) * (it.unitPrice || 0),
      })),
      paymentMethod: data.paymentMethod || "UPI / Direct",
      paymentStatus: data.status === "paid" ? "Paid" : data.status,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount || 0,
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      totalAmount: data.totalAmount,
      totalPaid: data.paidAmount ?? data.amountPaid ?? 0,
      balanceAmount: data.balanceAmount,
      verificationToken: data.invoiceNumber,
      organization: {
        name: org.name,
        phone: org.phone,
        email: org.email,
        website: org.website,
        address: {
          line1: org.address,
          city: "Pune",
        },
      },
    };
  }, [data, org]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:h-auto animate-in fade-in duration-150"
      style={{ margin: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${
          viewMode === "slip" ? "max-w-[370px]" : "max-w-[850px]"
        } max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E2E9E3] overflow-hidden transition-all duration-200 animate-in zoom-in-95 print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none print:static print:w-full print:max-w-none print:overflow-visible`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Action Toolbar (Always at the top) */}
        <div className="sticky top-0 z-30 bg-[#154734] text-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-md shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-semibold text-xs sm:text-sm tracking-wide truncate">
              {viewMode === "slip" ? "Billing Receipt" : "Tax Invoice"}: {data.invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/10 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("slip")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "slip"
                    ? "bg-white text-[#154734] font-bold shadow-2xs"
                    : "text-white/80 hover:text-white"
                }`}
                title="View standard compact billing receipt slip"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Receipt Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("invoice")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "invoice"
                    ? "bg-white text-[#154734] font-bold shadow-2xs"
                    : "text-white/80 hover:text-white"
                }`}
                title="View full tax invoice document"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Invoice</span>
              </button>
            </div>

            {isPayable && onPayNow && (
              <button
                type="button"
                onClick={onPayNow}
                disabled={isPaying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isPaying ? "..." : `Pay ₹${data.balanceAmount.toLocaleString()}`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Print Receipt / Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Download Server-Signed PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
                aria-label="Close Preview (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-[#F0F5F2] print:bg-white print:overflow-visible print:h-auto scrollbar-thin">
          {/* View Mode 1: Premium Compact Billing Slip Format */}
          {viewMode === "slip" ? (
            <div className="p-2 sm:p-4 flex justify-center print:p-0 print:bg-white">
              <BillingReceipt
                receiptData={receiptSlipData}
                showActions={false}
                onClose={onClose}
              />
            </div>
          ) : (
          /* View Mode 2: Detailed Tax Invoice Table Container */
          <div
            ref={printRef}
            id="trigyna-invoice-document"
            className="p-6 sm:p-10 font-sans text-[#18231D] bg-white print:p-8 print:w-full"
          >
            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#E2E9E3] gap-4">
              <div>
                <div className="relative h-12 w-44">
                  <Image
                    src="/images/brand/logo.png"
                    alt="TriGyna"
                    fill
                    sizes="176px"
                    priority
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <p className="text-[10px] font-semibold tracking-wider text-[#68756D] uppercase mt-1">
                Women • Health • Wellness
              </p>
            </div>

            <div className="text-left sm:text-right">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#154734] tracking-tight">
                TAX INVOICE / BILL
              </h1>
              <p className="font-mono font-bold text-xs sm:text-sm text-[#087443] mt-0.5">
                {data.invoiceNumber}
              </p>
              <p className="text-[11px] text-[#68756D] mt-1">
                Issue Date: <span className="font-medium text-[#18231D]">{issueDateFormatted}</span>
                {" • "}
                Due: <span className="font-medium text-[#18231D]">{dueDateFormatted}</span>
              </p>
            </div>
          </div>

          {/* 2. Status Banner */}
          <div
            className={`my-5 p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isSettled
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : isPartial
                ? "bg-amber-50/70 border-amber-200 text-amber-900"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                  isSettled ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                }`}
              >
                {isSettled ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {data.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-[#68756D]">
                    {isSettled
                      ? "• Full settlement confirmed"
                      : `• Outstanding: ₹${data.balanceAmount.toLocaleString()}`}
                  </span>
                </div>
                <p className="text-xs text-[#68756D] mt-0.5">
                  {isSettled
                    ? "Verified digital payment received. Digital receipt is permanently archived."
                    : "Please settle the remaining balance online or at our clinic desk."}
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-[#68756D] uppercase block">Total Due</span>
              <span className="text-lg font-bold font-mono text-[#18231D]">
                ₹{data.balanceAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 3. Patient & Clinic Provider Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs my-5">
            {/* Patient Card */}
            <div className="p-4 bg-[#F7F9F7] rounded-2xl border border-[#E2E9E3] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#154734] pb-1 border-b border-[#E2E9E3]">
                <User className="w-3.5 h-3.5 text-[#087443]" />
                <span>Billed To (Patient)</span>
              </div>
              <div className="pt-1">
                <p className="font-bold text-sm text-[#18231D]">{data.patientName}</p>
                <p className="text-[#68756D] font-mono text-[11px]">ID: {data.patientCode || "—"}</p>
                <p className="text-[#68756D] mt-1">Phone: {data.patientPhone || "—"}</p>
                {data.patientEmail && <p className="text-[#68756D]">Email: {data.patientEmail}</p>}
                {data.patientAddress && <p className="text-[#68756D] text-[11px] mt-1">{data.patientAddress}</p>}
              </div>
            </div>

            {/* Provider Card */}
            <div className="p-4 bg-[#F7F9F7] rounded-2xl border border-[#E2E9E3] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#154734] pb-1 border-b border-[#E2E9E3]">
                <Building2 className="w-3.5 h-3.5 text-[#087443]" />
                <span>Healthcare Provider</span>
              </div>
              <div className="pt-1">
                <p className="font-bold text-sm text-[#18231D]">{org.name}</p>
                <p className="text-[#68756D] text-[11px]">{org.address}</p>
                <p className="text-[#68756D] mt-1">
                  Consultant: <span className="font-medium text-[#18231D]">{data.doctorName || "Care Team"}</span>
                </p>
                <p className="text-[#68756D] font-mono text-[11px]">GSTIN: {org.gstin || "27AABCT9988C1ZR"}</p>
              </div>
            </div>
          </div>

          {/* 4. Line Items Table */}
          <div className="my-6 rounded-2xl border border-[#E2E9E3] overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#154734] text-white text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Service / Procedure Description</th>
                  <th className="py-2.5 px-3 text-center w-16">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-center w-20">Tax</th>
                  <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E9E3]">
                {data.items && data.items.length > 0 ? (
                  data.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-[#F7F9F7]/60" : "bg-white"}>
                      <td className="py-3 px-3 text-center font-mono text-[#68756D]">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#18231D]">{item.description}</div>
                        {item.details && <div className="text-[11px] text-[#68756D] mt-0.5">{item.details}</div>}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{item.quantity || 1}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        {(item.unitPrice !== undefined ? item.unitPrice : item.amount / (item.quantity || 1)).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#68756D]">
                        {item.taxRate !== undefined ? `${item.taxRate}%` : "Exempt"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#18231D]">
                        {item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-3 text-center font-mono text-[#68756D]">1</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#18231D]">
                        {data.serviceName || "Clinical Consultation & Healthcare Services"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">1</td>
                    <td className="py-3 px-3 text-right font-mono">{data.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#68756D]">Exempt</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#18231D]">
                      {data.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Financial Summary & Payment Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 text-xs">
            {/* Left Column: Remittance Info or Verified Paid Stamp + Real QR Verification */}
            <div className="p-4 bg-[#F7F9F7] rounded-2xl border border-[#E2E9E3] flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {data.balanceAmount > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 pb-1 border-b border-[#E2E9E3]">
                        <QrCode className="w-4 h-4 text-amber-700" />
                        <span>Payment Remittance Details</span>
                      </div>
                      <div className="space-y-1 text-[#68756D] pt-1 text-[11.5px]">
                        <p>
                          Official UPI ID: <span className="font-mono font-bold text-[#154734]">trigyna.health@icici</span>
                        </p>
                        <p>Bank: ICICI Bank Ltd., Baner Branch</p>
                        <p>Account No.: 104805004921 | IFSC: ICIC0001048</p>
                        <p className="text-[11px] text-amber-800 pt-1 font-medium">
                          Pay Online: Log in to your patient dashboard at trigyna.com/patient/payments to complete instant settlement.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 pb-1 border-b border-[#E2E9E3]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Official Settlement Verification</span>
                      </div>
                      <div className="space-y-1 text-[#68756D] pt-1 text-[11.5px]">
                        <p>
                          Payment Method: <span className="font-semibold text-[#18231D]">{(data.paymentMethod || "UPI").toUpperCase()}</span>
                        </p>
                        <p>Status: <span className="font-bold text-emerald-800 uppercase">Paid in Full</span></p>
                        <p className="text-[11px] text-[#68756D]">
                          Settled at: {data.paidAt ? new Date(data.paidAt).toLocaleString("en-GB") : issueDateFormatted}
                        </p>
                        <div className="mt-2 p-1.5 rounded-lg bg-emerald-100/70 text-emerald-950 font-semibold text-center text-[10.5px]">
                          ✓ Authentic Healthcare Record
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scannable Verification QR Code */}
                <div className="shrink-0 flex flex-col items-center">
                  <InvoiceQrCode
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/verify-document?ref=${encodeURIComponent(data.invoiceNumber || data._id || "")}`
                        : `https://trigyna.com/verify-document?ref=${encodeURIComponent(data.invoiceNumber || data._id || "")}`
                    }
                    size={68}
                  />
                </div>
              </div>

              {data.notes && (
                <div className="mt-3 pt-2 border-t border-[#E2E9E3] text-[11px] text-[#68756D]">
                  <span className="font-bold text-[#18231D]">Notes: </span>
                  {data.notes}
                </div>
              )}
            </div>

            {/* Right Column: Financial Totals Breakdown */}
            <div className="p-4 bg-[#F7F9F7] rounded-2xl border border-[#E2E9E3] space-y-2">
              <div className="flex justify-between text-[#68756D]">
                <span>Subtotal</span>
                <span className="font-mono">₹{data.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#68756D]">
                <span>Discount</span>
                <span className="font-mono text-emerald-700">- ₹{(data.discountAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#68756D]">
                <span>Tax (GST {data.taxRate || 0}%)</span>
                <span className="font-mono">₹{(data.taxAmount || 0).toLocaleString()}</span>
              </div>

              <div className="pt-2 border-t border-[#E2E9E3] flex justify-between font-bold text-sm text-[#18231D]">
                <span>Total Payable</span>
                <span className="font-mono text-[#154734]">₹{data.totalAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-xs text-[#68756D]">
                <span>Amount Paid</span>
                <span className="font-mono font-semibold text-emerald-700">₹{(data.paidAmount ?? data.amountPaid ?? 0).toLocaleString()}</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex justify-between font-bold text-sm ${
                data.balanceAmount > 0
                  ? "bg-amber-50 border-amber-200 text-amber-950"
                  : "bg-emerald-50 border-emerald-200 text-emerald-950"
              }`}>
                <span>Net Balance Due</span>
                <span className="font-mono">₹{data.balanceAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 6. Footer Terms & Signatory */}
          <div className="pt-6 border-t border-[#E2E9E3] grid grid-cols-1 sm:grid-cols-2 gap-4 items-end text-xs">
            <div className="text-[10px] text-[#68756D] space-y-1">
              <p className="font-bold text-[#18231D]">Terms &amp; Conditions</p>
              <p>1. Computer-generated official medical tax invoice issued by TriGyna Health &amp; Wellness.</p>
              <p>2. Applicable refunds, cancellations, and reschedulings follow clinic policy.</p>
            </div>

            <div className="text-center sm:text-right space-y-1">
              <p className="font-serif italic text-base text-[#154734] font-bold">
                {data.doctorName || org.name}
              </p>
              <div className="w-36 h-0.5 bg-[#E2E9E3] ml-auto my-1" />
              <p className="text-[10px] font-bold text-[#18231D] uppercase tracking-wider">Authorized Signatory</p>
              <p className="text-[9px] text-[#68756D]">{org.name}</p>
            </div>
          </div>

          {/* 7. Bottom Contact Strip */}
          <div className="mt-8 pt-3 border-t border-[#E2E9E3] flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#68756D] gap-2">
            <span>{org.address} • {org.phone} • {org.email}</span>
            <span className="font-semibold text-[#154734]">Evidence-Based Women Health &amp; Holistic Care</span>
          </div>
        </div>
        )}

        {/* Print Stylesheet for Full Tax Invoice */}
        {viewMode === "invoice" && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }

                @media print {
                  html, body {
                    background: #ffffff !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    color: #000000 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: auto !important;
                    overflow: visible !important;
                  }

                  [role="dialog"] {
                    position: static !important;
                    display: block !important;
                    overflow: visible !important;
                    max-height: none !important;
                    height: auto !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    background: #ffffff !important;
                  }

                  [role="dialog"] * {
                    overflow: visible !important;
                  }

                  body * {
                    visibility: hidden !important;
                  }

                  #trigyna-invoice-document,
                  #trigyna-invoice-document * {
                    visibility: visible !important;
                  }

                  #trigyna-invoice-document {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 190mm !important;
                    margin: 0 auto !important;
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    page-break-inside: avoid !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }

                  .no-print,
                  .no-print * {
                    display: none !important;
                    visibility: hidden !important;
                  }
                }
              `,
            }}
          />
        )}
        </div>
      </div>
    </div>,
    document.body
  );
}
