"use strict";
"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Loader2,
  RefreshCw,
  Phone,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api/client";

function PendingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "";
  const token = searchParams.get("token") || "";

  const [polling, setPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Awaiting bank confirmation via secure webhook...");
  const [orderState, setOrderState] = useState<any>(null);

  const checkStatus = useCallback(async () => {
    const ref = token || orderNumber;
    if (!ref) return;

    try {
      const res = await api.get<any>(`/checkout/orders/${encodeURIComponent(ref)}/status`);
      if (res.success && res.data) {
        setOrderState(res.data);
        if (res.data.isSettled || res.data.orderStatus === "paid" || res.data.paymentStatus === "success") {
          setPolling(false);
          router.push(
            `/checkout/success?orderNumber=${encodeURIComponent(
              res.data.orderNumber
            )}&token=${encodeURIComponent(token)}&receiptNumber=${encodeURIComponent(
              res.data.receipt?.receiptNumber || ""
            )}`
          );
        } else if (res.data.paymentStatus === "failed") {
          setPolling(false);
          router.push(
            `/checkout/failed?orderNumber=${encodeURIComponent(
              res.data.orderNumber
            )}&token=${encodeURIComponent(token)}&reason=Payment%20was%20declined%20by%20bank`
          );
        }
      }
    } catch {
      // Keep polling silently
    }
  }, [token, orderNumber, router]);

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      setPollCount((prev) => {
        if (prev >= 20) {
          // After 60 seconds (20 x 3s), stop auto-polling to save bandwidth
          setPolling(false);
          setStatusMessage("Bank verification is taking longer than usual. Please check your bank SMS or click Refresh.");
          return prev;
        }
        checkStatus();
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, checkStatus]);

  return (
    <div className="min-h-screen bg-[#F5F8FA] text-[#111827] py-16 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-[#FEF3C7] border-4 border-[#F59E0B]/20 text-[#D97706] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Clock className="w-8 h-8 text-[#D97706] animate-pulse" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-3 py-1 rounded-full border border-[#F59E0B]/30 mb-3">
          Verification In Progress
        </span>

        <h1 className="font-serif text-2xl font-bold text-[#111827] mb-2">
          Payment Received — Verifying
        </h1>
        <p className="text-xs text-[#64748B] leading-relaxed mb-6">
          We have received your payment request and are validating the cryptographic signature with your bank and
          Razorpay. Your order will update automatically once verified.
        </p>

        {orderNumber && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mb-6 text-xs text-left">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">Order Reference</span>
            <span className="font-mono font-bold text-[#111827]">{orderNumber}</span>
          </div>
        )}

        {/* Polling Spinner indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-[#087F56] font-medium mb-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{statusMessage}</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={checkStatus}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Payment Status</span>
          </button>

          <Link
            href="/contact"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#111827] text-xs font-semibold hover:bg-[#F8FAFC] transition-all"
          >
            <Phone className="w-4 h-4" />
            <span>Contact TriGyna Care Desk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#087F56]" />
        </div>
      }
    >
      <PendingPageContent />
    </Suspense>
  );
}

