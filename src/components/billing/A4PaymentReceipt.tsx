"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
  Check,
  User,
  Stethoscope,
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  Mail,
  Globe,
  Printer,
  Download,
  ShieldCheck,
} from "lucide-react";

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
    };
  } | null;
}

// Default reference data matching exact user prompt image
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
  doctorSpecialization: "Women Health & PCOS",
  serviceName: "PCOS Management Consultation",
  appointmentDateTime: "27 Oct 2026, 11:30 AM",
  duration: "30 Minutes",
  appointmentMode: "Online Video Consultation",
  items: [
    {
      description: "PCOS Management Consultation",
      details: "Online Video Consultation (30 Minutes)",
      quantity: 1,
      unitPrice: 1000.0,
      amount: 1000.0,
    },
    {
      description: "Follow-up Support (14 Days)",
      details: "Included in the consultation package",
      quantity: 1,
      unitPrice: 0.0,
      amount: 0.0,
    },
  ],
  paymentMethod: "UPI (PhonePe)",
  providerTransactionId: "T2610271122456789",
  paymentStatus: "Paid",
  subtotal: 1000.0,
  discountAmount: 0.0,
  taxRate: 0,
  taxAmount: 0.0,
  totalPaid: 1000.0,
  verificationToken: "tg_rcp_2026_000458_verif",
};

// Second sample receipt with different doctor, patient, service, and pricing
export const SAMPLE2_RECEIPT: PaymentReceiptData = {
  receiptNumber: "RCP/2026/000912",
  invoiceNumber: "TRI/2026/000912",
  issuedAt: "2026-10-29T10:15:00",
  paidAt: "2026-10-29T10:15:00",
  patientName: "Priya Nair",
  patientCode: "TRI-2026-000456",
  patientPhone: "+91 94470 12345",
  patientEmail: "priya.nair@kerala.org",
  doctorName: "Dr. Rajesh Kulkarni",
  doctorQualifications: "MBBS, DGO, DNB (Obstetrics & Gynaecology)",
  doctorSpecialization: "Holistic Fertility & Pre-conception Care",
  serviceName: "Pre-Conception Holistic Care Consultation",
  appointmentDateTime: "29 Oct 2026, 10:15 AM",
  duration: "40 Minutes",
  appointmentMode: "In-Clinic Consultation (Pune)",
  items: [
    {
      description: "Pre-Conception Health Assessment",
      details: "Full reproductive health check & ovarian ultrasound review",
      quantity: 1,
      unitPrice: 1800.0,
      amount: 1800.0,
    },
    {
      description: "Holistic Ovulation Tracking Kit",
      details: "Herbal supplements and ovulation calendar schedule",
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
  totalPaid: 2500.0,
  verificationToken: "tg_rcp_2026_000912_verif",
};

// Stress-test receipt with extended strings, multiple items, and detailed taxes
export const LONG_TEST_RECEIPT: PaymentReceiptData = {
  receiptNumber: "RCP/2026/000789-EXTENDED",
  invoiceNumber: "TRI/2026/000789-EXTENDED",
  issuedAt: "2026-10-28T14:30:00",
  paidAt: "2026-10-28T14:30:00",
  patientName: "Dr. Ananya Priyadarshini-Chattopadhyay",
  patientCode: "TRI-2026-LONG-000987654321",
  patientPhone: "+91 98765 43210 / +91 91234 56789",
  patientEmail: "ananya.priyadarshini.chattopadhyay@corporate-enterprise.com",
  doctorName: "Dr. Harshali Sutar-Mukherjee",
  doctorQualifications: "MBBS, MD (Homoeopathy), Fellow in Reproductive Endocrinology",
  doctorSpecialization: "Women Health & Advanced Hormonal PCOS Management",
  serviceName: "Comprehensive Polycystic Ovary Syndrome Advanced Hormonal & Metabolic Reversal Programme",
  appointmentDateTime: "28 Oct 2026, 02:30 PM",
  duration: "45 Minutes",
  appointmentMode: "Online Video Consultation",
  items: [
    {
      description: "Advanced Hormonal PCOS Diagnostic Consultation",
      details: "Comprehensive metabolic panel review and symptom mapping",
      quantity: 1,
      unitPrice: 1500.0,
      amount: 1500.0,
    },
    {
      description: "Customized Clinical Nutrition & Dietary Protocol",
      details: "Anti-inflammatory low-glycemic dietary planning guide",
      quantity: 1,
      unitPrice: 500.0,
      amount: 500.0,
    },
    {
      description: "Digital Follow-up Monitoring & Lab Interpretation",
      details: "Dedicated clinical WhatsApp channel for 30 days",
      quantity: 1,
      unitPrice: 0.0,
      amount: 0.0,
    },
  ],
  paymentMethod: "NetBanking (HDFC Bank)",
  providerTransactionId: "HDFC98765432101234567890",
  paymentStatus: "Paid",
  subtotal: 2000.0,
  discountAmount: 200.0,
  taxRate: 18,
  taxAmount: 324.0,
  totalPaid: 2124.0,
  verificationToken: "tg_rcp_2026_000789_long_verif",
};

function formatCurrency(amount: number = 0) {
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateInput?: string | Date) {
  if (!dateInput) return "27 Oct 2026";
  const d = new Date(dateInput);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateInput?: string | Date) {
  if (!dateInput) return "11:22 AM";
  const d = new Date(dateInput);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Top Right Botanical Leaves SVG Accent
function TopRightBotanical() {
  return (
    <svg
      className="absolute top-0 right-0 w-36 h-36 md:w-44 md:h-44 pointer-events-none opacity-85"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M210 -10 C160 30, 110 80, 85 145"
        stroke="#6D982B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      {/* Leaf 1 */}
      <path
        d="M175 15 C150 25, 138 48, 148 65 C165 60, 182 38, 175 15 Z"
        fill="#8FB359"
        fillOpacity="0.38"
      />
      {/* Leaf 2 */}
      <path
        d="M142 50 C118 52, 106 75, 115 95 C132 92, 150 72, 142 50 Z"
        fill="#AEC88B"
        fillOpacity="0.45"
      />
      {/* Leaf 3 */}
      <path
        d="M112 85 C88 92, 80 115, 90 135 C108 130, 122 108, 112 85 Z"
        fill="#6D982B"
        fillOpacity="0.32"
      />
      {/* Leaf 4 */}
      <path
        d="M165 42 C185 55, 195 80, 185 98 C170 95, 155 75, 165 42 Z"
        fill="#7A9E38"
        fillOpacity="0.35"
      />
      {/* Leaf 5 */}
      <path
        d="M85 145 C75 160, 68 180, 78 190 C88 185, 92 165, 85 145 Z"
        fill="#8FB359"
        fillOpacity="0.4"
      />
    </svg>
  );
}

// Bottom Right Botanical Leaves SVG Accent
function BottomRightBotanical() {
  return (
    <svg
      className="absolute bottom-6 right-0 w-32 h-32 md:w-40 md:h-40 pointer-events-none opacity-85"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M210 210 C165 170, 125 130, 105 70"
        stroke="#6D982B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />
      <path
        d="M180 180 C155 172, 142 148, 152 130 C170 135, 188 158, 180 180 Z"
        fill="#8FB359"
        fillOpacity="0.38"
      />
      <path
        d="M148 145 C122 140, 112 118, 122 98 C140 102, 155 125, 148 145 Z"
        fill="#AEC88B"
        fillOpacity="0.42"
      />
      <path
        d="M105 70 C95 55, 88 35, 98 25 C108 30, 112 50, 105 70 Z"
        fill="#6D982B"
        fillOpacity="0.35"
      />
    </svg>
  );
}

interface A4PaymentReceiptProps {
  receipt?: Partial<PaymentReceiptData>;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
}

export function A4PaymentReceipt({
  receipt = {},
  showActions = true,
  onDownloadPdf,
  onPrint,
}: A4PaymentReceiptProps) {
  const data: PaymentReceiptData = {
    _id: receipt._id,
    receiptNumber: receipt.receiptNumber || "—",
    invoiceNumber: receipt.invoiceNumber || "—",
    issuedAt: receipt.issuedAt || new Date().toISOString(),
    paidAt: receipt.paidAt,
    patientName: receipt.patientName || "—",
    patientCode: receipt.patientCode || "—",
    patientPhone: receipt.patientPhone || "—",
    patientEmail: receipt.patientEmail,
    doctorName: receipt.doctorName || "Consultant Doctor",
    doctorQualifications: receipt.doctorQualifications || "",
    doctorSpecialization: receipt.doctorSpecialization || "Women Health & Wellness",
    serviceName: receipt.serviceName || receipt.items?.[0]?.description || "Clinical Consultation",
    appointmentDateTime: receipt.appointmentDateTime || "",
    duration: receipt.duration || "30 Minutes",
    appointmentMode: receipt.appointmentMode || "Clinical Consultation",
    items:
      receipt.items && receipt.items.length > 0
        ? receipt.items
        : [
            {
              description: receipt.serviceName || "Clinical Consultation",
              quantity: 1,
              unitPrice: receipt.subtotal !== undefined ? receipt.subtotal : receipt.totalPaid || 0,
              amount: receipt.subtotal !== undefined ? receipt.subtotal : receipt.totalPaid || 0,
            },
          ],
    paymentMethod: receipt.paymentMethod || "UPI",
    providerTransactionId: receipt.providerTransactionId || "—",
    paymentStatus: receipt.paymentStatus || "Paid",
    subtotal: receipt.subtotal !== undefined ? receipt.subtotal : receipt.totalPaid || 0,
    discountAmount: receipt.discountAmount || 0,
    taxRate: receipt.taxRate || 0,
    taxAmount: receipt.taxAmount || 0,
    totalAmount: receipt.totalAmount !== undefined ? receipt.totalAmount : receipt.totalPaid || 0,
    totalPaid: receipt.totalPaid || 0,
    balanceAmount: receipt.balanceAmount || 0,
    refundDetails: receipt.refundDetails || null,
    verificationToken: receipt.verificationToken,
    organization: receipt.organization,
  };

  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
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
      window.print();
    }
  };

  // Status-dependent presentation
  const pStatus = (data.paymentStatus || "Paid").toLowerCase();
  let bannerTitle = "Payment Successful";
  let bannerDesc = "Your payment has been received. We look forward to supporting your health and wellness journey.";
  let bannerBadgeBg = "bg-[#087443]";
  let bannerBadgeText = "Paid";
  let bannerIconBg = "bg-[#064A2D]";

  if (pStatus === "partially_paid" || pStatus === "partial") {
    bannerTitle = "Partial Payment Received";
    bannerDesc = "Part of the invoice amount has been received. The remaining balance is recorded below.";
    bannerBadgeBg = "bg-[#D97706]";
    bannerBadgeText = "Partial";
    bannerIconBg = "bg-[#B45309]";
  } else if (pStatus === "refunded") {
    bannerTitle = "Payment Refunded";
    bannerDesc = "This payment transaction has been processed for refund to the original payment source.";
    bannerBadgeBg = "bg-[#DC2626]";
    bannerBadgeText = "Refunded";
    bannerIconBg = "bg-[#991B1B]";
  } else if (pStatus === "pending") {
    bannerTitle = "Payment Pending Verification";
    bannerDesc = "Payment is currently pending verification from the bank or payment gateway.";
    bannerBadgeBg = "bg-[#F59E0B]";
    bannerBadgeText = "Pending";
    bannerIconBg = "bg-[#D97706]";
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Interactive Action Bar (Hidden in Print) */}
      {showActions && (
        <div className="no-print w-full max-w-[210mm] mb-4 flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E4EEE7] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF8F1] text-[#087443]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Official Verified Healthcare Receipt
            </span>
            <span className="text-xs text-[#68766F] font-mono hidden sm:inline">
              {data.receiptNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#14251F] bg-[#F4FAF6] hover:bg-[#E4EEE7] transition flex items-center gap-1.5 cursor-pointer"
              title="Print A4 Receipt"
            >
              <Printer className="w-4 h-4 text-[#087443]" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownload}
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#087443] hover:bg-[#064A2D] shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Download High-Resolution PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EXACT A4 RECEIPT CONTAINER (210mm x 297mm)                    */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={receiptRef}
        id="trigyna-a4-receipt"
        className="receipt-print-container relative w-full max-w-[210mm] min-h-[297mm] bg-white text-[#14251F] p-6 sm:p-8 md:p-9 shadow-lg border border-[#E4EEE7] rounded-none md:rounded-lg overflow-hidden flex flex-col justify-between"
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Botanical corner decorations */}
        <TopRightBotanical />
        <BottomRightBotanical />

        {/* Top Header Section */}
        <div>
          <div className="flex items-start justify-between relative z-10 pt-1 pb-3 sm:pb-3.5 border-b border-[#E4EEE7]/60">
            {/* Top Left: TriGyna Official Logo */}
            <div className="flex flex-col">
              <div className="relative w-40 h-11">
                <Image
                  src="/images/brand/logo.webp"
                  alt="TriGyna Women Health & Wellness"
                  fill
                  sizes="180px"
                  className="object-contain object-left"
                  priority
                />
              </div>
            </div>

            {/* Top Right: Payment Receipt title & tagline */}
            <div className="text-right">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#064A2D] tracking-tight leading-tight">
                Payment Receipt
              </h1>
              <p className="text-xs font-semibold text-[#087443] mt-0.5">
                Thank you for trusting TriGyna
              </p>
              <p className="text-[11px] text-[#68766F] mt-0.5">
                Your health and wellness journey matters to us.
              </p>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* PAYMENT STATUS BANNER                                       */}
          {/* ----------------------------------------------------------- */}
          <div className="relative z-10 bg-[#EDF8F1] border border-[#D5E8DC] rounded-xl p-3 sm:p-3.5 flex flex-row items-center justify-between gap-3 my-2.5">
            {/* Left: Status circle with checkmark + message */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-9 h-9 rounded-full ${bannerIconBg} text-white flex items-center justify-center shrink-0 shadow-xs`}>
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#064A2D] leading-tight">
                  {bannerTitle}
                </h2>
                <p className="text-[11px] text-[#68766F] mt-0.5 leading-snug">
                  {bannerDesc}
                </p>
              </div>
            </div>

            {/* Right: Divider & Receipt Numbers */}
            <div className="flex items-center gap-4 sm:gap-6 border-l border-[#D5E8DC] pl-4 sm:pl-6 shrink-0 justify-end">
              <div>
                <p className="text-[10px] font-medium text-[#68766F]">Receipt No.</p>
                <p className="text-xs sm:text-sm font-bold text-[#14251F] font-mono tracking-tight">
                  {data.receiptNumber}
                </p>
                <div className="mt-1">
                  <span className="text-[9px] text-[#68766F] block">Invoice No.</span>
                  <span className="text-[11px] font-semibold text-[#14251F] font-mono">
                    {data.invoiceNumber}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-medium text-[#68766F]">Date & Time</p>
                <p className="text-xs sm:text-sm font-bold text-[#14251F]">
                  {formatDate(data.paidAt || data.issuedAt)}
                </p>
                <p className="text-[11px] text-[#68766F] mt-0.5">
                  {formatTime(data.paidAt || data.issuedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* ROW 1: PATIENT DETAILS & CONSULTANT DETAILS                 */}
          {/* ----------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3 mb-2.5 relative z-10">
            {/* Patient Details Card */}
            <div className="bg-white border border-[#E4EEE7] rounded-xl p-3 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#EDF8F1] flex items-center justify-center text-[#087443] shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#14251F]">Patient Details</h3>
              </div>

              <div className="space-y-1 text-[11px] leading-tight">
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-[#68766F]">Name</span>
                  <span className="col-span-8 font-bold text-[#14251F] truncate">{data.patientName}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-[#68766F]">Patient ID</span>
                  <span className="col-span-8 font-bold text-[#14251F] font-mono truncate">{data.patientCode}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-[#68766F]">Mobile No.</span>
                  <span className="col-span-8 text-[#14251F] truncate">{data.patientPhone}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-[#68766F]">Email</span>
                  <span className="col-span-8 text-[#14251F] truncate">
                    {data.patientEmail ? data.patientEmail : <span className="text-[#889890] italic">Not provided</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Consultant Details Card */}
            <div className="bg-white border border-[#E4EEE7] rounded-xl p-3 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#EDF8F1] flex items-center justify-center text-[#087443] shrink-0">
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#14251F]">Consultant Details</h3>
              </div>

              <div className="space-y-1 text-[11px] leading-tight">
                <div className="grid grid-cols-12">
                  <span className="col-span-5 text-[#68766F]">Consultant</span>
                  <span className="col-span-7 font-bold text-[#14251F] truncate">{data.doctorName}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 text-[#68766F]">Qualifications</span>
                  <span className="col-span-7 text-[#14251F] truncate">{data.doctorQualifications || "Medical Consultant"}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 text-[#68766F]">Specialization</span>
                  <span className="col-span-7 text-[#14251F] truncate">{data.doctorSpecialization}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 text-[#68766F]">Consultation</span>
                  <span className="col-span-7 text-[#14251F] truncate">{data.appointmentMode}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* ROW 2: APPOINTMENT DETAILS (Full Width Card)                */}
          {/* ----------------------------------------------------------- */}
          <div className="bg-white border border-[#E4EEE7] rounded-xl p-3 shadow-2xs mb-2.5 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#EDF8F1] flex items-center justify-center text-[#087443] shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-[#14251F]">Appointment Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[11px] leading-tight">
              <div className="grid grid-cols-12">
                <span className="col-span-5 text-[#68766F]">Service / Prog.</span>
                <span className="col-span-7 font-bold text-[#14251F] truncate">{data.serviceName}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-[#68766F]">Duration</span>
                <span className="col-span-8 text-[#14251F] truncate">{data.duration || "30 Minutes"}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-5 text-[#68766F]">Date & Time</span>
                <span className="col-span-7 text-[#14251F] truncate">{data.appointmentDateTime || formatDate(data.paidAt || data.issuedAt)}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-[#68766F]">Mode</span>
                <span className="col-span-8 text-[#14251F] truncate">{data.appointmentMode}</span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* ROW 3: ITEMIZED BILLING TABLE                               */}
          {/* ----------------------------------------------------------- */}
          <div className="border border-[#E4EEE7] rounded-xl overflow-hidden mb-2.5 relative z-10 shadow-2xs">
            {/* Table Header: Deep Forest Green #064A2D */}
            <div className="bg-[#064A2D] text-white font-bold text-[11px] grid grid-cols-12 px-3 py-2 items-center">
              <span className="col-span-1 text-center">#</span>
              <span className="col-span-6">Description</span>
              <span className="col-span-1 text-center">Qty</span>
              <span className="col-span-2 text-right">Unit Price (₹)</span>
              <span className="col-span-2 text-right">Amount (₹)</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#E4EEE7] bg-white text-[11px]">
              {data.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-3 py-2 items-center hover:bg-[#F8FAF9]/80 transition leading-tight"
                >
                  <span className="col-span-1 text-center font-medium text-[#68766F]">
                    {idx + 1}
                  </span>
                  <div className="col-span-6 pr-2">
                    <p className="font-bold text-[#14251F] text-[11px] leading-tight">{item.description}</p>
                    {item.details && (
                      <p className="text-[10px] text-[#68766F] mt-0.5 leading-tight">{item.details}</p>
                    )}
                  </div>
                  <span className="col-span-1 text-center text-[#14251F]">
                    {item.quantity || 1}
                  </span>
                  <span className="col-span-2 text-right font-mono text-[#14251F]">
                    {formatCurrency(item.unitPrice)}
                  </span>
                  <span className="col-span-2 text-right font-mono font-bold text-[#14251F]">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* ROW 4: PAYMENT INFO & AMOUNT SUMMARY (Two Balanced Panels)  */}
          {/* ----------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3 mb-2.5 relative z-10">
            {/* Payment Information */}
            <div className="bg-white border border-[#E4EEE7] rounded-xl p-3 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#EDF8F1] flex items-center justify-center text-[#087443] shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#14251F]">Payment Information</h3>
              </div>

              <div className="space-y-1.5 text-[11px] leading-tight">
                <div className="grid grid-cols-12">
                  <span className="col-span-5 text-[#68766F]">Method</span>
                  <span className="col-span-7 font-bold text-[#14251F] truncate">{data.paymentMethod}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 text-[#68766F]">Txn ID</span>
                  <span className="col-span-7 font-mono font-semibold text-[#14251F] truncate">
                    {data.providerTransactionId}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5 text-[#68766F]">Date</span>
                  <span className="col-span-7 text-[#14251F] truncate">
                    {formatDate(data.paidAt || data.issuedAt)}, {formatTime(data.paidAt || data.issuedAt)}
                  </span>
                </div>
                <div className="grid grid-cols-12 items-center">
                  <span className="col-span-5 text-[#68766F]">Status</span>
                  <div className="col-span-7">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${bannerBadgeBg} text-white`}>
                      {bannerBadgeText}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Summary */}
            <div className="bg-white border border-[#E4EEE7] rounded-xl p-3 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[#EDF8F1] flex items-center justify-center text-[#087443] shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#14251F]">Amount Summary</h3>
                </div>

                <div className="space-y-1 text-[11px] leading-tight">
                  <div className="flex justify-between">
                    <span className="text-[#68766F]">Subtotal</span>
                    <span className="font-mono text-[#14251F]">
                      ₹ {formatCurrency(data.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#68766F]">Discount</span>
                    <span className="font-mono text-[#14251F]">
                      - ₹ {formatCurrency(data.discountAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#68766F]">
                      Tax ({data.taxRate !== undefined ? `${data.taxRate}%` : "0%"})
                    </span>
                    <span className="font-mono text-[#14251F]">
                      ₹ {formatCurrency(data.taxAmount || 0)}
                    </span>
                  </div>
                  {Number(data.balanceAmount || 0) > 0 && (
                    <div className="flex justify-between font-bold text-[#B45309]">
                      <span>Balance Due</span>
                      <span className="font-mono">
                        ₹ {formatCurrency(data.balanceAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Paid Highlight Bar */}
              <div className="mt-2 bg-[#EDF8F1] rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-[#064A2D]">Total Paid</span>
                <span className="text-sm sm:text-base font-bold font-mono text-[#064A2D]">
                  ₹ {formatCurrency(data.totalPaid)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM SECTION: THANK YOU, SIGNATURE & CONTACT STRIP          */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-10 pt-1">
          {/* Thank You & Authorized Signatory Row */}
          <div className="flex items-end justify-between px-2 pb-3 border-b border-[#E4EEE7]/80">
            {/* Left: Thank You Script */}
            <div className="flex flex-col">
              <span
                className="text-3xl text-[#087443] font-serif italic tracking-wide"
                style={{
                  fontFamily: "'Dancing Script', 'Alex Brush', 'Playfair Display', Georgia, serif",
                  transform: "rotate(-2deg)",
                }}
              >
                Thank you
              </span>
              <span className="text-[11px] text-[#68766F] font-medium mt-0.5">
                for being a part of your health journey.
              </span>
            </div>

            {/* Right: Signature Graphic & Signatory */}
            <div className="flex flex-col items-center text-center">
              {/* Handwritten signature stroke */}
              <svg
                className="w-32 h-8 text-[#14251F]"
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

              <div className="w-44 border-t border-[#14251F]/40 pt-1">
                <p className="text-[11px] font-bold text-[#14251F] leading-tight truncate">
                  {data.doctorName || data.organization?.name || "Authorized Signatory"}
                </p>
                <p className="text-[9px] text-[#68766F] mt-0.5">
                  Authorized Signatory
                </p>
                <p className="text-[8px] text-[#889890] truncate">
                  {data.organization?.name || "TriGyna Women Health & Wellness"}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Footer Strip */}
          <div className="mt-2.5 bg-[#EDF8F1] rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-y-1 text-[10px] text-[#14251F]">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-0.5">
              <span className="flex items-center gap-1 text-[#14251F]">
                <MapPin className="w-3 h-3 text-[#087443] shrink-0" />
                <span>{data.organization?.address?.city || "Pune"}, Maharashtra, India</span>
              </span>

              <span className="flex items-center gap-1 text-[#14251F]">
                <Phone className="w-3 h-3 text-[#087443] shrink-0" />
                <span>{data.organization?.phone || "+91 917-277-2326"}</span>
              </span>

              <span className="flex items-center gap-1 text-[#14251F]">
                <Mail className="w-3 h-3 text-[#087443] shrink-0" />
                <span>{data.organization?.email || "trigyna.health@gmail.com"}</span>
              </span>

              <span className="flex items-center gap-1 text-[#14251F]">
                <Globe className="w-3 h-3 text-[#087443] shrink-0" />
                <span>{data.organization?.website ? data.organization.website.replace(/^https?:\/\//, "") : "www.trigyna.com"}</span>
              </span>
            </div>

            <div className="text-right text-[10px] font-semibold text-[#087443]">
              Women Health | Holistic Care | Better Tomorrows
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PURE CSS PRINT STYLESHEET (A4 PORTRAIT EXACT 1-PAGE FIT)      */}
      {/* ------------------------------------------------------------- */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 0;
            }

            @media print {
              *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              html, body {
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                overflow: visible !important;
              }

              /* Hide UI navigation, sidebar, headers, and action buttons */
              header,
              nav,
              aside,
              footer,
              .no-print,
              button:not(.allow-print) {
                display: none !important;
              }

              /* Modal container print normalization */
              .receipt-modal-backdrop,
              .receipt-modal-dialog {
                position: static !important;
                inset: auto !important;
                background: transparent !important;
                backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                overflow: visible !important;
                display: block !important;
              }

              /* Exact A4 fit without clipping or extra page generation */
              .receipt-print-container {
                width: 210mm !important;
                max-width: 210mm !important;
                min-height: 297mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 auto !important;
                padding: 8mm 10mm !important;
                box-sizing: border-box !important;
                background: #ffffff !important;
                color: #14251f !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                overflow: hidden !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }

              .receipt-print-container * {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              /* Maintain 2-column card layouts in print */
              .receipt-print-container .grid.grid-cols-2 {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }

              .receipt-print-container .grid.grid-cols-12 {
                display: grid !important;
                grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
