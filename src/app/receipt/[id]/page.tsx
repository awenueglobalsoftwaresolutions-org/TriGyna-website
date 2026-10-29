"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import {
  A4PaymentReceipt,
  PaymentReceiptData,
  ReceiptItem,
} from "@/components/billing/A4PaymentReceipt";

export default function StandaloneReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReceipt() {
      if (!id) return;
      try {
        setLoading(true);
        setErrorMessage(null);

        interface ApiReceiptPayload extends PaymentReceiptData {
          amountPaid?: number;
        }

        // Fetch receipt by receiptId, invoiceId, or paymentId
        let res = await api.get<{ receipt: ApiReceiptPayload }>(`/receipts/${id}`);
        if (!res.success || !res.data?.receipt) {
          res = await api.get<{ receipt: ApiReceiptPayload }>(`/receipts/by-invoice/${id}`);
        }
        if (!res.success || !res.data?.receipt) {
          res = await api.get<{ receipt: ApiReceiptPayload }>(`/payments/${id}/receipt`);
        }

        if (isMounted) {
          if (res.success && res.data?.receipt) {
            const r = res.data.receipt;
            const formatted: PaymentReceiptData = {
              _id: r._id,
              receiptNumber: r.receiptNumber || "—",
              invoiceNumber: r.invoiceNumber || "—",
              issuedAt: r.issuedAt || new Date().toISOString(),
              paidAt: r.paidAt || r.issuedAt,
              patientName: r.patientName || "—",
              patientCode: r.patientCode || "—",
              patientPhone: r.patientPhone || "—",
              patientEmail: r.patientEmail,
              doctorName: r.doctorName || "Consultant Doctor",
              doctorQualifications: r.doctorQualifications || "",
              doctorSpecialization: r.doctorSpecialization || "Women Health & Wellness",
              serviceName: r.serviceName || r.items?.[0]?.description || "Clinical Consultation",
              appointmentDateTime: r.appointmentDateTime || "",
              duration: r.duration || "30 Minutes",
              appointmentMode: r.appointmentMode || "Clinical Consultation",
              items:
                Array.isArray(r.items) && r.items.length > 0
                  ? r.items.map((it: ReceiptItem) => ({
                      description: it.description,
                      details: it.details,
                      quantity: it.quantity || 1,
                      unitPrice: it.unitPrice !== undefined ? it.unitPrice : it.amount,
                      amount: it.amount,
                    }))
                  : [],
              paymentMethod: r.paymentMethod || "UPI",
              providerTransactionId: r.providerTransactionId,
              paymentStatus: r.paymentStatus || "Paid",
              subtotal: r.subtotal !== undefined ? r.subtotal : (r.totalPaid || 0),
              discountAmount: r.discountAmount || 0,
              taxRate: r.taxRate || 0,
              taxAmount: r.taxAmount || 0,
              totalAmount: r.totalAmount !== undefined ? r.totalAmount : (r.totalPaid || 0),
              totalPaid: r.amountPaid !== undefined ? r.amountPaid : (r.totalPaid || 0),
              balanceAmount: r.balanceAmount || 0,
              refundDetails: r.refundDetails || null,
              verificationToken: r.verificationToken,
              organization: r.organization,
            };
            setReceiptData(formatted);
          } else {
            setErrorMessage("Receipt record not found or no verified payment exists for this reference.");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
          const msg =
            errorObj?.response?.data?.message ||
            errorObj?.message ||
            "Unable to retrieve the authentic payment receipt from database.";
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReceipt();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#087443] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#14251F]">Fetching authenticated payment receipt...</p>
      </div>
    );
  }

  if (errorMessage || !receiptData) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#14251F] mb-2">Receipt Not Available</h2>
        <p className="text-sm text-[#68766F] max-w-md mb-6 leading-relaxed">
          {errorMessage || "The requested receipt record could not be found or you do not have permission to view it."}
        </p>
        <button
          onClick={() => router.push("/patient/payments")}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#087443] hover:bg-[#064A2D] shadow-xs transition"
        >
          Return to Payments
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F5F2] py-6 px-3 sm:px-6 print:min-h-0 print:p-0 print:m-0 print:bg-white">
      {/* Top Navigation Bar - Hidden on print */}
      <div className="no-print max-w-[210mm] mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#14251F] bg-white border border-[#E4EEE7] hover:bg-gray-50 transition cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#087443]" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {receiptData.verificationToken && (
            <Link
              href={`/receipt/verify/${receiptData.verificationToken}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#087443] bg-[#EDF8F1] border border-[#D5E8DC] hover:bg-[#E2F3E8] transition shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Document</span>
            </Link>
          )}
        </div>
      </div>

      {/* Render the Exact Reference A4 Receipt Component with authentic database data */}
      <div className="max-w-[210mm] mx-auto print:max-w-none print:w-full print:m-0 print:p-0">
        <A4PaymentReceipt receipt={receiptData} showActions={true} />
      </div>
    </div>
  );
}
