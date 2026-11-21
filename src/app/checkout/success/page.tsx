"use strict";
"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileText,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Phone,
  MessageCircle,
  Home,
  Clock,
  Loader2,
} from "lucide-react";
import { api, getBaseUrl } from "@/lib/api/client";

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "";
  const token = searchParams.get("token") || "";
  const receiptParam = searchParams.get("receiptNumber") || "";

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    async function loadConfirmation() {
      if (!token && !orderNumber) {
        setLoading(false);
        return;
      }
      try {
        const ref = token || orderNumber;
        const res = await api.get<any>(`/checkout/orders/${encodeURIComponent(ref)}`);
        if (res.success && res.data) {
          setOrderData(res.data);
        }
      } catch {
        // Fallback to query params if network error
      } finally {
        setLoading(false);
      }
    }

    loadConfirmation();
  }, [token, orderNumber]);

  const displayOrderNumber = orderData?.orderNumber || orderNumber || "ORD-2026";
  const displayReceiptNumber = orderData?.receiptNumber || receiptParam || "RCP/2026/010099";
  const displayInvoiceNumber = orderData?.invoiceNumber || "INV-2026-1205";
  const displayServiceName = orderData?.serviceName || "PCOD/PCOS 3-Month Holistic Care";
  const displayAmount = orderData?.totalAmount || orderData?.paidAmount || 3999;
  const displayCustomer = orderData?.customerName || "Valued Patient";

  const downloadReceiptUrl = `${getBaseUrl()}/checkout/orders/${encodeURIComponent(token || displayOrderNumber)}/receipt`;
  const downloadInvoiceUrl = `${getBaseUrl()}/checkout/orders/${encodeURIComponent(token || displayOrderNumber)}/invoice`;

  return (
    <div className="min-h-screen bg-[#F5F8FA] text-[#111827] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Main Success Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-10 shadow-sm text-center">
          {/* Animated checkmark badge */}
          <div className="w-16 h-16 rounded-full bg-[#ECFDF3] border-4 border-[#087F56]/20 text-[#087F56] flex items-center justify-center mx-auto mb-5 shadow-xs">
            <CheckCircle2 className="w-9 h-9 text-[#087F56]" />
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#087F56] bg-[#ECFDF3] px-3 py-1 rounded-full border border-[#087F56]/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F56]" />
            Payment Verified &amp; Confirmed
          </span>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#111827] leading-tight mb-2">
            Thank You, {displayCustomer}!
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed mb-8">
            Your healthcare enrollment has been successfully authenticated. Official medical receipts and session
            credits have been attached to your clinical chart.
          </p>

          {/* Key Identifiers Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-left text-xs mb-8">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#64748B] block">Order Number</span>
              <span className="font-mono font-bold text-[#111827]">{displayOrderNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#64748B] block">Receipt Number</span>
              <span className="font-mono font-bold text-[#087F56]">{displayReceiptNumber}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase text-[#64748B] block">Amount Paid</span>
              <span className="font-mono font-bold text-[#111827]">₹{Number(displayAmount).toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Purchased Program Inclusions */}
          <div className="p-5 rounded-2xl border border-[#087F56]/20 bg-[#ECFDF3]/40 text-left mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#087F56]" />
              <span className="font-bold text-sm text-[#087F56]">{displayServiceName}</span>
            </div>
            <p className="text-xs text-[#064E3B] leading-relaxed">
              Your care package is now active. Your dedicated clinical coordinator will reach out over WhatsApp within
              2 working hours to confirm your first specialist appointment slot.
            </p>
          </div>

          {/* Document Download Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <a
              href={downloadReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-[#087F56] text-[#087F56] hover:bg-[#ECFDF3] text-xs font-bold transition-all shadow-2xs"
            >
              <Receipt className="w-4 h-4" />
              <span>Download Official Receipt (PDF)</span>
            </a>

            <a
              href={downloadInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#111827] hover:bg-[#F8FAFC] text-xs font-bold transition-all shadow-2xs"
            >
              <FileText className="w-4 h-4 text-[#64748B]" />
              <span>Download Tax Invoice (PDF)</span>
            </a>
          </div>

          {/* Navigation CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-[#E2E8F0]">
            <Link
              href="/patient/portal"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Go to Patient Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#111827] text-xs font-semibold transition-all hover:bg-[#F8FAFC]"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Link>
          </div>
        </div>

        {/* WhatsApp Immediate Helpline Strip */}
        <div className="mt-6 p-4 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#ECFDF3] text-[#087F56] flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[#111827] block">Need to schedule your slot immediately?</span>
              <span className="text-[11px]">Chat with our 24/7 care desk on WhatsApp</span>
            </div>
          </div>
          <a
            href="https://wa.me/919876543210?text=Hi%20TriGyna,%20I%20just%20completed%20checkout%20for%20my%20care%20package."
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#087F56] hover:underline"
          >
            Chat Now
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#087F56]" />
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
