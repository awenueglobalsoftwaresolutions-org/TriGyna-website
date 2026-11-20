"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Phone,
  PhoneCall,
  Mail,
  MessageSquare,
  Calendar,
  UserCheck,
  Tag,
  Clock,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Send,
  Plus,
  Trash2,
  Receipt,
  FileText,
  IndianRupee,
  Eye,
  Download,
  Share2,
  Printer,
  CreditCard,
  History,
  UserCog,
  GitBranch,
} from "lucide-react";
import { api, getBaseUrl, getToken } from "@/lib/api/client";
import { A4InvoiceDocument } from "@/components/billing/A4InvoiceDocument";

export interface SalesLead {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  serviceInterest: string;
  consultationMode?: string;
  status: string;
  column?: string;
  source: string;
  priority?: string;
  score?: number;
  initials?: string;
  relativeTime?: string;
  followUpDate?: string;
  assignedTo?: { _id: string; name: string; email?: string; phone?: string };
  notes?: Array<{ _id?: string; body: string; createdAt?: string }>;
  tasks?: Array<{ _id?: string; title: string; dueDate?: string; priority?: string; status?: string }>;
  activities?: Array<{
    _id?: string;
    action: string;
    details?: string;
    timestamp?: string;
    createdAt?: string;
    performedBy?: { name?: string };
    user?: { name?: string };
  }>;
  createdAt?: string;
}

interface HealthcarePackage {
  _id: string;
  name: string;
  slug: string;
  pricePaise: number;
  totalSessions: number;
  validityDays: number;
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

interface SalesLeadDrawerProps {
  lead: SalesLead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: () => void;
  showNotification: (msg: string, isError?: boolean) => void;
}

export function SalesLeadDrawer({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  showNotification,
}: SalesLeadDrawerProps) {
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "notes" | "tasks" | "checkout" | "billing">("details");
  const [currentStatus, setCurrentStatus] = useState<string>(lead?.status || "new");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Activities & Interaction Timeline state
  const [activitiesList, setActivitiesList] = useState<Array<{
    _id?: string;
    action: string;
    details?: string;
    performedBy?: { name?: string };
    createdAt: string;
  }>>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Log Call Modal state
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [callOutcome, setCallOutcome] = useState("Connected - Interested in Treatment");
  const [callNotes, setCallNotes] = useState("");
  const [callNextAction, setCallNextAction] = useState("");
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  // Mark Lost Modal state
  const [isMarkLostModalOpen, setIsMarkLostModalOpen] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState("No response after defined attempts");
  const [otherLostReason, setOtherLostReason] = useState("");
  const [isSubmittingLost, setIsSubmittingLost] = useState(false);

  // Sales Roster & Owner Assignment state
  const [salesTeam, setSalesTeam] = useState<Array<{ _id: string; name: string; email?: string }>>([]);
  const [isAssigningOwner, setIsAssigningOwner] = useState(false);

  // Notes state
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notesList, setNotesList] = useState<Array<{ _id?: string; body: string; createdAt?: string }>>([]);

  // Tasks state
  const [tasksList, setTasksList] = useState<Array<{ _id?: string; title: string; dueDate?: string; priority?: string; status?: string }>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Assisted checkout state
  const [itemType, setItemType] = useState<"package" | "service">("package");
  const [packages, setPackages] = useState<HealthcarePackage[]>([]);
  const [services, setServices] = useState<ClinicalService[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("TG-SRV-HOM");
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isGeneratingCheckout, setIsGeneratingCheckout] = useState(false);
  const [createdOrderDetails, setCreatedOrderDetails] = useState<{
    orderNumber: string;
    invoiceNumber?: string;
    totalAmount: number;
    checkoutUrl: string;
  } | null>(null);

  // Billing ledger state
  const [billingData, setBillingData] = useState<{
    hasPatient: boolean;
    patient?: { _id: string; patientCode: string; fullName: string; phone?: string; email?: string };
    summary: { totalBilled: number; totalCollected: number; outstandingBalance: number; unpaidCount: number };
    orders?: any[];
    invoices: any[];
    payments: any[];
    receipts: any[];
  } | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);

  // Offline Payment recording state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [offlinePaymentAmount, setOfflinePaymentAmount] = useState<number>(0);
  const [offlinePaymentMethod, setOfflinePaymentMethod] = useState<string>("upi");
  const [offlinePaymentRef, setOfflinePaymentRef] = useState<string>("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  useEffect(() => {
    if (lead) {
      setCurrentStatus(lead.status || "new");
      setNotesList(lead.notes || []);
      setTasksList(lead.tasks || []);
      setCheckoutLink(null);
    }
  }, [lead]);

  // Load packages and services catalog for assisted checkout
  useEffect(() => {
    if (isOpen) {
      Promise.allSettled([
        api.get<{ packages: HealthcarePackage[] }>("/packages"),
        api.get<{ services: ClinicalService[] }>("/services"),
      ]).then(([pkgRes, srvRes]) => {
        if (pkgRes.status === "fulfilled" && pkgRes.value.data?.packages) {
          setPackages(pkgRes.value.data.packages);
          if (pkgRes.value.data.packages.length > 0 && !selectedPkgId) {
            setSelectedPkgId(pkgRes.value.data.packages[0]._id);
          }
        }
        if (srvRes.status === "fulfilled" && srvRes.value.data?.services) {
          setServices(srvRes.value.data.services);
          if (srvRes.value.data.services.length > 0) {
            setSelectedServiceCode(srvRes.value.data.services[0].code);
          }
        }
      });
    }
  }, [isOpen, selectedPkgId]);

  // Fetch Lead Billing Ledger
  const leadId = lead?._id;
  const fetchLeadBilling = useCallback(async () => {
    if (!leadId) return;
    try {
      setIsLoadingBilling(true);
      const res = await api.get<any>(`/crm/leads/${leadId}/billing`);
      if (res.data) {
        setBillingData(res.data);
      }
    } catch (err: unknown) {
      console.warn("[SalesLeadDrawer] Could not load lead billing ledger:", err);
      setBillingData(null);
    } finally {
      setIsLoadingBilling(false);
    }
  }, [leadId]);

  // Fetch Activities Timeline
  const fetchLeadActivities = useCallback(async () => {
    if (!leadId) return;
    try {
      setIsLoadingActivities(true);
      const res = await api.get<{ activities: any[] }>(`/crm/leads/${leadId}/activities`);
      if (res.data?.activities) {
        setActivitiesList(res.data.activities);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingActivities(false);
    }
  }, [leadId]);

  // Fetch Sales Team for Reassignment
  const fetchSalesTeam = useCallback(async () => {
    try {
      const res = await api.get<{ team: any[] }>("/crm/team");
      if (res.data?.team) {
        setSalesTeam(res.data.team);
      }
    } catch {
      // Silent fallback
    }
  }, []);

  useEffect(() => {
    if (isOpen && leadId) {
      if (activeTab === "billing") {
        fetchLeadBilling();
      } else if (activeTab === "timeline") {
        fetchLeadActivities();
      }
      fetchSalesTeam();
    }
  }, [isOpen, leadId, activeTab, fetchLeadBilling, fetchLeadActivities, fetchSalesTeam]);

  // Log Call Handler
  const handleLogCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;
    try {
      setIsLoggingCall(true);
      const details = `Outcome: ${callOutcome}${callNotes ? ` | Notes: ${callNotes}` : ""}${callNextAction ? ` | Next: ${callNextAction}` : ""}`;
      await api.post(`/crm/leads/${leadId}/activities`, {
        action: "CALL_LOGGED",
        details,
      });

      // Auto-advance stage if was 'new' and call was connected
      if (currentStatus === "new" && callOutcome.startsWith("Connected")) {
        await api.patch(`/crm/leads/${leadId}/stage`, { status: "contacted" });
        setCurrentStatus("contacted");
      }

      showNotification(`Call logged: ${callOutcome}`);
      setIsLogCallModalOpen(false);
      setCallNotes("");
      setCallNextAction("");
      fetchLeadActivities();
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log call activity";
      showNotification(msg, true);
    } finally {
      setIsLoggingCall(false);
    }
  };

  // Mark Lost Handler
  const handleMarkLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;
    const finalReason = selectedLostReason === "Other" ? otherLostReason.trim() : selectedLostReason;
    if (!finalReason) {
      showNotification("Please specify a reason for marking lead as lost", true);
      return;
    }

    try {
      setIsSubmittingLost(true);
      await api.post(`/crm/leads/${leadId}/mark-lost`, {
        lostReason: finalReason,
      });
      setCurrentStatus("lost");
      showNotification(`Lead marked as lost (${finalReason})`);
      setIsMarkLostModalOpen(false);
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark lead as lost";
      showNotification(msg, true);
    } finally {
      setIsSubmittingLost(false);
    }
  };

  // Assign Owner Handler
  const handleAssignOwner = async (newOwnerId: string) => {
    if (!leadId) return;
    try {
      setIsAssigningOwner(true);
      await api.post(`/crm/leads/${leadId}/assign`, {
        assignedTo: newOwnerId || null,
      });
      showNotification("Assigned executive updated successfully");
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign lead owner";
      showNotification(msg, true);
    } finally {
      setIsAssigningOwner(false);
    }
  };

  const handleDownloadInvoicePdf = (invId: string) => {
    const token = getToken() || "";
    const baseUrl = getBaseUrl();
    window.open(`${baseUrl}/invoices/${invId}/pdf?token=${encodeURIComponent(token)}`, "_blank");
    showNotification("Downloading official invoice PDF...");
  };

  const handleDownloadReceiptPdf = (invId: string) => {
    const token = getToken() || "";
    const baseUrl = getBaseUrl();
    window.open(`${baseUrl}/invoices/${invId}/receipt/pdf?token=${encodeURIComponent(token)}`, "_blank");
    showNotification("Downloading official receipt PDF...");
  };

  const formatInvoiceData = (inv: any) => {
    return {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber || `INV-${new Date().getFullYear()}-0000`,
      issueDate: inv.issueDate || inv.createdAt || new Date(),
      dueDate: inv.dueDate,
      patientName: inv.patientId?.fullName || lead?.fullName || "Prospective Patient",
      patientCode: inv.patientId?.patientCode || `LEAD-${(lead?._id || "").slice(-6).toUpperCase()}`,
      patientPhone: inv.patientId?.phone || lead?.phone || "—",
      patientEmail: inv.patientId?.email || lead?.email,
      patientAddress: inv.patientId?.address || "TriGyna Care Consultation",
      doctorName: inv.doctorId?.userId?.name || inv.doctorId?.name || "Dr. Harshali Sutar",
      doctorQualifications: inv.doctorId?.qualifications || "MBBS, DGO",
      doctorSpecialization: inv.doctorId?.specialization || "Obstetrics & Gynaecology",
      serviceName: inv.appointmentId?.serviceName || inv.items?.[0]?.description || lead?.serviceInterest || "Healthcare Consultation",
      appointmentCode: inv.appointmentId?.appointmentCode,
      appointmentDateTime: inv.appointmentId?.appointmentDate,
      appointmentMode: inv.appointmentId?.mode || inv.appointmentId?.consultationMode || "Online",
      items: (inv.items && inv.items.length > 0)
        ? inv.items.map((it: any) => ({
            description: it.description || "Healthcare Package",
            details: it.details || "",
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice !== undefined ? it.unitPrice : (it.amount || 0),
            amount: it.amount || 0,
            taxRate: it.taxRate || 0,
            taxAmount: it.taxAmount || 0,
          }))
        : [{
            description: inv.serviceName || lead?.serviceInterest || "Clinical Care Consultation",
            quantity: 1,
            unitPrice: inv.totalAmount || 0,
            amount: inv.totalAmount || 0,
          }],
      subtotal: inv.subtotal || inv.totalAmount || 0,
      discountAmount: inv.discountAmount || 0,
      taxRate: inv.taxRate || 0,
      taxAmount: inv.taxAmount || 0,
      totalAmount: inv.totalAmount || 0,
      paidAmount: inv.paidAmount || 0,
      balanceAmount: inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)),
      status: inv.status || "pending",
      paymentMethod: inv.paymentMethod || "UPI",
      paidAt: inv.paidAt,
    };
  };

  const handleSharePaymentWhatsApp = (invoiceOrOrder: any) => {
    if (!lead) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    
    // Check if order has checkoutToken
    let payLink = "";
    if (invoiceOrOrder.checkoutToken) {
      payLink = `${origin}/checkout/${invoiceOrOrder.checkoutToken}`;
    } else {
      payLink = `${origin}/patient/payments?invoiceId=${invoiceOrOrder._id}`;
    }

    const clean = (lead.phone || "").replace(/[^0-9]/g, "");
    const bal = invoiceOrOrder.balanceAmount !== undefined
      ? invoiceOrOrder.balanceAmount
      : (invoiceOrOrder.balanceDue !== undefined ? invoiceOrOrder.balanceDue : (invoiceOrOrder.totalAmount || 0));
    const docNum = invoiceOrOrder.invoiceNumber || invoiceOrOrder.orderNumber || "Bill";

    const text = `Hello ${lead.fullName},\n\nThank you for speaking with TriGyna Health & Wellness.\nHere is your official bill (${docNum}) for ₹${bal.toLocaleString("en-IN")}:\n${payLink}\n\nYou can review your itemized charges and complete secure payment directly online.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, "_blank");
    showNotification("WhatsApp payment link initiated");
  };

  const handleRecordOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    try {
      setIsRecordingPayment(true);
      const res = await api.post<any>(`/invoices/${paymentModalInvoice._id}/payments`, {
        amount: Number(offlinePaymentAmount) || paymentModalInvoice.balanceAmount || paymentModalInvoice.totalAmount,
        paymentMethod: offlinePaymentMethod,
        transactionRef: offlinePaymentRef.trim() || `OFFLINE_${Date.now()}`,
        notes: `Offline payment recorded by Sales Executive for Lead ${lead?.fullName || "Patient"}`,
      });

      showNotification(`Payment of ₹${offlinePaymentAmount} recorded! Receipt ${res.data?.receipt?.receiptNumber || ""} generated.`);
      setPaymentModalInvoice(null);
      setOfflinePaymentRef("");
      fetchLeadBilling();
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record payment";
      showNotification(msg, true);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  if (!isOpen || !lead) return null;

  // Handle stage change
  const handleStageChange = async (newStage: string) => {
    try {
      setIsUpdatingStatus(true);
      await api.patch(`/crm/leads/${lead._id}/stage`, { status: newStage });
      setCurrentStatus(newStage);
      showNotification(`Stage updated to ${newStage.toUpperCase().replace(/_/g, " ")}`);
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update lead stage";
      showNotification(msg, true);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle adding note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setIsAddingNote(true);
      await api.post(`/crm/leads/${lead._id}/notes`, { body: newNote.trim() });
      setNotesList((prev) => [{ body: newNote.trim(), createdAt: new Date().toISOString() }, ...prev]);
      setNewNote("");
      showNotification("Clinical sales note added");
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add note";
      showNotification(msg, true);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle adding follow-up task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDue) {
      showNotification("Task title and scheduled due time are required", true);
      return;
    }

    try {
      setIsAddingTask(true);
      await api.post(`/crm/leads/${lead._id}/tasks`, {
        title: newTaskTitle.trim(),
        dueDate: new Date(newTaskDue).toISOString(),
        priority: newTaskPriority,
      });
      setTasksList((prev) => [
        {
          title: newTaskTitle.trim(),
          dueDate: newTaskDue,
          priority: newTaskPriority,
          status: "open",
        },
        ...prev,
      ]);
      setNewTaskTitle("");
      setNewTaskDue("");
      showNotification("Follow-up task scheduled successfully");
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to schedule task";
      showNotification(msg, true);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Handle generate assisted checkout link & server-side order
  const handleGenerateCheckout = async () => {
    if (!lead) return;
    const pkg = packages.find((p) => p._id === selectedPkgId);
    const srv = services.find((s) => s.code === selectedServiceCode);

    if (itemType === "package" && !pkg) {
      showNotification("Please select a healthcare package", true);
      return;
    }
    if (itemType === "service" && !srv) {
      showNotification("Please select a clinical service", true);
      return;
    }

    try {
      setIsGeneratingCheckout(true);
      const payload: any = {
        leadId: lead._id,
        discountAmount: Number(customDiscount) || 0,
        paymentMethod: "upi",
      };

      if (itemType === "package" && pkg) {
        payload.packageId = pkg._id;
      } else if (itemType === "service" && srv) {
        payload.serviceCode = srv.code;
        payload.serviceName = srv.name;
      }

      const res = await api.post<any>("/orders", payload);

      if (res.data?.order) {
        const order = res.data.order;
        const inv = res.data.invoice;
        const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        const primaryLink = res.data.paymentLink || res.data.checkoutUrl || `${origin}/checkout/${order.checkoutToken}`;
        setCheckoutLink(primaryLink);
        setCreatedOrderDetails({
          orderNumber: order.orderNumber,
          invoiceNumber: inv?.invoiceNumber || res.data.invoiceNumber,
          totalAmount: order.totalAmount,
          checkoutUrl: primaryLink,
        });

        setCurrentStatus("awaiting_payment");
        showNotification(`Order ${order.orderNumber} created! Razorpay payment link generated.`);
        fetchLeadBilling();
        onLeadUpdated();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate order & checkout";
      showNotification(msg, true);
    } finally {
      setIsGeneratingCheckout(false);
    }
  };

  const handleCopyLink = () => {
    if (!checkoutLink) return;
    navigator.clipboard.writeText(checkoutLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    showNotification("Checkout link copied to clipboard");
  };

  const handleShareWhatsApp = () => {
    if (!checkoutLink || !lead) return;
    const pkg = packages.find((p) => p._id === selectedPkgId);
    const srv = services.find((s) => s.code === selectedServiceCode);
    const itemName = itemType === "package" ? (pkg ? pkg.name : "Healthcare Package") : (srv ? srv.name : "Clinical Consultation");
    const docNum = createdOrderDetails?.orderNumber || "Bill";
    const amountStr = createdOrderDetails?.totalAmount !== undefined ? `₹${createdOrderDetails.totalAmount.toLocaleString("en-IN")}` : "";

    const text = `Hello ${lead.fullName},\n\nThank you for speaking with TriGyna Health & Wellness.\nHere is your official booking and payment link for *${itemName}* (${docNum}${amountStr ? ` — ${amountStr}` : ""}):\n${checkoutLink}\n\nYou can review your itemized charges and pay directly online via Razorpay (UPI, QR, Card, or NetBanking). Our certified clinical team looks forward to supporting your care!`;
    const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Handle convert to patient
  const handleConvertToPatient = async () => {
    if (!confirm(`Are you sure you want to convert ${lead.fullName} into an official registered patient?`)) return;

    try {
      setIsConverting(true);
      await api.post(`/crm/leads/${lead._id}/convert`, {});
      setCurrentStatus("converted");
      showNotification(`🎉 ${lead.fullName} successfully converted to official patient!`);
      onLeadUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to convert lead to patient";
      showNotification(msg, true);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in font-sans">
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-left border-l border-[#E2E8F0] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] font-sans">
          <div className="flex items-start justify-between min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <div className="w-12 h-12 rounded-2xl bg-[#0C2925] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                {lead.initials || lead.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-base sm:text-lg font-bold text-[#0F172A] truncate leading-tight">{lead.fullName}</h3>
                <p className="font-sans text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5 min-w-0">
                  <span className="truncate">{lead.serviceInterest}</span>
                  <span className="shrink-0">•</span>
                  <span className="shrink-0">{lead.relativeTime || "Active"}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Communication Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#E2E8F0]/80">
            <button
              type="button"
              onClick={() => setIsLogCallModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-[#0C2925] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#154734] transition-colors shadow-xs cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#86EFAC]" />
              <span>Log Call</span>
            </button>
            <a
              href={`tel:${lead.phone}`}
              className="flex-1 py-2 px-3 rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>{lead.phone}</span>
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="py-2 px-3 rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors shadow-xs"
              >
                <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Email</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                const clean = (lead.phone || "").replace(/[^0-9]/g, "");
                window.open(`https://wa.me/${clean}`, "_blank");
              }}
              className="py-2 px-3 rounded-xl bg-[#25D366] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#20BE5A] transition-colors shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          {/* Pipeline Stage Selector Pill */}
          <div className="mt-4 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-[#CBD5E1] shadow-xs">
            <span className="text-xs font-semibold text-[#64748B]">Pipeline Stage:</span>
            <div className="flex items-center gap-2">
              <select
                value={currentStatus}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={isUpdatingStatus}
                className="text-xs font-bold bg-[#F1F5F9] text-[#0F172A] px-3 py-1.5 rounded-xl border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
              >
                <option value="new">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="qualified">Qualified</option>
                <option value="package_discussion">Package Discussion</option>
                <option value="awaiting_payment">Awaiting Payment</option>
                <option value="appointment">Appointment Booked</option>
                <option value="converted">Converted Patient</option>
                <option value="lost">Mark Lost</option>
              </select>
              {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16A34A]" />}
            </div>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-[#E2E8F0] px-6 bg-white shrink-0 overflow-x-auto">
          {[
            { id: "details", label: "Overview" },
            { id: "timeline", label: `Timeline (${activitiesList.length || lead.activities?.length || 0})` },
            { id: "notes", label: `Notes (${notesList.length})` },
            { id: "tasks", label: `Tasks (${tasksList.length})` },
            { id: "checkout", label: "Assisted Checkout" },
            { id: "billing", label: "Billing & Ledger" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#16A34A] text-[#16A34A]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {/* Tab 1: Overview */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Service Interest</span>
                  <span className="font-semibold text-gray-800">{lead.serviceInterest}</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Lead Source</span>
                  <span className="font-semibold text-gray-800 capitalize">{lead.source.replace(/_/g, " ")}</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Consultation Mode</span>
                  <span className="font-semibold text-gray-800">{lead.consultationMode || "Online Video"}</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Assigned Executive</span>
                  <select
                    value={lead.assignedTo?._id || ""}
                    onChange={(e) => handleAssignOwner(e.target.value)}
                    disabled={isAssigningOwner}
                    className="w-full text-xs font-semibold bg-white text-gray-800 p-1 rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-1 focus:ring-[#16A34A] cursor-pointer"
                  >
                    <option value="">{lead.assignedTo?.name ? `${lead.assignedTo.name} (Assigned)` : "Unassigned Queue"}</option>
                    {salesTeam.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversion Box */}
              <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#15803D]">
                  <UserCheck className="w-4 h-4" />
                  <span>Convert Lead into Patient Chart</span>
                </div>
                <p className="text-xs text-[#166534] leading-relaxed">
                  Converts this prospective lead into an official medical patient record in TriGyna. Auto-generates unique Patient Code and links all interaction history.
                </p>
                <button
                  type="button"
                  onClick={handleConvertToPatient}
                  disabled={isConverting || currentStatus === "converted"}
                  className="w-full py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isConverting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentStatus === "converted" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>{currentStatus === "converted" ? "Patient Record Active" : "Confirm Patient Conversion"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab: Interaction Timeline */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                    Interaction Timeline &amp; History
                  </span>
                  <p className="text-[11px] text-gray-400">Chronological communication and lifecycle audit trail.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogCallModalOpen(true)}
                  className="px-3 py-1.5 bg-[#0C2925] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-[#154734]"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#86EFAC]" />
                  <span>+ Log Call</span>
                </button>
              </div>

              {isLoadingActivities ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#16A34A]" />
                  <span className="text-xs text-gray-500">Loading timeline...</span>
                </div>
              ) : (activitiesList.length === 0 && (!lead.activities || lead.activities.length === 0)) ? (
                <div className="py-12 text-center text-xs text-gray-400 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  No activities recorded yet for this lead.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
                  {(activitiesList.length > 0 ? activitiesList : (lead.activities || [])).map((act: any, i: number) => (
                    <div key={i} className="relative flex items-start gap-3 text-xs">
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#16A34A] flex items-center justify-center shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                      </div>
                      <div className="flex-1 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 capitalize">
                            {(act.action || "Activity").replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {act.createdAt ? new Date(act.createdAt).toLocaleString("en-IN") : "Recent"}
                          </span>
                        </div>
                        {act.details && (
                          <p className="text-gray-600 leading-relaxed text-[11px]">{act.details}</p>
                        )}
                        {act.performedBy?.name && (
                          <span className="text-[10px] text-gray-400 block font-medium">
                            By {act.performedBy.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Notes */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record call summary, medical symptoms, or patient preference..."
                  className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingNote || !newNote.trim()}
                    className="px-4 py-2 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#15803D] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAddingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Add Note</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                {notesList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No sales notes logged yet.</p>
                ) : (
                  notesList.map((n, i) => (
                    <div key={i} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1">
                      <p className="text-gray-800 leading-relaxed">{n.body}</p>
                      <span className="text-[10px] text-gray-400 block">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN") : "Recent"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Tasks */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <form onSubmit={handleAddTask} className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2.5">
                <span className="text-[11px] font-bold text-gray-700 block uppercase tracking-wider">Schedule Follow-up Task</span>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Call back regarding PCOD consultation slot"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isAddingTask || !newTaskTitle.trim()}
                  className="w-full py-2 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#15803D] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAddingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Task</span>
                </button>
              </form>

              <div className="space-y-2">
                {tasksList.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No scheduled follow-up tasks.</p>
                ) : (
                  tasksList.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#16A34A]" />
                        <div>
                          <p className="text-xs font-bold text-gray-800">{t.title}</p>
                          <span className="text-[10px] text-gray-400">
                            {t.dueDate ? new Date(t.dueDate).toLocaleString("en-IN") : "Today"}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        t.priority === "high" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {t.priority || "medium"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Assisted Checkout */}
          {activeTab === "checkout" && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-[#0C2925] to-[#123E37] text-white rounded-2xl shadow-sm space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#86EFAC] tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Assisted Sales Engine</span>
                </span>
                <h4 className="text-sm font-bold font-sans">Generate Personalized Checkout</h4>
                <p className="text-[11px] text-[#CBD5E1]">
                  Send official Razorpay booking link directly to lead via WhatsApp or SMS.
                </p>
              </div>

              <div className="space-y-3">
                {/* Item Type Switcher */}
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Item Category
                  </label>
                  <div className="inline-flex p-0.5 bg-[#F1F5F9] rounded-lg border border-[#CBD5E1]">
                    <button
                      type="button"
                      onClick={() => {
                        setItemType("package");
                        setCheckoutLink(null);
                      }}
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        itemType === "package"
                          ? "bg-white text-[#16A34A] shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Package
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItemType("service");
                        setCheckoutLink(null);
                      }}
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                        itemType === "service"
                          ? "bg-white text-[#16A34A] shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Single Service
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {itemType === "package" ? "Select Healthcare Package" : "Select Clinical Service"}
                  </label>
                  {itemType === "package" ? (
                    <select
                      value={selectedPkgId}
                      onChange={(e) => {
                        setSelectedPkgId(e.target.value);
                        setCheckoutLink(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
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
                        setCheckoutLink(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
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
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Promotional Discount (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={customDiscount}
                    onChange={(e) => {
                      setCustomDiscount(Number(e.target.value) || 0);
                      setCheckoutLink(null);
                    }}
                    placeholder="e.g. 500"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCheckout}
                  disabled={isGeneratingCheckout}
                  className="w-full py-2.5 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#15803D] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isGeneratingCheckout ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Tag className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingCheckout ? "Creating Order & Bill..." : "Generate Official Order & Checkout Link"}</span>
                </button>

                {checkoutLink && (
                  <div className="p-3.5 bg-[#EDF8F1] border border-[#16A34A]/20 rounded-2xl space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#15803D] uppercase tracking-wider block">
                        ✓ Official Order Created &amp; Link Ready
                      </span>
                      {createdOrderDetails?.orderNumber && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[#0F172A]">
                          {createdOrderDetails.orderNumber}
                        </span>
                      )}
                    </div>
                    {createdOrderDetails?.totalAmount !== undefined && (
                      <p className="text-xs text-gray-700">
                        Total Amount: <strong className="font-mono text-[#0F172A]">₹{createdOrderDetails.totalAmount.toLocaleString("en-IN")}</strong>
                        {createdOrderDetails.invoiceNumber && (
                          <span className="text-gray-500 font-normal"> (Invoice: {createdOrderDetails.invoiceNumber})</span>
                        )}
                      </p>
                    )}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#CBD5E1]">
                      <input
                        type="text"
                        readOnly
                        value={checkoutLink}
                        className="w-full text-xs text-gray-700 bg-transparent font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(checkoutLink, "_blank")}
                        className="flex-1 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-gray-50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                        <span>Open Checkout</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="flex-1 py-2 rounded-xl bg-[#25D366] hover:bg-[#20BE5A] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send WhatsApp</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Billing & Ledger */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              {isLoadingBilling ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#16A34A] mb-2" />
                  <p className="text-xs text-gray-500">Retrieving billing ledger from MongoDB...</p>
                </div>
              ) : (!billingData?.invoices?.length && !billingData?.orders?.length) ? (
                <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A] font-sans">No Invoices or Orders Issued Yet</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    This lead does not have any active billing records yet. Use the Assisted Checkout tool to generate an approved package order and issue an official pending bill.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("checkout")}
                      className="py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Generate Package Bill &amp; Checkout</span>
                    </button>
                    {!billingData?.hasPatient && (
                      <button
                        type="button"
                        onClick={handleConvertToPatient}
                        disabled={isConverting}
                        className="py-2.5 px-3 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Convert to Patient Chart
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Identification Banner */}
                  {billingData.hasPatient ? (
                    <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#15803D] block">Linked Registered Patient</span>
                        <h4 className="text-xs font-extrabold text-[#0F172A] font-sans truncate">{billingData.patient?.fullName}</h4>
                        <p className="text-[10px] font-mono text-[#16A34A] mt-0.5">{billingData.patient?.patientCode}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] uppercase">
                        Registered Chart
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FEF3C7] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#B45309] block">Pre-Conversion Prospect Billing</span>
                        <h4 className="text-xs font-extrabold text-[#0F172A] font-sans truncate">{lead.fullName} ({lead.phone})</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Patient chart will automatically be generated and linked upon payment verification.</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] uppercase">
                        Awaiting Payment
                      </span>
                    </div>
                  )}

                  {/* Financial KPI Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[10px] text-gray-500 font-medium block">Total Billed</span>
                      <span className="text-sm font-extrabold text-[#0F172A] font-mono">
                        ₹{(billingData.summary?.totalBilled || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
                      <span className="text-[10px] text-[#15803D] font-medium block">Collected</span>
                      <span className="text-sm font-extrabold text-[#15803D] font-mono">
                        ₹{(billingData.summary?.totalCollected || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FEF3C7]">
                      <span className="text-[10px] text-[#B45309] font-medium block">Balance Due</span>
                      <span className="text-sm font-extrabold text-[#B45309] font-mono">
                        ₹{(billingData.summary?.outstandingBalance || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Invoices List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        Invoices &amp; Bills ({billingData.invoices?.length || 0})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("checkout")}
                        className="text-[11px] font-bold text-[#16A34A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New Bill / Package</span>
                      </button>
                    </div>

                    {billingData.invoices.map((inv: any) => {
                      const bal = inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
                      return (
                        <div
                          key={inv._id}
                          className="p-3.5 bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs space-y-2 hover:border-[#CBD5E1] transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-[#16A34A]" />
                              <span className="font-mono font-bold text-xs text-[#0F172A]">{inv.invoiceNumber}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                inv.status === "paid"
                                  ? "bg-[#DCFCE7] text-[#15803D]"
                                  : "bg-[#FEF3C7] text-[#B45309]"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>
                              Total: <strong className="font-mono text-gray-900">₹{(inv.totalAmount || 0).toLocaleString("en-IN")}</strong>
                            </span>
                            {bal > 0 ? (
                              <span className="text-[#B45309] font-semibold">
                                Due: ₹{bal.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-[#15803D] font-semibold">
                                Fully Paid
                              </span>
                            )}
                            <span className="text-[11px] text-gray-400 font-mono">
                              {new Date(inv.issueDate || inv.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            {bal > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentModalInvoice(inv);
                                  setOfflinePaymentAmount(bal);
                                  setOfflinePaymentRef("");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Record Payment</span>
                              </button>
                            )}

                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setAutoPrintInvoice(false);
                                  setViewingInvoice(inv);
                                }}
                                className="w-7 h-7 rounded-lg bg-[#EDF8F1] hover:bg-[#D5E8DC] text-[#087443] flex items-center justify-center transition cursor-pointer shadow-2xs"
                                title="View Billing Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAutoPrintInvoice(true);
                                  setViewingInvoice(inv);
                                }}
                                className="w-7 h-7 rounded-lg bg-[#F4FAF6] hover:bg-[#E4EEE7] text-[#064A2D] border border-[#D5E2D9] flex items-center justify-center transition cursor-pointer shadow-2xs"
                                title="Download / Print Bill PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {bal > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSharePaymentWhatsApp(inv)}
                                  className="px-2 py-1 rounded-lg bg-[#25D366] hover:bg-[#20BE5A] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Share payment link via WhatsApp"
                                >
                                  <Share2 className="w-3 h-3" />
                                  <span>Share Link</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Orders List (if order exists that is not converted yet) */}
                  {billingData.orders && billingData.orders.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        Package Orders ({billingData.orders.length})
                      </span>
                      <div className="space-y-2">
                        {billingData.orders.map((ord: any) => (
                          <div
                            key={ord._id}
                            className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-gray-900">{ord.orderNumber}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                                  ord.orderStatus === "paid" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3C7] text-[#B45309]"
                                }`}>
                                  {ord.orderStatus}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">{ord.serviceName}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-extrabold font-mono text-[#0F172A]">
                                ₹{(ord.totalAmount || 0).toLocaleString("en-IN")}
                              </span>
                              {ord.checkoutToken && ord.orderStatus !== "paid" && (
                                <button
                                  type="button"
                                  onClick={() => window.open(`/checkout/${ord.checkoutToken}`, "_blank")}
                                  className="px-2 py-1 bg-white border border-[#CBD5E1] hover:bg-gray-50 text-gray-700 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Open Checkout Link"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Checkout</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verified Receipts */}
                  {billingData.receipts && billingData.receipts.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        Verified Official Receipts ({billingData.receipts.length})
                      </span>
                      <div className="space-y-1.5">
                        {billingData.receipts.map((rec: any) => (
                          <div
                            key={rec._id}
                            className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Receipt className="w-3.5 h-3.5 text-[#16A34A]" />
                              <div>
                                <p className="font-mono font-bold text-gray-900">{rec.receiptNumber}</p>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(rec.issuedAt || rec.createdAt).toLocaleDateString("en-IN")} • {rec.paymentMethod || "Online"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold font-mono text-[#15803D] mr-1">
                                ₹{(rec.amountReceived || rec.amount || 0).toLocaleString("en-IN")}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadReceiptPdf(rec.invoiceId?._id || rec.invoiceId)}
                                className="w-6 h-6 rounded-md bg-[#F4FAF6] hover:bg-[#E4EEE7] text-[#064A2D] border border-[#D5E2D9] flex items-center justify-center cursor-pointer transition shadow-2xs"
                                title="Download / Print Receipt PDF"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>

      {/* Offline Payment Recording Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#CBD5E1] space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h4 className="text-sm font-bold text-[#0F172A] font-sans">Record Offline Payment</h4>
                <p className="text-xs text-gray-500">Invoice: {paymentModalInvoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordOfflinePayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Payment Amount (₹ INR)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={offlinePaymentAmount}
                  onChange={(e) => setOfflinePaymentAmount(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={offlinePaymentMethod}
                  onChange={(e) => setOfflinePaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
                >
                  <option value="upi">UPI (Direct QR / PhonePe / GPay)</option>
                  <option value="cash">Cash (Clinic Counter)</option>
                  <option value="card">Card (POS Terminal)</option>
                  <option value="bank_transfer">Direct Bank / NEFT / IMPS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789 or Cash Receipt #101"
                  value={offlinePaymentRef}
                  onChange={(e) => setOfflinePaymentRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingPayment || offlinePaymentAmount <= 0}
                  className="flex-1 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isRecordingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isRecordingPayment ? "Recording..." : "Verify & Issue Receipt"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Call Activity Modal */}
      {isLogCallModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0C2925] text-white flex items-center justify-center">
                  <PhoneCall className="w-4 h-4 text-[#86EFAC]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 font-sans truncate">Log Call with {lead.fullName}</h3>
                  <p className="text-[11px] text-gray-500">{lead.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogCallModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogCallSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Call Outcome
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#16A34A] cursor-pointer"
                >
                  <option value="Connected - Interested in Treatment">Connected - Interested in Treatment</option>
                  <option value="Connected - Requested Callback">Connected - Requested Callback</option>
                  <option value="Connected - Discussing Package & Pricing">Connected - Discussing Package & Pricing</option>
                  <option value="Connected - Not Interested">Connected - Not Interested</option>
                  <option value="Attempted - Did Not Answer">Attempted - Did Not Answer</option>
                  <option value="Attempted - Busy / Switched Off">Attempted - Busy / Switched Off</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Discussion Notes
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Summary of conversation, patient symptoms, or specific questions asked..."
                  className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Next Planned Action (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Send WhatsApp brochure / Call tomorrow at 4 PM"
                  value={callNextAction}
                  onChange={(e) => setCallNextAction(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogCallModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingCall}
                  className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoggingCall && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLoggingCall ? "Saving..." : "Save Call Activity"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Lost Modal */}
      {isMarkLostModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 font-sans">Mark Lead as Lost</h3>
                  <p className="text-[11px] text-gray-500">Document reason for Disqualification or Drop-off</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMarkLostModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkLostSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason for Lost Status *
                </label>
                <select
                  value={selectedLostReason}
                  onChange={(e) => setSelectedLostReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="No response after defined attempts">No response after defined attempts (3+ calls)</option>
                  <option value="Not interested in holistic care">Not interested in holistic care / consultation</option>
                  <option value="Pricing concern / Budget constraint">Pricing concern / Budget constraint</option>
                  <option value="Service unavailable / Out of scope">Service unavailable / Out of clinical scope</option>
                  <option value="Chose another healthcare provider">Chose another healthcare provider</option>
                  <option value="Invalid contact details">Invalid contact details / Wrong number</option>
                  <option value="Duplicate enquiry">Duplicate enquiry</option>
                  <option value="Other">Other (Specify Below)</option>
                </select>
              </div>

              {selectedLostReason === "Other" && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Please describe *
                  </label>
                  <input
                    type="text"
                    required
                    value={otherLostReason}
                    onChange={(e) => setOtherLostReason(e.target.value)}
                    placeholder="Brief explanation for lead loss..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Documenting this reason accurately updates our conversion analytics and training feedback loop.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMarkLostModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLost}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLost && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingLost ? "Updating..." : "Confirm Mark Lost"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A4 Invoice / Billing Slip Preview Modal */}
      {viewingInvoice && (
        <A4InvoiceDocument
          invoice={formatInvoiceData(viewingInvoice)}
          autoPrint={autoPrintInvoice}
          onClose={() => {
            setViewingInvoice(null);
            setAutoPrintInvoice(false);
          }}
        />
      )}
    </div>
  );
}

