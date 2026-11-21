"use strict";
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CreditCard,
  User,
  Package as PackageIcon,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Phone,
  Mail,
  Copy,
  Check,
  Share2,
  Send,
  Loader2,
  AlertCircle,
  ExternalLink,
  QrCode,
  Tag,
  Building2,
  PlusCircle,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import QRCode from "qrcode";
import { api } from "@/lib/api/client";

interface PatientSearchResult {
  _id: string;
  patientCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  age?: number;
}

interface PackageOption {
  _id: string;
  name: string;
  code?: string;
  slug?: string;
  category: string;
  pricePaise: number;
  totalSessions: number;
  validityDays: number;
  description: string;
  features?: string[];
  inclusions?: string[];
}

interface ServiceOption {
  _id: string;
  name: string;
  code: string;
  category: string;
  department?: string;
  baseFee: number;
  durationMinutes: number;
  description?: string;
}

interface PaymentLinkGeneratorModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (paymentLink: any) => void;
  defaultPatientId?: string;
  defaultPackageId?: string;
  userRole?: string;
}

export default function PaymentLinkGeneratorModal({
  isOpen = true,
  onClose,
  onSuccess,
  defaultPatientId,
  defaultPackageId,
  userRole = "admin",
}: PaymentLinkGeneratorModalProps) {
  if (!isOpen) return null;
  // Step Navigation
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Tab 1: Patient Selection Mode
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [patientSearch, setPatientSearch] = useState("");
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

  // New Patient Form
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientGender, setNewPatientGender] = useState("female");
  const [newPatientAge, setNewPatientAge] = useState<number | string>(28);
  const [newPatientCity, setNewPatientCity] = useState("Prayagraj");

  // Tab 2: Service & Package Selection
  const [itemType, setItemType] = useState<"package" | "service">("package");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [consultationMode, setConsultationMode] = useState<"Online Video Consultation">(
    "Online Video Consultation"
  );

  // Tab 3: Pricing & Discounts
  const [quantity, setQuantity] = useState<number>(1);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState("");
  const [taxBracket, setTaxBracket] = useState<number>(0); // 0% healthcare exempt default
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);

  // Tab 4: Settings & Delivery
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [description, setDescription] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [sendWhatsAppImmediate, setSendWhatsAppImmediate] = useState(true);
  const [sendEmailImmediate, setSendEmailImmediate] = useState(true);

  // Submission & Results State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    paymentLink: any;
    order: any;
    checkoutUrl: string;
    shortUrl: string;
    qrDataUrl?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [manualSendStatus, setManualSendStatus] = useState<{
    whatsapp?: string;
    email?: string;
  }>({});

  // 1. Fetch Catalogue on Modal Open
  useEffect(() => {
    if (!isOpen) return;

    async function loadCatalogue() {
      try {
        setIsLoadingCatalogue(true);
        const [pkgRes, srvRes] = await Promise.all([
          api.get<{ packages: PackageOption[] }>("/packages"),
          api.get<{ services: ServiceOption[] }>("/services"),
        ]);

        if (pkgRes.success && pkgRes.data?.packages) {
          setPackages(pkgRes.data.packages);
          if (defaultPackageId) {
            const found = pkgRes.data.packages.find((p) => p._id === defaultPackageId);
            if (found) setSelectedPackage(found);
          }
        }
        if (srvRes.success && srvRes.data?.services) {
          setServices(srvRes.data.services);
        }
      } catch (err) {
        console.warn("Failed to load catalogue:", err);
      } finally {
        setIsLoadingCatalogue(false);
      }
    }

    loadCatalogue();
  }, [isOpen, defaultPackageId]);

  // 2. Patient Search Debounce
  useEffect(() => {
    if (patientMode !== "existing" || !patientSearch.trim() || patientSearch.trim().length < 2) {
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPatient(true);
        const res = await api.get<{ patients: PatientSearchResult[] }>(
          `/patients?search=${encodeURIComponent(patientSearch.trim())}&limit=5`
        );
        if (res.success && res.data?.patients) {
          setPatientResults(res.data.patients);
        }
      } catch (err) {
        console.warn("Patient search failed:", err);
      } finally {
        setIsSearchingPatient(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch, patientMode]);

  // Department Filters
  const departments = useMemo(() => {
    const set = new Set<string>();
    packages.forEach((p) => p.category && set.add(p.category));
    services.forEach((s) => (s.department || s.category) && set.add(s.department || s.category));
    return ["all", ...Array.from(set)];
  }, [packages, services]);

  const filteredPackages = useMemo(() => {
    if (selectedDepartment === "all") return packages;
    return packages.filter((p) => p.category === selectedDepartment);
  }, [packages, selectedDepartment]);

  const filteredServices = useMemo(() => {
    if (selectedDepartment === "all") return services;
    return services.filter((s) => (s.department || s.category) === selectedDepartment);
  }, [services, selectedDepartment]);

  // Server-Authoritative Price Calculations
  const baseUnitPrice = useMemo(() => {
    if (itemType === "package" && selectedPackage) {
      return selectedPackage.pricePaise ? selectedPackage.pricePaise / 100 : 0;
    }
    if (itemType === "service" && selectedService) {
      return selectedService.baseFee || 800;
    }
    return 0;
  }, [itemType, selectedPackage, selectedService]);

  const subtotal = useMemo(() => {
    return Math.round(baseUnitPrice * Math.max(1, quantity) * 100) / 100;
  }, [baseUnitPrice, quantity]);

  const calculatedDiscount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === "percent") {
      return Math.round((subtotal * (discountValue / 100)) * 100) / 100;
    }
    return Math.min(subtotal, Math.round(discountValue * 100) / 100);
  }, [discountValue, discountType, subtotal]);

  const calculatedTax = useMemo(() => {
    if (taxBracket <= 0) return 0;
    const taxable = Math.max(0, subtotal - calculatedDiscount);
    return Math.round((taxable * (taxBracket / 100)) * 100) / 100;
  }, [subtotal, calculatedDiscount, taxBracket]);

  const finalPayable = useMemo(() => {
    const total = subtotal - calculatedDiscount + calculatedTax + (Number(additionalCharges) || 0);
    return Math.max(0, Math.round(total * 100) / 100);
  }, [subtotal, calculatedDiscount, calculatedTax, additionalCharges]);

  const isHighDiscount = calculatedDiscount > 0.2 * subtotal;
  const isDiscountDisallowed = isHighDiscount && !["owner", "admin"].includes(userRole);

  // Form submission: Create Official Payment Link
  const handleCreatePaymentLink = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Validation
      if (patientMode === "existing" && !selectedPatient) {
        throw new Error("Please select an existing patient or switch to register a new patient.");
      }
      if (patientMode === "new") {
        if (!newPatientName.trim()) throw new Error("Patient full name is required.");
        if (!newPatientPhone.trim() || newPatientPhone.replace(/\D/g, "").length < 10) {
          throw new Error("A valid 10-digit mobile number is required.");
        }
      }

      if (itemType === "package" && !selectedPackage) {
        throw new Error("Please select a healthcare package.");
      }
      if (itemType === "service" && !selectedService) {
        throw new Error("Please select a clinical service.");
      }

      if (calculatedDiscount > 0 && !discountReason.trim()) {
        throw new Error("Please specify a reason for applying this discount.");
      }

      if (isDiscountDisallowed) {
        throw new Error("Discounts greater than 20% require Administrator authorization.");
      }

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiryDays);

      const payload: any = {
        consultationMode,
        quantity: Math.max(1, quantity),
        discountAmount: discountType === "fixed" ? calculatedDiscount : undefined,
        discountPercent: discountType === "percent" ? discountValue : undefined,
        discountReason: calculatedDiscount > 0 ? discountReason.trim() : undefined,
        taxRate: taxBracket,
        additionalCharges: Number(additionalCharges) || 0,
        expiryDate: expDate.toISOString(),
        expiryDays,
        description: description.trim() || undefined,
        notes: internalNotes.trim() ? { internalNotes: internalNotes.trim() } : {},
        sendViaWhatsApp: sendWhatsAppImmediate,
        sendViaEmail: sendEmailImmediate,
      };

      if (patientMode === "existing" && selectedPatient) {
        payload.patientId = selectedPatient._id;
        payload.customerName = selectedPatient.fullName;
        payload.customerPhone = selectedPatient.phone;
        payload.customerEmail = selectedPatient.email;
      } else {
        payload.newPatient = {
          fullName: newPatientName.trim(),
          phone: newPatientPhone.trim(),
          email: newPatientEmail.trim() || undefined,
          gender: newPatientGender,
          age: Number(newPatientAge) || 28,
          address: { city: newPatientCity.trim() },
        };
        payload.customerName = newPatientName.trim();
        payload.customerPhone = newPatientPhone.trim();
        payload.customerEmail = newPatientEmail.trim() || undefined;
      }

      if (itemType === "package" && selectedPackage) {
        payload.packageId = selectedPackage._id;
        payload.packageCode = selectedPackage.code;
      } else if (itemType === "service" && selectedService) {
        payload.serviceId = selectedService._id;
        payload.serviceCode = selectedService.code;
      }

      const res = await api.post<any>("/billing/payment-links", payload);

      if (res.success && res.data) {
        const primaryCheckoutUrl = res.data.checkoutUrl;
        let qrDataUrl = "";
        try {
          qrDataUrl = await QRCode.toDataURL(primaryCheckoutUrl, { width: 220, margin: 1 });
        } catch {}

        setCreatedResult({
          paymentLink: res.data.paymentLink,
          order: res.data.order,
          checkoutUrl: primaryCheckoutUrl,
          shortUrl: res.data.shortUrl,
          qrDataUrl,
        });

        if (onSuccess) {
          onSuccess(res.data.paymentLink);
        }
      } else {
        throw new Error(res.message || "Failed to generate official payment link");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred while generating payment link");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-send payment link actions
  const handleManualSend = async (channel: "whatsapp" | "email") => {
    if (!createdResult?.paymentLink?._id) return;
    try {
      if (channel === "whatsapp") setIsSendingWhatsApp(true);
      if (channel === "email") setIsSendingEmail(true);

      const res = await api.post<any>(`/billing/payment-links/${createdResult.paymentLink._id}/send`, {
        channel,
      });

      if (res.success) {
        setManualSendStatus((prev) => ({
          ...prev,
          [channel]: `Sent successfully via ${channel === "whatsapp" ? "WhatsApp Cloud API" : "Email Service"}`,
        }));
      }
    } catch (err: any) {
      setManualSendStatus((prev) => ({
        ...prev,
        [channel]: `Delivery notice: ${err?.message || "Failed to dispatch"}`,
      }));
    } finally {
      setIsSendingWhatsApp(false);
      setIsSendingEmail(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdResult?.checkoutUrl) return;
    navigator.clipboard.writeText(createdResult.checkoutUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E5EAF0] shadow-2xl w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#087F56] to-[#064E3B] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/20">
              <CreditCard className="w-5 h-5 text-[#86EFAC]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-white">Generate Patient Payment Link</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-[#86EFAC]">
                  Razorpay Verified
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Create an authoritative order snapshot and branded checkout link with automatic fulfillment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {createdResult ? (
          /* ============================================================== */
          /* SUCCESS VIEW: PAYMENT LINK READY & DISPATCH CHANNELS          */
          /* ============================================================== */
          <div className="p-8 space-y-6 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF3] text-[#087F56] flex items-center justify-center mx-auto border border-[#087F56]/20">
                <CheckCircle2 className="w-8 h-8 text-[#087F56]" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#111827]">Payment Link Active &amp; Ready</h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Official TriGyna order #{createdResult.order?.orderNumber || "ORD-2026"} has been persisted in MongoDB
                with a linked pending invoice.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left: Link Details & Actions */}
              <div className="space-y-4">
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-[#64748B]">Payable Amount</span>
                    <span className="font-bold text-base text-[#087F56]">
                      ₹{Number(createdResult.paymentLink?.amount || finalPayable).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Patient</span>
                    <span className="font-semibold text-[#111827]">{createdResult.paymentLink?.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Reference</span>
                    <span className="font-mono text-[11px] font-bold text-[#111827]">
                      {createdResult.paymentLink?.paymentLinkId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Expiry</span>
                    <span className="text-[#64748B]">
                      {new Date(createdResult.paymentLink?.expiryDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Branded Checkout URL Box */}
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Branded Checkout Link
                  </label>
                  <div className="flex items-center gap-2 bg-[#F1F5F9] p-2 rounded-xl border border-[#CBD5E1]">
                    <input
                      type="text"
                      readOnly
                      value={createdResult.checkoutUrl}
                      className="bg-transparent text-xs text-[#0F172A] font-mono flex-1 outline-none px-2 select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#087F56] hover:bg-emerald-50 flex items-center gap-1 shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Dispatch Channels */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleManualSend("whatsapp")}
                      disabled={isSendingWhatsApp}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20BA5C] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {isSendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Resend WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleManualSend("email")}
                      disabled={isSendingEmail}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#087F56] hover:bg-[#075D42] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      {isSendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>Resend Email</span>
                    </button>
                  </div>
                  {manualSendStatus.whatsapp && (
                    <p className="text-[11px] text-[#087F56]">{manualSendStatus.whatsapp}</p>
                  )}
                  {manualSendStatus.email && (
                    <p className="text-[11px] text-[#087F56]">{manualSendStatus.email}</p>
                  )}
                </div>
              </div>

              {/* Right: QR Code for instant payment */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#087F56]" />
                  <span>Instant Scan &amp; Pay QR</span>
                </p>
                {createdResult.qrDataUrl ? (
                  <img
                    src={createdResult.qrDataUrl}
                    alt="Payment QR"
                    className="w-44 h-44 mx-auto rounded-2xl bg-white p-2 border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-44 h-44 mx-auto rounded-2xl bg-white border flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
                <a
                  href={createdResult.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087F56] hover:underline"
                >
                  <span>Open Checkout Preview</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* FORM VIEW: 4-STEP WIZARD                                       */
          /* ============================================================== */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
              <button
                onClick={() => setActiveStep(1)}
                className={`flex items-center gap-2 pb-1 ${
                  activeStep === 1
                    ? "text-[#087F56] border-b-2 border-[#087F56] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#087F56] text-[11px] flex items-center justify-center font-bold">
                  1
                </span>
                <span>Patient</span>
              </button>
              <button
                onClick={() => setActiveStep(2)}
                className={`flex items-center gap-2 pb-1 ${
                  activeStep === 2
                    ? "text-[#087F56] border-b-2 border-[#087F56] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#087F56] text-[11px] flex items-center justify-center font-bold">
                  2
                </span>
                <span>Care Protocol</span>
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className={`flex items-center gap-2 pb-1 ${
                  activeStep === 3
                    ? "text-[#087F56] border-b-2 border-[#087F56] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#087F56] text-[11px] flex items-center justify-center font-bold">
                  3
                </span>
                <span>Pricing &amp; Discounts</span>
              </button>
              <button
                onClick={() => setActiveStep(4)}
                className={`flex items-center gap-2 pb-1 ${
                  activeStep === 4
                    ? "text-[#087F56] border-b-2 border-[#087F56] font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#087F56] text-[11px] flex items-center justify-center font-bold">
                  4
                </span>
                <span>Settings &amp; Dispatch</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 1: PATIENT IDENTIFICATION                                 */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPatientMode("existing")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      patientMode === "existing"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Search Existing Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientMode("new")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      patientMode === "new"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    + Register New Patient
                  </button>
                </div>

                {patientMode === "existing" ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search patient by full name, phone number, or patient code (TG-P-XXXX)..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#087F56]"
                      />
                      {isSearchingPatient && (
                        <Loader2 className="w-4 h-4 animate-spin text-[#087F56] absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    {/* Patient Search Results */}
                    {patientResults.length > 0 && (
                      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white overflow-hidden shadow-xs">
                        {patientResults.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientResults([]);
                              setPatientSearch("");
                            }}
                            className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{p.fullName}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                                  {p.patientCode}
                                </span>
                              </div>
                              <p className="text-slate-500 text-[11px] mt-0.5">
                                {p.phone} {p.email ? `• ${p.email}` : ""}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#087F56]">Select</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Patient Banner */}
                    {selectedPatient && (
                      <div className="p-4 bg-emerald-50/60 border border-[#087F56]/20 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#087F56] text-white flex items-center justify-center font-bold">
                            {selectedPatient.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{selectedPatient.fullName}</span>
                              <span className="text-[10px] bg-white border border-emerald-200 text-[#087F56] px-2 py-0.5 rounded-full font-mono font-bold">
                                {selectedPatient.patientCode}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              {selectedPatient.phone} {selectedPatient.email ? `• ${selectedPatient.email}` : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(null)}
                          className="text-xs font-bold text-red-600 hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* New Patient Registration Fields */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Patient Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Kritika Sharma"
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Mobile Number (10 digits) *</label>
                      <input
                        type="tel"
                        placeholder="+91 9876543210"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="patient@example.com"
                        value={newPatientEmail}
                        onChange={(e) => setNewPatientEmail(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Gender</label>
                        <select
                          value={newPatientGender}
                          onChange={(e) => setNewPatientGender(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Age</label>
                        <input
                          type="number"
                          value={newPatientAge}
                          onChange={(e) => setNewPatientAge(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: SERVICE & PACKAGE SELECTION                           */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-in fade-in text-xs">
                {/* Protocol Type Selector */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        setItemType("package");
                        setSelectedService(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg ${
                        itemType === "package"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Comprehensive Packages
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItemType("service");
                        setSelectedPackage(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg ${
                        itemType === "service"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Single Services &amp; Consultations
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Department:</span>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                    >
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d === "all" ? "All Departments" : d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Consultation Mode */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Consultation Delivery Mode</label>
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-[#087F56] font-semibold flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Online Video Consultation (Google Meet / Zoom)
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold">
                      100% Online Only
                    </span>
                  </div>
                </div>

                {/* Catalogue Grid */}
                <div className="border border-slate-200 rounded-2xl max-h-56 overflow-y-auto p-2 divide-y divide-slate-100">
                  {isLoadingCatalogue ? (
                    <div className="p-8 text-center text-slate-400">Loading catalogue...</div>
                  ) : itemType === "package" ? (
                    filteredPackages.map((pkg) => (
                      <div
                        key={pkg._id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                          selectedPackage?._id === pkg._id
                            ? "bg-emerald-50 border border-[#087F56]/30 font-bold"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{pkg.name}</div>
                          <p className="text-slate-500 text-[11px] line-clamp-1">{pkg.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full">{pkg.totalSessions} Sessions</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full">{pkg.validityDays} Days Validity</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#087F56]">
                            ₹{Number(pkg.pricePaise / 100).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    filteredServices.map((srv) => (
                      <div
                        key={srv._id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                          selectedService?._id === srv._id
                            ? "bg-emerald-50 border border-[#087F56]/30 font-bold"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{srv.name}</div>
                          <p className="text-slate-500 text-[11px] line-clamp-1">{srv.description}</p>
                          <span className="bg-slate-100 text-[10px] px-2 py-0.5 rounded-full text-slate-600 mt-1 inline-block">
                            {srv.durationMinutes || 30} mins
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#087F56]">
                            ₹{Number(srv.baseFee).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: PRICING & DISCOUNTS                                    */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-in fade-in text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Base Price Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-slate-500 text-[11px]">Authoritative Base Fee</span>
                    <p className="font-bold text-lg text-slate-900 mt-0.5">
                      ₹{baseUnitPrice.toLocaleString("en-IN")}
                    </p>
                    <span className="text-[10px] text-slate-400">Direct from MongoDB catalogue</span>
                  </div>

                  {/* Quantity */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-slate-500 text-[11px]">Quantity</span>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold flex items-center justify-center hover:bg-slate-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-12 text-center font-bold bg-white border border-slate-200 rounded-lg p-1"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold flex items-center justify-center hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-slate-500 text-[11px]">Calculated Subtotal</span>
                    <p className="font-bold text-lg text-[#087F56] mt-0.5">
                      ₹{subtotal.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Discount & Reason Configuration */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Authorized Discount Adjustment</span>
                    <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[11px]">
                      <button
                        type="button"
                        onClick={() => setDiscountType("fixed")}
                        className={`px-2 py-0.5 rounded ${
                          discountType === "fixed" ? "bg-white font-bold text-slate-900" : "text-slate-600"
                        }`}
                      >
                        Fixed (₹)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("percent")}
                        className={`px-2 py-0.5 rounded ${
                          discountType === "percent" ? "bg-white font-bold text-slate-900" : "text-slate-600"
                        }`}
                      >
                        Percent (%)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Discount Value ({discountType === "fixed" ? "₹" : "%"})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Discount Reason * (Mandatory for Audit Trail)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Seasonal Promotional Campaign / Referral"
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {isHighDiscount && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Notice: Discount exceeds 20% (₹{calculatedDiscount}). Requires Administrator role permissions.
                      </span>
                    </div>
                  )}
                </div>

                {/* Tax Configuration & Additional Charges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tax / GST Configuration</label>
                    <select
                      value={taxBracket}
                      onChange={(e) => setTaxBracket(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value={0}>Healthcare Consultations (0% GST Exempt)</option>
                      <option value={12}>Diagnostic Protocols (12% GST)</option>
                      <option value={18}>Standard Clinical Services (18% GST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Additional Charges (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Final Total Summary */}
                <div className="p-4 bg-emerald-50/70 border border-[#087F56]/30 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-slate-600 text-[11px] block">Final Verified Payable Amount</span>
                    <span className="text-xs text-slate-500">
                      Subtotal ₹{subtotal} - Discount ₹{calculatedDiscount} + Tax ₹{calculatedTax} + Extra ₹{additionalCharges}
                    </span>
                  </div>
                  <span className="text-2xl font-serif font-bold text-[#087F56]">
                    ₹{finalPayable.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 4: SETTINGS & DISPATCH                                    */}
            {/* ------------------------------------------------------------- */}
            {activeStep === 4 && (
              <div className="space-y-4 animate-in fade-in text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Payment Link Expiry</label>
                    <select
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value={1}>24 Hours</option>
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days (Recommended)</option>
                      <option value={14}>14 Days</option>
                      <option value={30}>30 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Payment Description</label>
                    <input
                      type="text"
                      placeholder="e.g. PCOD 3-Month Care Regimen Settlement"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Internal Clinical / Sales Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Confidential notes for team audit trail..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Instant Notification Checkboxes */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="font-bold text-slate-800 block mb-1">Automatic Notification Channels</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendWhatsAppImmediate}
                      onChange={(e) => setSendWhatsAppImmediate(e.target.checked)}
                      className="rounded text-[#087F56]"
                    />
                    <span className="text-slate-700">
                      Send official WhatsApp booking message upon link generation (Meta Cloud API)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailImmediate}
                      onChange={(e) => setSendEmailImmediate(e.target.checked)}
                      className="rounded text-[#087F56]"
                    />
                    <span className="text-slate-700">
                      Send branded HTML email with invoice breakdown and payment CTA
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        {!createdResult && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeStep > 1) setActiveStep((s) => (s - 1) as any);
                else onClose();
              }}
              className="px-4 py-2 border border-slate-200 hover:bg-white rounded-xl text-xs font-semibold text-slate-600"
            >
              {activeStep === 1 ? "Cancel" : "Back"}
            </button>

            <div className="flex items-center gap-2">
              {activeStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => (s + 1) as any)}
                  className="px-5 py-2 bg-[#087F56] hover:bg-[#075D42] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreatePaymentLink}
                  disabled={isSubmitting || finalPayable <= 0}
                  className="px-6 py-2 bg-gradient-to-r from-[#087F56] to-[#064E3B] hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Razorpay Order &amp; Link...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Generate Payment Link (₹{finalPayable.toLocaleString("en-IN")})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

