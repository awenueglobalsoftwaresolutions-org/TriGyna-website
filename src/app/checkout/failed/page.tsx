"use strict";
"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Phone,
  MessageCircle,
  Home,
  ShieldX,
  Loader2,
} from "lucide-react";

function FailedPageContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "";
  const token = searchParams.get("token") || "";
  const reason = searchParams.get("reason") || "The transaction was declined or interrupted by the issuing bank.";

  const retryUrl = token ? `/checkout/${encodeURIComponent(token)}` : "/services";

  return (
    <div className="min-h-screen bg-[#F5F8FA] text-[#111827] py-16 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-10 shadow-sm text-center">
        {/* Failure alert icon */}
        <div className="w-16 h-16 rounded-full bg-[#FEE2E2] border-4 border-[#EF4444]/20 text-[#EF4444] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <AlertCircle className="w-9 h-9 text-[#EF4444]" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#EF4444] bg-[#FEE2E2] px-3 py-1 rounded-full border border-[#EF4444]/20 mb-3">
          Payment Incomplete
        </span>

        <h1 className="font-serif text-2xl font-bold text-[#111827] mb-2">
          Payment Could Not Be Completed
        </h1>
        <p className="text-xs text-[#64748B] leading-relaxed mb-6">
          Your card, UPI, or bank account has not been charged for this consultation package. You may safely retry with
          an alternative payment method.
        </p>

        {/* Reason breakdown */}
        <div className="bg-[#FFF5F5] border border-[#EF4444]/20 rounded-xl p-4 mb-6 text-xs text-left">
          {orderNumber && (
            <div className="mb-2">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">Order Reference</span>
              <span className="font-mono font-bold text-[#111827]">{orderNumber}</span>
            </div>
          )}
          <div>
            <span className="text-[10px] uppercase font-bold text-[#EF4444] block">Reason Reported</span>
            <span className="text-[#111827]">{reason}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <Link
            href={retryUrl}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-bold shadow-xs transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Secure Payment</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/services"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#111827] text-xs font-semibold hover:bg-[#F8FAFC] transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Clinical Catalogue</span>
          </Link>
        </div>

        {/* Help footer */}
        <div className="pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B]">
          <p className="text-[11px] mb-2">Facing recurring gateway issues?</p>
          <a
            href="https://wa.me/919876543210?text=Hi%20TriGyna,%20I%20am%20having%20trouble%20completing%20payment%20for%20my%20order."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-[#087F56] hover:underline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Get WhatsApp Payment Link Support</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#087F56]" />
        </div>
      }
    >
      <FailedPageContent />
    </Suspense>
  );
}

