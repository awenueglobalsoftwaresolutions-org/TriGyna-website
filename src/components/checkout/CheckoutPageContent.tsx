"use strict";
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Phone,
  Mail,
  User,
  CreditCard,
  Video,
  Building2,
  ArrowRight,
  AlertCircle,
  Loader2,
  Edit2,
  Calendar,
  FileText,
  HelpCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { api, getBaseUrl } from "@/lib/api/client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface CatalogItem {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  description: string;
  price: number;
  pricePaise: number;
  totalSessions: number;
  sessionDurationMinutes?: number;
  validityDays: number;
  features?: string[];
  inclusions?: string[];
}

interface CheckoutOrder {
  orderId?: string;
  orderNumber: string;
  checkoutToken: string;
  serviceName: string;
  customerName: string;
  customerPhoneMasked: string;
  customerEmail: string;
  consultationMode: string;
  items: Array<{
    description: string;
    details?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    totalSessions?: number;
    validityDays?: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  terms?: {
    validityDays: number;
    totalSessions: number;
    cancellationPolicy: string;
    refundPolicy: string;
  };
  packageDetails?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    totalSessions: number;
    sessionDurationMinutes: number;
    features: string[];
  } | null;
  invoiceNumber?: string | null;
  receiptNumber?: string | null;
  isExpired?: boolean;
  razorpayKeyId?: string;
}

interface CheckoutProps {
  initialToken?: string;
  initialPaymentLinkId?: string;
  initialReference?: string;
}

export default function CheckoutPageContent({
  initialToken,
  initialPaymentLinkId,
  initialReference,
}: CheckoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query Parameters
  const referenceParam = initialReference || searchParams.get("ref") || "";
  const tokenParam =
    initialToken ||
    (!referenceParam ? searchParams.get("token") || searchParams.get("order") : "") ||
    "";
  const packageIdParam = searchParams.get("packageId") || searchParams.get("package") || "";
  const serviceIdParam = searchParams.get("serviceId") || searchParams.get("service") || "";
  const linkIdParam = initialPaymentLinkId || searchParams.get("linkId") || "";

  // Core State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Data State
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);

  // Form State (New or Guest Checkout)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consultationMode, setConsultationMode] = useState<"Online Video Consultation">(
    "Online Video Consultation"
  );
  const [isEditingPatient, setIsEditingPatient] = useState(false);

  // Processing & Payment State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStateText, setProcessingStateText] = useState("Processing...");

  // Load Razorpay Script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 1. Initial Load: Token, Link, or Catalog Item
  useEffect(() => {
    async function initializeCheckout() {
      try {
        setLoading(true);
        setError(null);

        // Scenario 0: Direct Secure Reference (from /checkout/pay/[secureReference])
        if (referenceParam) {
          const res = await api.get<CheckoutOrder>(`/checkout/orders/${encodeURIComponent(referenceParam)}`);
          if (res.success && res.data) {
            setOrder(res.data);
            setFullName(res.data.customerName || "");
            setEmail(res.data.customerEmail || "");
            setConsultationMode("Online Video Consultation");

            if (res.data.orderStatus === "paid" || res.data.paymentStatus === "success") {
              setCurrentStep(3);
              router.push(`/checkout/success?orderNumber=${res.data.orderNumber}&token=${res.data.checkoutToken}`);
              return;
            }

            setCurrentStep(2);
            setLoading(false);
            return;
          }

          // Fallback: resolve as payment link reference
          const resLink = await api.get<any>(`/checkout/payment-links/${encodeURIComponent(referenceParam)}`);
          if (resLink.success && resLink.data) {
            const plink = resLink.data;
            setFullName(plink.customerName || "");
            setEmail(plink.customerEmail || "");
            setCatalogItem({
              id: plink.paymentLinkId,
              name: plink.description || "TriGyna Healthcare Care Protocol",
              price: plink.balanceDue || plink.amount,
              pricePaise: Math.round((plink.balanceDue || plink.amount) * 100),
              totalSessions: 1,
              validityDays: 30,
              description: `Payment Link for Invoice ${plink.invoiceNumber || ""}`,
              inclusions: [
                "Specialist Doctor Consultation",
                "Clinical History & Symptom Evaluation",
                "Digital Regimen & Prescriptions",
              ],
            });
            setCurrentStep(2);
            setLoading(false);
            return;
          }
        }

        // Scenario A: Existing Order by Token
        if (tokenParam) {
          const res = await api.get<CheckoutOrder>(`/checkout/orders/${encodeURIComponent(tokenParam)}`);
          if (res.success && res.data) {
            setOrder(res.data);
            setFullName(res.data.customerName || "");
            setEmail(res.data.customerEmail || "");
            setConsultationMode("Online Video Consultation");

            if (res.data.orderStatus === "paid" || res.data.paymentStatus === "success") {
              setCurrentStep(3);
              router.push(`/checkout/success?orderNumber=${res.data.orderNumber}&token=${res.data.checkoutToken}`);
              return;
            }

            setCurrentStep(2);
            setLoading(false);
            return;
          }
        }

        // Scenario B: Admin Generated Payment Link
        if (linkIdParam) {
          const res = await api.get<any>(`/checkout/payment-links/${encodeURIComponent(linkIdParam)}`);
          if (res.success && res.data) {
            const plink = res.data;
            setFullName(plink.customerName || "");
            setEmail(plink.customerEmail || "");
            setCatalogItem({
              id: plink.paymentLinkId,
              name: plink.description || "TriGyna Clinical Invoice Settlement",
              price: plink.balanceDue,
              pricePaise: Math.round(plink.balanceDue * 100),
              totalSessions: 1,
              validityDays: 30,
              description: `Payment Link for Invoice ${plink.invoiceNumber || ""}`,
              inclusions: [
                "Official Clinical Invoicing",
                "Direct Accounts Settlement",
                "Instant GST Compliant Receipt",
              ],
            });
            setCurrentStep(2);
            setLoading(false);
            return;
          }
        }

        // Scenario C: Fresh Website Checkout from Catalog Item (Package or Service)
        if (packageIdParam || serviceIdParam) {
          const queryParam = packageIdParam ? `packageSlug=${packageIdParam}` : `serviceSlug=${serviceIdParam}`;
          const res = await api.get<{ type: string; item: CatalogItem }>(`/checkout/catalog-item?${queryParam}`);

          if (res.success && res.data?.item) {
            setCatalogItem(res.data.item);
            setCurrentStep(1);
            setLoading(false);
            return;
          }
        }

        // Scenario D: Default Fallback - load standard PCOD Holistic Package
        const fallbackRes = await api.get<{ type: string; item: CatalogItem }>(
          "/checkout/catalog-item?packageSlug=pcod-pcos-3-month-holistic-care"
        );
        if (fallbackRes.success && fallbackRes.data?.item) {
          setCatalogItem(fallbackRes.data.item);
          setCurrentStep(1);
        } else {
          setError("Please select a valid package or service from the TriGyna Catalogue to proceed.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to initialize checkout.");
      } finally {
        setLoading(false);
      }
    }

    initializeCheckout();
  }, [tokenParam, packageIdParam, serviceIdParam, linkIdParam, router]);

  // Handle Initiating / Updating Patient Details
  const handleSavePatientDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!order && (!phone.trim() || phone.replace(/\D/g, "").length < 10)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (order) {
      try {
        setIsProcessing(true);
        const updateRes = await api.patch<CheckoutOrder>(
          `/checkout/orders/${encodeURIComponent(order.checkoutToken)}/patient`,
          {
            customerName: fullName.trim(),
            customerEmail: email.trim(),
            consultationMode,
          }
        );
        if (updateRes.success && updateRes.data) {
          setOrder(updateRes.data);
          setIsEditingPatient(false);
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to update patient details");
      } finally {
        setIsProcessing(false);
      }
    } else {
      setIsEditingPatient(false);
      setCurrentStep(2);
    }
  };

  // Main Razorpay Checkout Trigger
  const handleProceedPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Validate patient details
      if (!fullName.trim()) {
        alert("Please enter your full name to proceed with medical order.");
        setIsProcessing(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to connect to Razorpay Payment Gateway. Check internet connectivity.");
      }

      let activeOrder = order;
      let activeOrderId = "";
      let activeKeyId = "";
      let amountPaise = 0;
      let orderToken = "";

      // 1. If order not yet created, create in MongoDB now
      if (!activeOrder) {
        setProcessingStateText("Securing Clinical Order...");
        const createRes = await api.post<{
          order: CheckoutOrder;
          checkoutToken: string;
          checkoutUrl: string;
          razorpay: {
            keyId: string;
            orderId: string;
            amountPaise: number;
            amountRupees: number;
            currency: string;
          };
        }>("/checkout/orders", {
          packageId: catalogItem?.id,
          packageSlug: catalogItem?.slug,
          serviceName: catalogItem?.name,
          customerName: fullName.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          consultationMode,
        });

        if (!createRes.success || !createRes.data) {
          throw new Error(createRes.message || "Failed to create verified checkout order");
        }

        activeOrder = createRes.data.order;
        setOrder(activeOrder);
        orderToken = createRes.data.checkoutToken;
        activeOrderId = createRes.data.razorpay.orderId;
        activeKeyId = createRes.data.razorpay.keyId;
        amountPaise = createRes.data.razorpay.amountPaise;
      } else {
        // Order exists: generate or verify active gateway order attempt
        setProcessingStateText("Connecting to Razorpay Gateway...");
        orderToken = activeOrder.checkoutToken;
        const attemptRes = await api.post<any>(
          `/checkout/orders/${encodeURIComponent(orderToken)}/payment`
        );

        if (!attemptRes.success || !attemptRes.data) {
          throw new Error(attemptRes.message || "Could not generate payment gateway order");
        }

        activeOrderId = attemptRes.data.providerOrderId;
        activeKeyId = attemptRes.data.keyId;
        amountPaise = attemptRes.data.amountPaise;
      }

      if (!activeKeyId) {
        throw new Error("Payment gateway is not currently configured. Please contact clinic support.");
      }

      setProcessingStateText("Opening Payment Gateway...");

      // 2. Open Official Razorpay Checkout Modal
      const options = {
        key: activeKeyId,
        amount: amountPaise,
        currency: "INR",
        name: "TriGyna Health & Wellness",
        description: activeOrder.serviceName,
        image: "/favicon.ico",
        order_id: activeOrderId,
        prefill: {
          name: activeOrder.customerName || fullName,
          contact: activeOrder.customerPhoneMasked?.includes("*") ? phone : activeOrder.customerPhoneMasked,
          email: activeOrder.customerEmail || email,
        },
        notes: {
          orderNumber: activeOrder.orderNumber,
          platform: "TriGyna Web Checkout",
        },
        theme: {
          color: "#087F56",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setProcessingStateText("Verifying Payment Cryptographically...");
            // 3. Cryptographic Signature Verification on Backend
            const verifyRes = await api.post<any>(
              `/checkout/orders/${encodeURIComponent(orderToken)}/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                paymentMethod: "upi",
              }
            );

            if (verifyRes.success && verifyRes.data?.verified) {
              setProcessingStateText("Payment Confirmed! Redirecting...");
              setCurrentStep(3);
              router.push(
                `/checkout/success?orderNumber=${encodeURIComponent(
                  activeOrder.orderNumber
                )}&token=${encodeURIComponent(orderToken)}&receiptNumber=${encodeURIComponent(
                  verifyRes.data.receiptNumber || ""
                )}`
              );
            } else {
              router.push(
                `/checkout/pending?orderNumber=${encodeURIComponent(
                  activeOrder.orderNumber
                )}&token=${encodeURIComponent(orderToken)}`
              );
            }
          } catch (vErr: unknown) {
            router.push(
              `/checkout/pending?orderNumber=${encodeURIComponent(
                activeOrder.orderNumber
              )}&token=${encodeURIComponent(orderToken)}`
            );
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on("payment.failed", (failResponse: any) => {
        setIsProcessing(false);
        router.push(
          `/checkout/failed?orderNumber=${encodeURIComponent(
            activeOrder.orderNumber
          )}&token=${encodeURIComponent(orderToken)}&reason=${encodeURIComponent(
            failResponse.error?.description || "Transaction declined by issuing bank"
          )}`
        );
      });

      rzpInstance.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment processing error.");
      setIsProcessing(false);
    }
  };

  // Calculations
  const displayTitle = order?.serviceName || catalogItem?.name || "PCOD/PCOS 3-Month Holistic Care";
  const displayDescription =
    order?.items?.[0]?.details ||
    catalogItem?.description ||
    "Root-cause hormonal balance, specialist consultations, customized regimens, and dedicated care coordinator.";
  const displayDuration =
    catalogItem?.validityDays || order?.terms?.validityDays || 90;
  const displaySessions =
    catalogItem?.totalSessions || order?.terms?.totalSessions || 3;
  const displayPrice = order?.totalAmount || catalogItem?.price || 3999;
  const displaySubtotal = order?.subtotal || catalogItem?.price || 3999;
  const displayDiscount = order?.discountAmount || 0;
  const displayTax = order?.taxAmount || 0;

  const inclusionsList = catalogItem?.inclusions || [
    "Specialist Gynaecologist & Holistic Consultations",
    "Personalized Clinical Care Plan & Diet Chart",
    "Digital Regimen & Certified Prescriptions",
    "Dedicated Clinical Care Coordinator on WhatsApp",
    "Periodic Follow-up & Symptom Progress Tracking",
  ];

  return (
    <div className="min-h-screen bg-[#F5F8FA] text-[#111827] font-sans flex flex-col justify-between selection:bg-[#ECFDF3] selection:text-[#087F56]">
      {/* 1. TOP CHECKOUT HEADER */}
      <section className="bg-white border-b border-[#E2E8F0] sticky top-[68px] sm:top-[72px] z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#087F56] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              TG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base tracking-tight text-[#087F56] leading-none">
                  TriGyna
                </span>
                <span className="text-[10px] bg-[#ECFDF3] text-[#087F56] font-semibold px-2 py-0.5 rounded-full border border-[#087F56]/20">
                  Official Checkout
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] block mt-0.5">
                Healthcare &amp; Clinical Wellness System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#087F56] bg-[#ECFDF3] px-3.5 py-1.5 rounded-full border border-[#087F56]/20 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-[#087F56]" />
            <span className="hidden sm:inline">256-Bit SSL Encrypted Checkout</span>
            <span className="sm:hidden">256-Bit SSL</span>
          </div>
        </div>
      </section>

      {/* 2. THREE-STEP CHECKOUT PROGRESS INDICATOR */}
      <section className="bg-white border-b border-[#E2E8F0]/80 py-4 px-4 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between text-xs font-medium">
          {/* Step 1: Order Details */}
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep >= 1
                  ? "bg-[#087F56] text-white"
                  : "bg-gray-100 text-[#64748B]"
              }`}
            >
              1
            </div>
            <span className={currentStep >= 1 ? "font-bold text-[#087F56]" : "text-[#64748B]"}>
              Order Details
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 2 ? "bg-[#087F56]" : "bg-gray-200"}`} />

          {/* Step 2: Payment */}
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep >= 2
                  ? "bg-[#087F56] text-white"
                  : "bg-gray-100 text-[#64748B]"
              }`}
            >
              2
            </div>
            <span className={currentStep >= 2 ? "font-bold text-[#087F56]" : "text-[#64748B]"}>
              Payment
            </span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 3 ? "bg-[#087F56]" : "bg-gray-200"}`} />

          {/* Step 3: Confirmation */}
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep >= 3
                  ? "bg-[#087F56] text-white"
                  : "bg-gray-100 text-[#64748B]"
              }`}
            >
              3
            </div>
            <span className={currentStep >= 3 ? "font-bold text-[#087F56]" : "text-[#64748B]"}>
              Confirmation
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN CHECKOUT WORKSPACE (2-COLUMN LAYOUT) */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#087F56] mb-3" />
            <h3 className="text-base font-bold text-[#111827]">Securing Your Clinical Order...</h3>
            <p className="text-xs text-[#64748B] mt-1">Retrieving authoritative database pricing snapshot...</p>
          </div>
        ) : error && !order && !catalogItem ? (
          <div className="max-w-md mx-auto p-8 bg-white border border-[#EF4444]/30 rounded-2xl text-center shadow-xs">
            <AlertCircle className="w-10 h-10 text-[#EF4444] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#111827]">Checkout Order Unavailable</h3>
            <p className="text-xs text-[#64748B] mt-2 mb-6 leading-relaxed">{error}</p>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#087F56] text-white text-xs font-semibold shadow-xs hover:bg-[#075D42] transition-colors"
            >
              <span>Explore Clinical Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ============================================================== */}
            {/* LEFT COLUMN: ORDER SUMMARY, INCLUSIONS & PATIENT PROFILE       */}
            {/* ============================================================== */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Package & Protocol Summary */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#087F56] bg-[#ECFDF3] px-2.5 py-1 rounded-md border border-[#087F56]/20 mb-2">
                      <Sparkles className="w-3 h-3 text-[#087F56]" />
                      Doctor-Led Care Protocol
                    </span>
                    <h1 className="font-serif text-2xl font-bold text-[#111827] leading-tight">
                      {displayTitle}
                    </h1>
                    {order?.orderNumber && (
                      <p className="text-xs text-[#64748B] font-mono mt-1">
                        Order Ref: <span className="font-semibold text-[#111827]">{order.orderNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#64748B] leading-relaxed mb-4">{displayDescription}</p>

                {/* Specs pill bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/70 text-xs text-[#111827]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#087F56] shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#64748B] block">Duration</span>
                      <span className="font-semibold">{displayDuration} Days Plan</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#087F56] shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#64748B] block">Sessions</span>
                      <span className="font-semibold">{displaySessions} Consultations</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    {consultationMode === "Online Video Consultation" ? (
                      <Video className="w-4 h-4 text-[#087F56] shrink-0" />
                    ) : (
                      <Building2 className="w-4 h-4 text-[#087F56] shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] text-[#64748B] block">Mode</span>
                      <span className="font-semibold">{consultationMode.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: What's Included (Protocol Inclusions) */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#087F56] mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#087F56]" />
                  What&apos;s Included In This Care Package
                </h3>

                <div className="space-y-3">
                  {inclusionsList.map((inc, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs text-[#111827]">
                      <div className="w-4 h-4 rounded-full bg-[#ECFDF3] text-[#087F56] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#087F56]" />
                      </div>
                      <span className="leading-snug">{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Patient Information */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#111827] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#087F56]" />
                    Patient Consultation Details
                  </h3>
                  {order && !isEditingPatient && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPatient(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087F56] hover:text-[#064E3B] cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  )}
                </div>

                {!isEditingPatient && order ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]/70">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748B] block">Full Name</span>
                      <span className="font-semibold text-[#111827] text-sm">{order.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748B] block">Mobile Phone</span>
                      <span className="font-semibold text-[#111827] text-sm">{order.customerPhoneMasked}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748B] block">Email Address</span>
                      <span className="text-[#111827]">{order.customerEmail || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#64748B] block">Consultation Mode</span>
                      <span className="font-semibold text-[#087F56]">{order.consultationMode}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSavePatientDetails} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#111827] block mb-1.5">
                        Patient Full Name <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Sunita Sharma"
                          className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#111827] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F56]/20 focus:border-[#087F56]"
                        />
                      </div>
                    </div>

                    {!order && (
                      <div>
                        <label className="text-xs font-semibold text-[#111827] block mb-1.5">
                          Indian Mobile Number <span className="text-[#EF4444]">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 9876543210"
                            className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#111827] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F56]/20 focus:border-[#087F56]"
                          />
                        </div>
                        <span className="text-[10px] text-[#64748B] mt-1 block">
                          Instant appointment confirmations and WhatsApp care link are delivered here.
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-[#111827] block mb-1.5">
                        Email Address (For Tax Invoice &amp; Receipts)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. sunita@example.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#111827] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F56]/20 focus:border-[#087F56]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#111827] block mb-1.5">
                        Consultation Mode
                      </label>
                      <div className="p-3 rounded-xl border border-[#087F56]/30 bg-[#ECFDF3] text-[#087F56] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Video className="w-4 h-4 shrink-0 text-[#087F56]" />
                          <div>
                            <span className="text-xs font-bold block">Online Video Consultation</span>
                            <span className="text-[10px] text-[#64748B]">Consult securely from anywhere via Google Meet / Zoom</span>
                          </div>
                        </div>
                        <span className="bg-[#087F56] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Online Only
                        </span>
                      </div>
                    </div>

                    {order && isEditingPatient && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-semibold cursor-pointer"
                        >
                          {isProcessing ? "Saving..." : "Save Patient Details"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPatient(false)}
                          className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] text-xs font-semibold hover:bg-[#F8FAFC] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* Card 4: Clinical Support & Trust Strip */}
              <div className="bg-[#ECFDF3]/40 border border-[#087F56]/20 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-[#064E3B]">
                <ShieldCheck className="w-5 h-5 text-[#087F56] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm text-[#087F56]">
                    Clinical Assurance &amp; Safe Care Guarantee
                  </span>
                  <p className="mt-1 text-[#064E3B] leading-relaxed">
                    All care packages are administered directly by certified gynaecologists and wellness practitioners.
                    Cancellations allowed up to 4 hours prior to appointment with a 100% money-back policy for
                    unconsumed session credits.
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* RIGHT COLUMN: SECURE PAYMENT & REAL BREAKDOWN                  */}
            {/* ============================================================== */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-[152px]">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#087F56]" />
                    <h3 className="font-bold text-sm text-[#111827]">Secure Checkout &amp; Settlement</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#087F56] bg-[#ECFDF3] px-2 py-0.5 rounded-md">
                    Instant Activation
                  </span>
                </div>

                {/* Supported Payment Channels */}
                <div className="mb-6">
                  <span className="text-[11px] uppercase font-bold text-[#64748B] block mb-2 tracking-wider">
                    Accepted Payment Channels
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-[#111827]">
                    <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col items-center justify-center">
                      <span className="text-[#087F56] font-bold text-xs">UPI</span>
                      <span className="text-[9px] text-[#64748B]">GPay, PhonePe</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5 text-[#087F56] mb-0.5" />
                      <span className="text-[9px] text-[#64748B]">Cards / EMI</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-[#087F56] mb-0.5" />
                      <span className="text-[9px] text-[#64748B]">Net Banking</span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#087F56] mb-0.5" />
                      <span className="text-[9px] text-[#64748B]">Wallets</span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 pb-5 border-b border-[#E2E8F0] mb-5 text-xs text-[#64748B]">
                  <div className="flex items-center justify-between text-[#111827]">
                    <span>Base Program Fee</span>
                    <span className="font-semibold font-mono">₹{displaySubtotal.toLocaleString("en-IN")}</span>
                  </div>

                  {displayDiscount > 0 && (
                    <div className="flex items-center justify-between text-[#087F56]">
                      <span>Authorised Discount</span>
                      <span className="font-semibold font-mono">-₹{displayDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Taxes &amp; GST</span>
                      <span className="text-[10px] text-[#087F56] bg-[#ECFDF3] px-1.5 py-0.2 rounded font-semibold">
                        Clinical Exemption
                      </span>
                    </span>
                    <span className="font-mono text-[#111827]">
                      {displayTax > 0 ? `₹${displayTax}` : "Included"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span>Official A4 Tax Invoice &amp; Receipt</span>
                    <span className="text-[#087F56] font-semibold">Free Auto-Generated</span>
                  </div>
                </div>

                {/* Total Payable Box */}
                <div className="flex items-baseline justify-between mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Total Payable Amount
                    </span>
                    <span className="text-2xl font-bold font-serif text-[#087F56]">
                      ₹{displayPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B]">INR (All-inclusive)</span>
                </div>

                {/* Payment CTA Button */}
                <button
                  type="button"
                  onClick={handleProceedPayment}
                  disabled={isProcessing}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isProcessing
                      ? "bg-[#087F56]/70 cursor-not-allowed"
                      : "bg-[#087F56] hover:bg-[#075D42] shadow-[#087F56]/20 hover:shadow-lg hover:shadow-[#087F56]/30 active:scale-[0.99]"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{processingStateText}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay ₹{displayPrice.toLocaleString("en-IN")} Securely</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                {/* Razorpay Trust Marks */}
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]/70 flex items-center justify-center gap-4 text-[10px] text-[#64748B]">
                  <span className="flex items-center gap-1 font-semibold text-[#111827]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#087F56]" />
                    Razorpay Verified Partner
                  </span>
                  <span>•</span>
                  <span>RBI Compliant</span>
                  <span>•</span>
                  <span>Instant Confirmation</span>
                </div>
              </div>

              {/* Help & Support Card */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#087F56]" />
                  <div>
                    <span className="font-semibold text-[#111827] block">Need assistance with payment?</span>
                    <span className="text-[11px]">Care Helpline: +91 98765 43210</span>
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="text-xs font-semibold text-[#087F56] hover:underline whitespace-nowrap"
                >
                  Get Help
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. FOOTER NOTE */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6 text-center text-xs text-[#64748B]">
        <div className="max-w-6xl mx-auto px-4">
          <p>© 2026 TriGyna Health &amp; Wellness Private Limited. All clinical rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px]">
            <Link href="/privacy-policy" className="hover:text-[#111827]">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms-and-conditions" className="hover:text-[#111827]">Terms of Service</Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-[#111827]">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

