"use strict";

import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import CheckoutPageContent from "@/components/checkout/CheckoutPageContent";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Book Consultation & Care Package | TriGyna Health & Wellness",
  description: "Book an appointment or enroll in a holistic wellness protocol at TriGyna Health & Wellness.",
};

export default function BookAppointmentPage({
  searchParams,
}: {
  searchParams: { service?: string; package?: string; doctorId?: string; name?: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#087F56]" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}

