"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  X,
  Building2,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { printDocumentElement } from "./printUtils";

export interface ReceiptItem {
  description: string;
  details?: string;
  quantity?: number;
  unitPrice: number;
  amount: number;
}

export interface PaymentReceiptData {
  _id?: string;
  receiptNumber: string;
  invoiceNumber: string;
  issuedAt: string | Date;
  paidAt?: string | Date;
  patientName: string;
  patientCode: string;
  patientPhone: string;
  patientEmail?: string;
  doctorName?: string;
  doctorQualifications?: string;
  doctorSpecialization?: string;
  serviceName: string;
  appointmentDateTime?: string;
  duration?: string;
  appointmentMode?: string;
  items: ReceiptItem[];
  paymentMethod: string;
  providerTransactionId?: string;
  paymentStatus: "Paid" | "pending" | "refunded" | "partially_paid" | string;
  subtotal: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  totalPaid: number;
  balanceAmount?: number;
  refundDetails?: Record<string, unknown> | null;
  verificationToken?: string;
  organization?: {
    name?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: {
      city?: string;
      line1?: string;
    };
  } | null;
}

// Sample reference receipts
export const DEFAULT_REFERENCE_RECEIPT: PaymentReceiptData = {
  receiptNumber: "RCP/2026/000458",
  invoiceNumber: "TRI/2026/000458",
  issuedAt: "2026-10-27T11:22:00",
  paidAt: "2026-10-27T11:22:00",
  patientName: "Ananya Sharma",
  patientCode: "TRI-2026-000123",
  patientPhone: "+91 98765 43210",
  patientEmail: "ananya.sharma@example.com",
  doctorName: "Dr. Harshali Sutar",
  doctorQualifications: "MBBS, MD (Homoeopathy)",
  doctorSpecialization: "Women Health & PCOS Specialist",
  serviceName: "PCOS Management & Holistic Consultation",
  appointmentDateTime: "27 Oct 2026, 11:30 AM",
  duration: "30 Minutes",
  appointmentMode: "Online Video Consultation",
  items: [
    {
      description: "PCOS Management Consultation",
      details: "Comprehensive hormonal & metabolic evaluation",
      quantity: 1,
      unitPrice: 1000.0,
      amount: 1000.0,
    },
    {
      description: "Follow-up Support Care (14 Days)",
      details: "Clinical WhatsApp follow-up & diet review",
      quantity: 1,
      unitPrice: 0.0,
      amount: 0.0,
    },
  ],
  paymentMethod: "UPI (PhonePe)",
  providerTransactionId: "UPI2610271122456789",
  paymentStatus: "Paid",
  subtotal: 1000.0,
  discountAmount: 0.0,
  taxRate: 0,
  taxAmount: 0.0,
  totalAmount: 1000.0,
  totalPaid: 1000.0,
  balanceAmount: 0.0,
  verificationToken: "tg_rcp_2026_000458_verif",
};

export const SAMPLE2_RECEIPT: PaymentReceiptData = {
  receiptNumber: "RCP/2026/000912",
  invoiceNumber: "TRI/2026/000912",
  issuedAt: "2026-10-29T10:15:00",
  paidAt: "2026-10-29T10:15:00",
  patientName: "Priya Nair",
  patientCode: "TRI-2026-000456",
  patientPhone: "+91 94470 12345",
  doctorName: "Dr. Rajesh Kulkarni",
  doctorQualifications: "MBBS, DGO (Obstetrics & Gynaecology)",
  doctorSpecialization: "Holistic Fertility & Pre-conception Care",
  serviceName: "Pre-Conception Holistic Care Consultation",
  appointmentDateTime: "29 Oct 2026, 10:15 AM",
  duration: "40 Minutes",
  appointmentMode: "Online Video Consultation (Google Meet)",
  items: [
    {
      description: "Pre-Conception Health Assessment",
      quantity: 1,
      unitPrice: 1800.0,
      amount: 1800.0,
    },
    {
      description: "Holistic Ovulation Tracking Kit",
      quantity: 1,
      unitPrice: 700.0,
      amount: 700.0,
    },
  ],
  paymentMethod: "Credit Card (Visa)",
  providerTransactionId: "CC_AUTH_998877665544",
  paymentStatus: "Paid",
  subtotal: 2500.0,
  discountAmount: 0.0,
  taxRate: 0,
  taxAmount: 0.0,
  totalAmount: 2500.0,
  totalPaid: 2500.0,
  balanceAmount: 0.0,
  verificationToken: "tg_rcp_2026_000912_verif",
};

export const LONG_TEST_RECEIPT: PaymentReceiptData = DEFAULT_REFERENCE_RECEIPT;

function formatCurrency(amount: number = 0) {
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateInput?: string | Date) {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateInput?: string | Date) {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Realistic Vector Barcode for Billing Slips
 */
function ReceiptBarcode({ code = "TRI-RCP-2026" }: { code?: string }) {
  const bars = [
    2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2,
    1, 4, 2, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 2, 4,
    1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 2, 1, 3, 1, 2, 1,
  ];

  let currentX = 8;

  return (
    <div className="flex flex-col items-center justify-center my-3 select-none">
      <svg
        className="h-8 w-full max-w-[240px]"
        viewBox="0 0 260 36"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {bars.map((width, idx) => {
          const x = currentX;
          currentX += width + 2;
          if (idx % 2 === 0) {
            return (
              <rect
                key={idx}
                x={x}
                y="0"
                width={width}
                height="36"
                fill="#14251F"
              />
            );
          }
          return null;
        })}
      </svg>
      <span className="font-mono text-[9px] tracking-widest text-[#68766F] mt-1 font-semibold">
        *{code}*
      </span>
    </div>
  );
}

/**
 * Real Scannable Vector QR Code for Digital Receipt Verification
 */
function ReceiptQrCode({ value, size = 68 }: { value: string; size?: number }) {
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    let active = true;
    if (!value) return;

    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      color: {
        dark: "#064A2D",
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
    <div className="flex flex-col items-center justify-center">
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
      <span className="text-[7.5px] font-bold text-[#087443] mt-1 tracking-wider uppercase">
        Scan to Verify
      </span>
    </div>
  );
}

/**
 * Perforated Ticket Notches & Divider
 */
function ReceiptPerforation() {
  return (
    <div className="relative flex items-center justify-between my-2.5 select-none overflow-hidden">
      <div className="w-3.5 h-6 -ml-3.5 bg-[#F0F5F2] rounded-r-full border-r border-t border-b border-[#D5E2D9] print:bg-white" />
      <div className="flex-1 border-b-2 border-dashed border-[#CBDAD0] mx-2" />
      <div className="w-3.5 h-6 -mr-3.5 bg-[#F0F5F2] rounded-l-full border-l border-t border-b border-[#D5E2D9] print:bg-white" />
    </div>
  );
}

export interface BillingReceiptProps {
  receipt?: Partial<PaymentReceiptData>;
  receiptData?: Partial<PaymentReceiptData>;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  onClose?: () => void;
  autoPrint?: boolean;
}

/**
 * Premium Billing Receipt Component
 * Standard Billing Receipt / Slip Format (Compact ~400px, Not A4)
 */
export function BillingReceipt({
  receipt = {},
  receiptData,
  showActions = true,
  onDownloadPdf,
  onPrint,
  onClose,
}: BillingReceiptProps) {
  const activeReceipt = receiptData || receipt || {};
  const data: PaymentReceiptData = {
    _id: activeReceipt._id,
    receiptNumber: activeReceipt.receiptNumber || "RCP/2026/0001",
    invoiceNumber: activeReceipt.invoiceNumber || "TRI/2026/0001",
    issuedAt: activeReceipt.issuedAt || new Date().toISOString(),
    paidAt: activeReceipt.paidAt || activeReceipt.issuedAt || new Date().toISOString(),
    patientName: activeReceipt.patientName || "Valued Patient",
    patientCode: activeReceipt.patientCode || "TG-PT-001",
    patientPhone: activeReceipt.patientPhone || "—",
    patientEmail: activeReceipt.patientEmail,
    doctorName: activeReceipt.doctorName || "Dr. Harshali Sutar",
    doctorQualifications: activeReceipt.doctorQualifications || "MBBS, MD (Homoeopathy)",
    doctorSpecialization: activeReceipt.doctorSpecialization || "Women Health & Wellness",
    serviceName: activeReceipt.serviceName || activeReceipt.items?.[0]?.description || "Consultation Service",
    appointmentDateTime: activeReceipt.appointmentDateTime || "",
    duration: activeReceipt.duration || "30 Mins",
    appointmentMode: activeReceipt.appointmentMode || "Clinical Consultation",
    items:
      activeReceipt.items && activeReceipt.items.length > 0
        ? activeReceipt.items
        : [
            {
              description: activeReceipt.serviceName || "Clinical Consultation",
              quantity: 1,
              unitPrice: activeReceipt.subtotal !== undefined ? activeReceipt.subtotal : activeReceipt.totalPaid || 0,
              amount: activeReceipt.subtotal !== undefined ? activeReceipt.subtotal : activeReceipt.totalPaid || 0,
            },
          ],
    paymentMethod: activeReceipt.paymentMethod || "UPI",
    providerTransactionId: activeReceipt.providerTransactionId || "—",
    paymentStatus: activeReceipt.paymentStatus || "Paid",
    subtotal: activeReceipt.subtotal !== undefined ? activeReceipt.subtotal : activeReceipt.totalPaid || 0,
    discountAmount: activeReceipt.discountAmount || 0,
    taxRate: activeReceipt.taxRate || 0,
    taxAmount: activeReceipt.taxAmount || 0,
    totalAmount: activeReceipt.totalAmount !== undefined ? activeReceipt.totalAmount : activeReceipt.totalPaid || 0,
    totalPaid: activeReceipt.totalPaid || 0,
    balanceAmount: activeReceipt.balanceAmount || 0,
    refundDetails: activeReceipt.refundDetails || null,
    verificationToken: activeReceipt.verificationToken,
    organization: activeReceipt.organization,
  };

  const receiptRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  React.useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      printDocumentElement("trigyna-billing-receipt", false);
    }
  };

  const handleDownload = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else if (data._id) {
      const token = typeof window !== "undefined" ? localStorage.getItem("trigyna_token") : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v1";
      window.open(`${apiUrl}/receipts/${data._id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`, "_blank");
    } else {
      printDocumentElement("trigyna-billing-receipt", false);
    }
  };

  const pStatus = (data.paymentStatus || "Paid").toLowerCase();
  const isPaid = pStatus === "paid" || pStatus === "completed" || pStatus === "settled";
  const isPartial = pStatus === "partially_paid" || pStatus === "partial";
  const isRefunded = pStatus === "refunded";

  const [origin, setOrigin] = useState("https://trigyna.com");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const fullVerifyUrl = data.verificationToken
    ? `${origin}/verify-document?ref=${data.verificationToken}`
    : `${origin}/verify-document?ref=${encodeURIComponent(data.receiptNumber || data._id || "")}`;

  return (
    <div className="flex flex-col items-center w-full max-w-full">
      {/* Action Toolbar (Hidden during print) */}
      {showActions && (
        <div className="no-print w-full max-w-[340px] sm:max-w-[350px] mb-2.5 flex items-center justify-between gap-2 bg-white/95 backdrop-blur-xs p-2 rounded-2xl border border-[#D5E2D9] shadow-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EDF8F1] text-[#087443] truncate">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Verified Receipt
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePrint}
              type="button"
              className="px-2.5 py-1 rounded-xl text-xs font-semibold text-[#14251F] bg-[#F4FAF6] hover:bg-[#E4EEE7] transition flex items-center gap-1 cursor-pointer"
              title="Print Receipt Slip"
            >
              <Printer className="w-3.5 h-3.5 text-[#087443]" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              type="button"
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-white bg-[#087443] hover:bg-[#064A2D] shadow-2xs transition flex items-center gap-1 cursor-pointer"
              title="Download Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                type="button"
                className="p-1 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STANDARD BILLING RECEIPT CONTAINER (AUTHENTIC SLIP FORMAT)   */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={receiptRef}
        id="trigyna-billing-receipt"
        className="billing-receipt-container relative w-full max-w-[340px] sm:max-w-[350px] bg-white text-[#14251F] shadow-md border border-[#D5E2D9] rounded-2xl overflow-hidden font-sans print:shadow-none print:border-none print:rounded-none"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Top Brand Accent Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#064A2D] via-[#087443] to-[#154734]" />

        {/* 1. BRAND HEADER & CLINIC INFO */}
        <div className="pt-3 pb-1.5 px-4 text-center flex flex-col items-center">
          {/* Proper TriGyna Official Logo */}
          <div className="relative w-32 h-10 mb-1 flex items-center justify-center">
            <Image
              src="/images/brand/logo.png"
              alt="TriGyna Women Health & Wellness"
              width={140}
              height={42}
              priority
              unoptimized
              className="object-contain w-auto h-9 mx-auto"
            />
          </div>

          <p className="text-[9px] font-bold tracking-widest text-[#064A2D] uppercase mt-0.5">
            Women • Health • Wellness
          </p>
          <p className="text-[9px] text-[#607168] mt-0.5 leading-snug">
            {data.organization?.address?.line1 || "Baner Road"}, {data.organization?.address?.city || "Pune"}, Maharashtra 411045
          </p>
          <p className="text-[8.5px] text-[#7A8B83] font-mono mt-0.5">
            Ph: {data.organization?.phone || "+91 917-277-2326"} • GSTIN: 27AABCT9988C1ZR
          </p>
        </div>

        {/* First Perforation */}
        <ReceiptPerforation />

        {/* 2. RECEIPT TITLE & STATUS BADGE */}
        <div className="px-4 py-0.5 flex items-center justify-between">
          <div>
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#7A8B83] block">
              Official Medical Billing
            </span>
            <h1 className="text-sm font-serif font-bold text-[#064A2D] leading-tight">
              Payment Receipt
            </h1>
          </div>

          <div className="text-right">
            {isPaid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF8F1] text-[#087443] border border-[#CDE5D6]">
                <CheckCircle2 className="w-2.5 h-2.5 text-[#087443]" />
                PAID
              </span>
            ) : isPartial ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-2.5 h-2.5" />
                PARTIAL
              </span>
            ) : isRefunded ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-2.5 h-2.5" />
                REFUNDED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                PENDING
              </span>
            )}
          </div>
        </div>

        {/* 3. RECEIPT METADATA CARD */}
        <div className="mx-4 my-2 p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E3ECE6] text-[10px] space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[#68766F]">Receipt Number:</span>
            <span className="font-mono font-bold text-[#14251F] text-[11px]">
              {data.receiptNumber}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#68766F]">Invoice Reference:</span>
            <span className="font-mono text-[#14251F]">
              {data.invoiceNumber}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#68766F]">Date & Time:</span>
            <span className="text-[#14251F] font-medium">
              {formatDate(data.paidAt || data.issuedAt)}, {formatTime(data.paidAt || data.issuedAt)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#68766F]">Payment Mode:</span>
            <span className="font-semibold text-[#087443]">
              {data.paymentMethod}
            </span>
          </div>
          {data.providerTransactionId && data.providerTransactionId !== "—" && (
            <div className="flex justify-between items-center pt-0.5 border-t border-[#E3ECE6]/70">
              <span className="text-[#68766F]">Txn / UTR Ref:</span>
              <span className="font-mono text-[9.5px] text-[#14251F] truncate max-w-[170px]">
                {data.providerTransactionId}
              </span>
            </div>
          )}
        </div>

        {/* 4. PATIENT & DOCTOR INFORMATION */}
        <div className="px-4 py-1.5 text-[10px] space-y-2">
          <div className="border-b border-[#EAF0EC] pb-1.5">
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#7A8B83]">
                Patient Details
              </span>
              <span className="text-[9.5px] font-mono text-[#68766F]">
                ID: {data.patientCode}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <p className="font-bold text-[11px] text-[#14251F]">{data.patientName}</p>
              <p className="text-[10px] text-[#68766F] font-mono">{data.patientPhone}</p>
            </div>
            {data.patientEmail && (
              <p className="text-[9px] text-[#889890] mt-0.5">{data.patientEmail}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#7A8B83]">
                Attending Specialist
              </span>
              <span className="text-[8.5px] font-medium text-[#087443] bg-[#EDF8F1] px-1.5 py-0.5 rounded">
                {data.appointmentMode || "Consultation"}
              </span>
            </div>
            <p className="font-bold text-[11px] text-[#14251F]">
              {data.doctorName || "Dr. Harshali Sutar"}
            </p>
            <p className="text-[9.5px] text-[#68766F]">
              {data.doctorQualifications} {data.doctorSpecialization ? `• ${data.doctorSpecialization}` : ""}
            </p>
          </div>
        </div>

        {/* 5. ITEMIZED BILLING TABLE */}
        <div className="px-4 py-1">
          <div className="border-t-2 border-b border-[#CBDAD0] py-1 text-[8.5px] font-bold text-[#68766F] uppercase tracking-wider grid grid-cols-12">
            <span className="col-span-1 text-left">#</span>
            <span className="col-span-6 text-left">Description</span>
            <span className="col-span-1 text-center">Qty</span>
            <span className="col-span-2 text-right">Rate</span>
            <span className="col-span-2 text-right">Amount</span>
          </div>

          <div className="divide-y divide-[#F0F5F2] py-0.5">
            {data.items.map((item, idx) => (
              <div key={idx} className="py-1.5 grid grid-cols-12 text-[10px] items-start">
                <span className="col-span-1 font-mono text-[#889890]">{idx + 1}</span>
                <div className="col-span-6 pr-1">
                  <p className="font-semibold text-[#14251F] leading-tight text-[10.5px]">
                    {item.description}
                  </p>
                  {item.details && (
                    <p className="text-[9px] text-[#7A8B83] mt-0.5 leading-tight">
                      {item.details}
                    </p>
                  )}
                </div>
                <span className="col-span-1 text-center font-mono text-[#14251F]">
                  {item.quantity || 1}
                </span>
                <span className="col-span-2 text-right font-mono text-[#68766F]">
                  ₹{formatCurrency(item.unitPrice)}
                </span>
                <span className="col-span-2 text-right font-mono font-bold text-[#14251F]">
                  ₹{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 6. FINANCIAL BREAKDOWN & TOTAL PAID HIGHLIGHT */}
        <div className="px-4 py-1.5">
          <div className="border-t-2 border-dashed border-[#CBDAD0] pt-1.5 space-y-1 text-[10.5px]">
            <div className="flex justify-between text-[#68766F]">
              <span>Subtotal:</span>
              <span className="font-mono text-[#14251F]">₹{formatCurrency(data.subtotal)}</span>
            </div>

            {(data.discountAmount || 0) > 0 && (
              <div className="flex justify-between text-[#087443]">
                <span>Discount Applied:</span>
                <span className="font-mono">- ₹{formatCurrency(data.discountAmount)}</span>
              </div>
            )}

            {(data.taxAmount || 0) > 0 ? (
              <div className="flex justify-between text-[#68766F]">
                <span>GST / Taxes ({data.taxRate || 0}%):</span>
                <span className="font-mono">₹{formatCurrency(data.taxAmount)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-[#7A8B83] text-[9.5px]">
                <span>Healthcare Services GST:</span>
                <span className="font-medium text-[#087443]">Exempt</span>
              </div>
            )}

            {/* Prominent Paid Callout Banner */}
            <div className="mt-2 p-2.5 rounded-xl bg-[#064A2D] text-white flex justify-between items-center shadow-xs">
              <div>
                <span className="text-[8.5px] uppercase font-bold tracking-wider text-emerald-200 block">
                  Total Amount Paid
                </span>
                <span className="text-[9.5px] text-emerald-100/90 font-medium">
                  {isPaid ? "Payment Settled & Cleared" : "Recorded Payment"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono tracking-tight text-white">
                  ₹{formatCurrency(data.totalPaid)}
                </span>
              </div>
            </div>

            {Number(data.balanceAmount || 0) > 0 && (
              <div className="flex justify-between font-bold text-amber-800 pt-1 text-[11px]">
                <span>Remaining Balance Due:</span>
                <span className="font-mono">₹{formatCurrency(data.balanceAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Second Perforation */}
        <ReceiptPerforation />

        {/* 7. DIGITAL VERIFICATION, REAL QR & BARCODE */}
        <div className="px-4 py-1.5 flex items-center justify-between gap-3">
          <div className="flex-1">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#7A8B83] block mb-0.5">
              Digital Verification
            </span>
            <p className="text-[9.5px] text-[#14251F] font-semibold leading-tight">
              Tamper-evident healthcare audit record.
            </p>
            <p className="text-[8.5px] text-[#7A8B83] mt-0.5">
              Scan QR code to verify live on trigyna.com
            </p>
            <Link
              href={fullVerifyUrl}
              target="_blank"
              className="inline-flex items-center gap-1 text-[9.5px] text-[#087443] font-bold hover:underline mt-1"
            >
              <span>Verify Online</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>

          <div className="shrink-0">
            <ReceiptQrCode value={fullVerifyUrl} size={68} />
          </div>
        </div>

        {/* Realistic Barcode */}
        <div className="px-4 py-0.5">
          <ReceiptBarcode code={data.receiptNumber} />
        </div>

        {/* 8. AUTHORIZED SIGNATORY & CLINIC FOOTER */}
        <div className="px-4 pt-1 pb-3 text-center border-t border-[#EAF0EC] mt-1.5">
          {/* Signature Graphic */}
          <div className="flex flex-col items-center justify-center pt-1.5">
            <svg
              className="w-24 h-5 text-[#064A2D]"
              viewBox="0 0 160 45"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 32 C30 20, 45 5, 52 28 C56 40, 68 15, 80 22 C92 28, 105 10, 118 25 C125 32, 138 20, 150 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M40 25 C70 20, 110 24, 140 20"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <div className="w-32 border-t border-[#14251F]/40 pt-1">
              <p className="text-[9.5px] font-bold text-[#14251F] leading-tight">
                {data.doctorName || "Dr. Harshali Sutar"}
              </p>
              <p className="text-[7.5px] text-[#68766F] uppercase tracking-wider">
                Authorized Signatory • TriGyna
              </p>
            </div>
          </div>

          <p className="text-[11px] font-serif italic font-bold text-[#087443] mt-2">
            Thank you for trusting TriGyna Healthcare!
          </p>
          <p className="text-[8.5px] text-[#7A8B83] mt-0.5">
            Wishing you vibrant health & holistic wellness.
          </p>
          <p className="text-[7.5px] text-[#9AABA2] mt-0.5 font-mono">
            Computer-generated medical receipt • No physical stamp required
          </p>
        </div>

        {/* Bottom Serrated Edge / Accent Line */}
        <div className="h-1.5 w-full bg-[#064A2D]" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BULLETPROOF COMPACT PRINT STYLESHEET                          */}
      {/* ------------------------------------------------------------- */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: 80mm auto;
              margin: 0;
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

              /* Unclip modal wrappers */
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

              /* Hide non-receipt elements */
              body * {
                visibility: hidden !important;
              }

              /* Make only the generated bill receipt visible */
              #trigyna-billing-receipt,
              #trigyna-billing-receipt * {
                visibility: visible !important;
              }

              /* Position the receipt at exact 80mm width centered at top */
              #trigyna-billing-receipt {
                position: absolute !important;
                left: 0 !important;
                right: 0 !important;
                top: 0 !important;
                margin: 0 auto !important;
                width: 80mm !important;
                max-width: 80mm !important;
                box-shadow: none !important;
                border: 1px solid #c2cdc6 !important;
                border-radius: 4px !important;
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
    </div>
  );
}

/**
 * Fully Device-Friendly & Viewport-Centered Receipt Modal Wrapper
 * Uses React Portal to attach to document.body, locks background scroll,
 * and centers directly in active viewport with internal smooth bill scrolling.
 */
export function BillingReceiptModal({
  receipt,
  receiptData,
  onClose,
  showActions = true,
  onDownloadPdf,
  onPrint,
  autoPrint = false,
}: BillingReceiptProps) {
  const [mounted, setMounted] = React.useState(false);

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
        if (onPrint) onPrint();
        else printDocumentElement("trigyna-billing-receipt", false);
      }, 450);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.style.overflow = origOverflow;
      if (printTimer) clearTimeout(printTimer);
    };
  }, [onClose, autoPrint, onPrint]);

  if (!mounted || typeof document === "undefined") return null;

  const handleModalPrint = () => {
    if (onPrint) onPrint();
    else printDocumentElement("trigyna-billing-receipt", false);
  };

  const handleModalDownload = () => {
    if (onDownloadPdf) onDownloadPdf();
    else handleModalPrint();
  };

  const activeNumber =
    receiptData?.receiptNumber || receipt?.receiptNumber || "Official Slip";

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:h-auto animate-in fade-in duration-150"
      style={{ margin: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-[370px] max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#D5E2D9] overflow-hidden animate-in zoom-in-95 duration-150 print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none print:static print:w-full print:max-w-none print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header & Action Controls */}
        <div className="sticky top-0 z-30 bg-[#064A2D] text-white px-3.5 py-2 flex items-center justify-between shadow-xs shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-semibold text-xs tracking-wide truncate">
              Receipt: {activeNumber}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleModalPrint}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition flex items-center gap-1 cursor-pointer"
              title="Print Receipt Slip"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-200" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleModalDownload}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[#087443] hover:bg-[#053d25] shadow-xs transition flex items-center gap-1 cursor-pointer"
              title="Download Receipt PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer ml-1"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Receipt Body (Scrolls smoothly if bill is long) */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 bg-[#EAF0EC] overscroll-contain flex justify-center print:p-0 print:bg-white print:overflow-visible print:h-auto scrollbar-thin">
          <BillingReceipt
            receipt={receipt}
            receiptData={receiptData}
            showActions={false}
            onClose={onClose}
            onDownloadPdf={onDownloadPdf}
            onPrint={onPrint}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BillingReceipt;

