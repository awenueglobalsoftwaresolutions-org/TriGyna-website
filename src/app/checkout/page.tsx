"use strict";

import React, { Suspense } from "react";
import CheckoutPageContent from "@/components/checkout/CheckoutPageContent";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Secure Checkout & Payment | TriGyna Health & Wellness",
  description: "Official 256-bit encrypted checkout and clinical appointment booking for TriGyna Health & Wellness.",
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#087F56] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#111827]">Securing Checkout Session...</p>
          </div>
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}

