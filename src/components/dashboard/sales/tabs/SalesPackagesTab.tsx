"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Sparkles,
  Tag,
  Clock,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface HealthcarePackage {
  _id: string;
  name: string;
  slug: string;
  description: string;
  pricePaise: number;
  totalSessions: number;
  validityDays: number;
  consultationMode: string;
  features: string[];
  isPublished: boolean;
}

interface ClinicalService {
  code: string;
  name: string;
  department: string;
  durationMinutes: number;
  baseFee: number;
  consultationType: string;
  description: string;
}

interface LeadSummary {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  status: string;
  serviceInterest: string;
}

interface SalesPackagesTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
}

export function SalesPackagesTab({ showNotification }: SalesPackagesTabProps) {
  const [packages, setPackages] = useState<HealthcarePackage[]>([]);
  const [services, setServices] = useState<ClinicalService[]>([]);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Assisted checkout state
  const [itemType, setItemType] = useState<"package" | "service">("package");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("TG-SRV-HOM");
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [createdOrderDetails, setCreatedOrderDetails] = useState<{
    orderNumber: string;
    invoiceNumber?: string;
    totalAmount: number;
    checkoutUrl: string;
    paymentLink: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pkgRes, srvRes, leadRes] = await Promise.allSettled([
        api.get<{ packages: HealthcarePackage[] }>("/packages"),
        api.get<{ services: ClinicalService[] }>("/services"),
        api.get<{ leads: LeadSummary[] }>("/crm/leads?limit=50"),
      ]);

      if (pkgRes.status === "fulfilled" && pkgRes.value.data?.packages) {
        setPackages(pkgRes.value.data.packages);
        if (pkgRes.value.data.packages.length > 0 && !selectedPackageId) {
          setSelectedPackageId(pkgRes.value.data.packages[0]._id);
        }
      }

      if (srvRes.status === "fulfilled" && srvRes.value.data?.services) {
        setServices(srvRes.value.data.services);
        if (srvRes.value.data.services.length > 0) {
          setSelectedServiceCode(srvRes.value.data.services[0].code);
        }
      }

      if (leadRes.status === "fulfilled" && leadRes.value.data?.leads) {
        setLeads(leadRes.value.data.leads);
      }
    } catch {
      showNotification("Failed to load healthcare catalogue", true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPackageId, showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateCheckoutLink = async () => {
    const selectedPkg = packages.find((p) => p._id === selectedPackageId);
    const selectedSrv = services.find((s) => s.code === selectedServiceCode);
    const selectedLead = leads.find((l) => l._id === selectedLeadId);

    if (itemType === "package" && !selectedPkg) {
      showNotification("Please select a valid healthcare package", true);
      return;
    }
    if (itemType === "service" && !selectedSrv) {
      showNotification("Please select a valid clinical service", true);
      return;
    }

    setIsGenerating(true);
    try {
      // Build payload for /billing/payment-links — authoritative server-side pricing
      const payload: any = {
        expiryDays: 7,
        sendViaWhatsApp: false,
        sendViaEmail: false,
      };

      // Patient resolution: prefer linked CRM lead patient, else use lead contact info
      if (selectedLead) {
        payload.leadId = selectedLead._id;
        // Pass lead details so server can register patient if not already linked
        payload.newPatient = {
          fullName: selectedLead.fullName,
          phone: selectedLead.phone,
          email: selectedLead.email || "",
        };
      }

      // Discount (server enforces role-based caps)
      if (Number(customDiscount) > 0) {
        payload.discount = { type: "fixed", value: Number(customDiscount) };
        payload.discountReason = "Sales team promotional discount";
      }

      // Item selection
      if (itemType === "package" && selectedPkg) {
        payload.packageId = selectedPkg._id;
      } else if (itemType === "service" && selectedSrv) {
        payload.serviceCode = selectedSrv.code;
      }

      const res = await api.post<any>("/billing/payment-links", payload);

      if (res.success && res.data?.paymentLink) {
        const link = res.data.paymentLink;
        const order = res.data.order;
        const inv = res.data.invoice;
        const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        const primaryLink = res.data.checkoutUrl || link.shortUrl || `${origin}/checkout/pay/${order?.checkoutToken}`;

        setGeneratedLink(primaryLink);
        setCreatedOrderDetails({
          orderNumber: order?.orderNumber || link.paymentLinkId,
          invoiceNumber: inv?.invoiceNumber,
          totalAmount: link.amount,
          checkoutUrl: res.data.checkoutUrl || `${origin}/checkout/pay/${order?.checkoutToken}`,
          paymentLink: link.shortUrl || primaryLink,
        });

        if (selectedLeadId) {
          api.post(`/crm/leads/${selectedLeadId}/activities`, {
            action: "PAYMENT_LINK_CREATED",
            details: `Generated Razorpay Payment Link ${link.paymentLinkId} — Amount: ₹${link.amount?.toLocaleString("en-IN")}`,
          }).catch(() => {});
        }

        showNotification(`Payment Link ${link.paymentLinkId} created! Link ready to share.`);
      } else {
        throw new Error(res.message || "Failed to create payment link");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating payment link";
      showNotification(msg, true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    showNotification("Checkout link copied to clipboard");
  };

  const handleShareWhatsApp = () => {
    if (!generatedLink) return;
    const pkg = packages.find((p) => p._id === selectedPackageId);
    const srv = services.find((s) => s.code === selectedServiceCode);
    const lead = leads.find((l) => l._id === selectedLeadId);

    const leadName = lead ? lead.fullName : "Valued Patient";
    const itemName = itemType === "package" ? (pkg ? pkg.name : "Healthcare Package") : (srv ? srv.name : "Clinical Consultation");
    const docNum = createdOrderDetails?.orderNumber || "Bill";
    const amountStr = createdOrderDetails?.totalAmount !== undefined ? `₹${createdOrderDetails.totalAmount.toLocaleString("en-IN")}` : "";

    const text = `Hello ${leadName},\n\nThank you for choosing TriGyna Health & Wellness.\nHere is your official booking and payment link for *${itemName}* (${docNum}${amountStr ? ` — ${amountStr}` : ""}):\n${generatedLink}\n\nYou can review your itemized details and pay securely via UPI, QR, Card, or NetBanking. Our certified clinical team looks forward to supporting you!`;

    const clean = lead?.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#0C2925] to-[#123E37] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#86EFAC] text-xs font-semibold uppercase tracking-wider mb-3 border border-white/10">
            <Tag className="w-3.5 h-3.5" />
            <span>Assisted Sales Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-2">
            Healthcare Packages &amp; Assisted Checkout
          </h2>
          <p className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed">
            Select a tailored women&apos;s healthcare package, apply authorized promotional adjustments, and instantly generate a secure Razorpay checkout link or WhatsApp message for your prospective lead.
          </p>
        </div>
      </div>

      {/* 1-Click Generator */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#16A34A]" />
            <span>1-Click Razorpay Order &amp; Payment Link Generator</span>
          </h3>

          {/* Toggle between Package and Service */}
          <div className="inline-flex p-1 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1]">
            <button
              type="button"
              onClick={() => {
                setItemType("package");
                setGeneratedLink(null);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                itemType === "package"
                  ? "bg-white text-[#16A34A] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Healthcare Package
            </button>
            <button
              type="button"
              onClick={() => {
                setItemType("service");
                setGeneratedLink(null);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                itemType === "service"
                  ? "bg-white text-[#16A34A] shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Clinical Service
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wider">
              Select Target Lead
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => {
                setSelectedLeadId(e.target.value);
                setGeneratedLink(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            >
              <option value="">-- Generic Prospective Patient --</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.fullName} ({l.phone}) - {l.serviceInterest || "General"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wider">
              {itemType === "package" ? "Choose Healthcare Package" : "Choose Clinical Service"}
            </label>
            {itemType === "package" ? (
              <select
                value={selectedPackageId}
                onChange={(e) => {
                  setSelectedPackageId(e.target.value);
                  setGeneratedLink(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              >
                {packages.map((pkg) => (
                  <option key={pkg._id} value={pkg._id}>
                    {pkg.name} — ₹{(pkg.pricePaise / 100).toLocaleString("en-IN")} ({pkg.totalSessions} Sessions)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedServiceCode}
                onChange={(e) => {
                  setSelectedServiceCode(e.target.value);
                  setGeneratedLink(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              >
                {services.map((srv) => (
                  <option key={srv.code} value={srv.code}>
                    {srv.name} — ₹{srv.baseFee.toLocaleString("en-IN")} ({srv.durationMinutes} mins)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 uppercase tracking-wider">
              Promotional Discount (₹ INR)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={customDiscount}
              onChange={(e) => {
                setCustomDiscount(Number(e.target.value) || 0);
                setGeneratedLink(null);
              }}
              placeholder="e.g. 200"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateCheckoutLink}
          disabled={isGenerating || (itemType === "package" ? packages.length === 0 : services.length === 0)}
          className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
          <span>{isGenerating ? "Creating Order & Razorpay Link..." : "Generate Official Razorpay Payment Link"}</span>
        </button>

        {generatedLink && (
          <div className="mt-6 p-4 sm:p-5 bg-[#EDF8F1] border border-[#16A34A]/20 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#15803D] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span>Live Razorpay Payment Link Ready</span>
              </span>
              <div className="flex items-center gap-2">
                {createdOrderDetails?.orderNumber && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[#0F172A]">
                    {createdOrderDetails.orderNumber}
                  </span>
                )}
                {createdOrderDetails?.totalAmount !== undefined && (
                  <span className="text-[11px] font-bold text-[#16A34A]">
                    ₹{createdOrderDetails.totalAmount.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-[#CBD5E1]">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="w-full text-xs text-[#0F172A] bg-transparent focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-gray-100 text-[#16A34A] rounded-lg text-xs font-semibold border border-[#CBD5E1] shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20BE5A] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send to Lead on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => window.open(generatedLink, "_blank")}
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-[#0F172A] text-xs font-semibold border border-[#CBD5E1] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Checkout Flow</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Published Packages Catalog */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#0F172A]">Published Healthcare Packages ({packages.length})</h3>

        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-7 h-7 text-[#16A34A] animate-spin mb-2" />
            <p className="text-xs text-gray-500">Loading catalog from MongoDB...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-3xl border border-gray-200">
            No packages currently published in catalog.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg._id}
                className="bg-white border border-[#E2E8F0] rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
                      {pkg.totalSessions} {pkg.totalSessions === 1 ? "Session" : "Sessions"}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{pkg.validityDays}d Validity</span>
                    </span>
                  </div>

                  <h4 className="font-bold text-[#0F172A] text-base mb-1.5">{pkg.name}</h4>
                  <p className="text-xs text-[#64748B] line-clamp-2 mb-4 leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="text-2xl font-bold text-[#16A34A] mb-4">
                    ₹{(pkg.pricePaise / 100).toLocaleString("en-IN")}
                    <span className="text-xs font-normal text-gray-400 ml-1">incl. taxes</span>
                  </div>

                  {pkg.features && pkg.features.length > 0 && (
                    <div className="space-y-1.5 mb-5 border-t border-gray-100 pt-3">
                      {pkg.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-gray-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackageId(pkg._id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    showNotification(`Selected ${pkg.name} for assisted checkout`);
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Select for Checkout
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

