"use strict";

import React, { Suspense } from "react";
import CheckoutPageContent from "@/components/checkout/CheckoutPageContent";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "TriGyna Healthcare Secure Payment | Razorpay Checkout",
  description:
    "Official 256-bit SSL encrypted patient checkout and online billing settlement for TriGyna Health & Wellness.",
};

type PaymentPageProps = {
  params: Promise<{ paymentToken: string }> | { paymentToken: string };
};

export default async function PatientPaymentCheckoutPage({ params }: PaymentPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const paymentToken = resolvedParams.paymentToken;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#087F56] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#111827]">
              Loading Secure TriGyna Payment Portal...
            </p>
          </div>
        </div>
      }
    >
      <CheckoutPageContent initialToken={paymentToken} />
    </Suspense>
  );
}
