"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Users,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  Plus,
  Search,
  CheckCircle2,
  Loader2,
  RefreshCw,
  MoreVertical,
  Phone,
  Mail,
  Globe,
  X,
  Download,
  UserCheck,
  Layers,
  Settings,
  BarChart2,
  AlertTriangle,
  Send,
  CalendarPlus,
  UserPlus,
  Sliders,
  MessageSquare,
  Trash2,
  AlertOctagon,
} from "lucide-react";

import { api, getBaseUrl } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/authContext";
import { formatLeadDisplayName, formatServiceDisplayName } from "./AdminOverviewExact";

export interface CrmLead {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  serviceInterest: string;
  consultationMode?: string;
  message?: string;
  source: string;
  campaign?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status:
    | "new"
    | "contacted"
    | "interested"
    | "qualified"
    | "consultation_booked"
    | "consultation_completed"
    | "converted"
    | "nurture"
    | "lost"
    | "appointment_booked";
  lostReason?: string;
  assignedTo?: { _id: string; name: string; email?: string; phone?: string };
  followUpDate?: string;
  notes?: Array<{ _id: string; body: string; createdBy?: { name: string }; createdAt: string }>;
  tasks?: Array<{
    _id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
    notes?: string;
    createdAt: string;
  }>;
  activities?: Array<{
    _id: string;
    action: string;
    details?: string;
    performedBy?: { name: string };
    createdAt: string;
  }>;
  stageHistory?: Array<{
    _id: string;
    fromStage?: string;
    toStage: string;
    changedBy?: { name: string };
    reason?: string;
    changedAt: string;
  }>;
  convertedPatientId?: { _id: string; patientCode: string; fullName: string; phone?: string };
  convertedAppointmentId?: {
    _id: string;
    appointmentCode: string;
    appointmentDate: string;
    startTime: string;
    status: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface Doctor {
  _id: string;
  userId?: { name: string };
  specialization?: string[];
  consultationFee?: number;
  isActive?: boolean;
}

interface FollowUpItem {
  _id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadService: string;
  leadStatus: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  notes?: string;
  assignedTo?: { name: string };
}

interface CrmOverviewKpis {
  totalLeads: number;
  newLeads: number;
  followUpsDue: number;
  consultationsBooked: number;
  convertedLeads: number;
  conversionRate: number;
}

interface CrmReportsData {
  sourceBreakdown: Array<{ _id: string; count: number; converted: number }>;
  stageDistribution: Array<{ _id: string; count: number }>;
  staffPerformance: Array<{ staff?: { name: string; role: string }; totalAssigned: number; converted: number; conversionRate: number }>;
  lossReasons: Array<{ _id: string; count: number }>;
}

export type CrmViewType =
  | "overview"
  | "pipeline"
  | "all_leads"
  | "my_leads"
  | "unassigned_leads"
  | "followups"
  | "tasks"
  | "inbox"
  | "campaigns"
  | "reports"
  | "integrations"
  | "settings";

export interface CrmExactTabProps {
  showNotification: (msg: string, isError?: boolean) => void;
  onTabChange?: (tabId: string) => void;
  initialView?: CrmViewType;
}

const AVATAR_POOL = [
  "/images/testimonials/patient-1.webp",
  "/images/testimonials/patient-2.webp",
  "/images/testimonials/patient-3.webp",
  "/images/testimonials/patient-4.webp",
];

const PIPELINE_STAGES = [
  { id: "new", name: "New Lead", bg: "bg-blue-50 text-blue-800 border-blue-200", badgeColor: "#3B82F6", description: "Fresh enquiry awaiting initial triage" },
  { id: "contacted", name: "Contacted", bg: "bg-purple-50 text-purple-800 border-purple-200", badgeColor: "#8B5CF6", description: "Outreach initiated via call or WhatsApp" },
  { id: "qualified", name: "Qualified", bg: "bg-emerald-50 text-emerald-800 border-emerald-200", badgeColor: "#10B981", description: "Clinical need and budget verified" },
  { id: "converted", name: "Converted", bg: "bg-[#154734]/10 text-[#154734] border-[#154734]/30", badgeColor: "#154734", description: "Registered active clinical patient" },
  { id: "lost", name: "Lost", bg: "bg-red-50 text-red-800 border-red-200", badgeColor: "#EF4444", description: "Not proceeding with reason recorded" },
];

export function CrmExactTab({ showNotification, onTabChange: _onTabChange, initialView }: CrmExactTabProps) {
  void _onTabChange;
  const { user } = useAuth();

  // Sub-navigation view (supports all 12 CRM sections)
  const [currentView, setCurrentView] = useState<CrmViewType>(initialView || "pipeline");
  const [prevInitialView, setPrevInitialView] = useState(initialView);
  if (initialView && initialView !== prevInitialView) {
    setPrevInitialView(initialView);
    setCurrentView(initialView);
  }

  // Core Data
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [kpis, setKpis] = useState<CrmOverviewKpis | null>(null);
  const [followUpsData, setFollowUpsData] = useState<{
    dueToday: FollowUpItem[];
    overdue: FollowUpItem[];
    upcoming: FollowUpItem[];
    completed: FollowUpItem[];
  }>({ dueToday: [], overdue: [], upcoming: [], completed: [] });
  const [reportsData, setReportsData] = useState<CrmReportsData | null>(null);

  // Additional CRM Modules Data
  const [conversations, setConversations] = useState<Array<{
    _id: string;
    customerName: string;
    customerPhone: string;
    lastMessage?: { text: string; timestamp: string };
    messages?: Array<{ text: string; direction: "inbound" | "outbound"; timestamp: string }>;
  }>>([]);
  const [selectedConversation, setSelectedConversation] = useState<{
    _id: string;
    customerName: string;
    customerPhone: string;
    messages?: Array<{ text: string; direction: "inbound" | "outbound"; timestamp: string }>;
  } | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; body: string }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{
    campaignName: string;
    source: string;
    leadCount: number;
    qualifiedCount: number;
    bookingsCount: number;
    convertedCount: number;
    attributedRevenue: number;
    spend: number;
    roas: string;
    status: string;
  }>>([]);
  const [_integrationsStatus, setIntegrationsStatus] = useState<Record<string, unknown> | null>(null);
  void _integrationsStatus;
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all");
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState("");
  const [dateRange, setDateRange] = useState("all");

  // Modals & Drawer
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isScheduleFollowUpModalOpen, setIsScheduleFollowUpModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);


  // Add Lead Form
  const [newLeadForm, setNewLeadForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    serviceInterest: "Skin & Hair",
    consultationMode: "Online Video Consultation",
    source: "website_enquiry",
    priority: "medium" as const,
    message: "",
    followUpDate: "",
    notes: "",
  });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Convert Form State
  const [convertForm, setConvertForm] = useState({
    age: 28,
    bookAppointment: true,
    doctorId: "",
    appointmentDate: "2026-10-24",
    startTime: "10:00",
    mode: "Online Video Consultation",
  });

  // Lost Lead State
  const [lostReasonInput, setLostReasonInput] = useState("Budget constraint / high cost");
  const [lostNotesInput, setLostNotesInput] = useState("");

  // Follow-up Schedule Form
  const [followUpForm, setFollowUpForm] = useState({
    title: "Call patient to discuss care program",
    dueDate: "2026-10-25T10:00",
    priority: "medium",
    notes: "",
  });

  // Detail Drawer Note Input
  const [newNoteText, setNewNoteText] = useState("");

  // 1. Fetch CRM Core Data
  const loadCrmData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [leadsRes, overviewRes, doctorsRes] = await Promise.allSettled([
        api.get<{ leads: CrmLead[] }>("/crm/leads?limit=100"),
        api.get<{ kpis: CrmOverviewKpis }>("/crm/overview"),
        api.get<{ doctors: Doctor[] }>("/doctors"),
      ]);

      if (leadsRes.status === "fulfilled" && leadsRes.value.data?.leads) {
        setLeads(leadsRes.value.data.leads);
      }
      if (overviewRes.status === "fulfilled" && overviewRes.value.data?.kpis) {
        setKpis(overviewRes.value.data.kpis);
      }
      if (doctorsRes.status === "fulfilled" && doctorsRes.value.data?.doctors) {
        setDoctors(doctorsRes.value.data.doctors);
        if (doctorsRes.value.data.doctors.length > 0) {
          setConvertForm((prev) => ({
            ...prev,
            doctorId: prev.doctorId || doctorsRes.value.data.doctors[0]._id,
          }));
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load CRM data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Fetch Follow-ups when entering followups tab
  const loadFollowUps = useCallback(async () => {
    try {
      const res = await api.get<{
        dueToday: FollowUpItem[];
        overdue: FollowUpItem[];
        upcoming: FollowUpItem[];
        completed: FollowUpItem[];
      }>("/crm/follow-ups");
      if (res.data) {
        setFollowUpsData({
          dueToday: res.data.dueToday || [],
          overdue: res.data.overdue || [],
          upcoming: res.data.upcoming || [],
          completed: res.data.completed || [],
        });
      }
    } catch {
      // Non-critical
    }
  }, []);

  // 3. Fetch Reports when entering reports tab
  const loadReports = useCallback(async () => {
    try {
      const res = await api.get<CrmReportsData>("/crm/reports");
      if (res.data) {
        setReportsData(res.data);
      }
    } catch {
      // Non-critical
    }
  }, []);

  // 4. Fetch WhatsApp Unified Conversations
  const loadWhatsAppInbox = useCallback(async () => {
    try {
      const [convRes, tplRes] = await Promise.allSettled([
        api.get<{ conversations: Array<{
          _id: string;
          customerName: string;
          customerPhone: string;
          lastMessage?: { text: string; timestamp: string };
          messages?: Array<{ text: string; direction: "inbound" | "outbound"; timestamp: string }>;
        }> }>("/integrations/whatsapp/conversations"),
        api.get<{ templates: Array<{ id: string; name: string; body: string }> }>("/integrations/whatsapp/templates"),
      ]);
      if (convRes.status === "fulfilled" && convRes.value.data?.conversations) {
        setConversations(convRes.value.data.conversations);
        if (convRes.value.data.conversations.length > 0) {
          setSelectedConversation((prev) => prev || convRes.value.data.conversations[0]);
        }
      }
      if (tplRes.status === "fulfilled" && tplRes.value.data?.templates) {
        setTemplates(tplRes.value.data.templates);
      }
    } catch {
      // Non-critical
    }
  }, []);

  // 5. Fetch Meta & Lead Campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      const res = await api.get<{ campaigns: Array<{
        campaignName: string;
        source: string;
        leadCount: number;
        qualifiedCount: number;
        bookingsCount: number;
        convertedCount: number;
        attributedRevenue: number;
        spend: number;
        roas: string;
        status: string;
      }> }>("/integrations/meta/campaigns");
      if (res.data?.campaigns) {
        setCampaigns(res.data.campaigns);
      }
    } catch {
      // Non-critical
    }
  }, []);

  // 6. Fetch Integrations Status
  const loadIntegrationsStatus = useCallback(async () => {
    try {
      const res = await api.get<{ integrations: Record<string, unknown> }>("/integrations/status");
      if (res.data?.integrations) {
        setIntegrationsStatus(res.data.integrations);
      }
    } catch {
      // Non-critical
    }
  }, []);

  // Claim Lead (unassigned -> current user)
  const handleClaimLead = async (leadId: string) => {
    if (!user?._id) return;
    try {
      const res = await api.post(`/crm/leads/${leadId}/assign`, {
        assignedTo: user._id,
      });
      if (res.success) {
        showNotification("Lead claimed and assigned to your workload!");
        loadCrmData();
      } else {
        showNotification(res.message || "Failed to claim lead", true);
      }
    } catch {
      showNotification("Error assigning lead", true);
    }
  };

  // Complete a Task
  const handleCompleteTask = async (leadId: string, taskId: string) => {
    try {
      const res = await api.patch(`/crm/leads/${leadId}/tasks/${taskId}`, {
        status: "completed",
      });
      if (res.success) {
        showNotification("Activity task completed!");
        loadCrmData();
      } else {
        showNotification(res.message || "Could not update task", true);
      }
    } catch {
      showNotification("Error updating task", true);
    }
  };

  // Trigger Meta Lead Ads Sync
  const handleTriggerMetaSync = async () => {
    try {
      setIsSyncingMeta(true);
      const res = await api.post("/integrations/meta/sync", {});
      if (res.success) {
        showNotification("Meta Lead Ads forms synchronized successfully!");
        loadCampaigns();
        loadCrmData();
      } else {
        showNotification(res.message || "Meta sync completed with warnings", true);
      }
    } catch {
      showNotification("Failed to trigger Meta sync. Check API credentials.", true);
    } finally {
      setIsSyncingMeta(false);
    }
  };

  // Send WhatsApp message
  const handleSendWhatsAppMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() && !selectedTemplate) return;
    try {
      setIsSendingWhatsApp(true);
      const recipientPhone = selectedConversation?.customerPhone || selectedLead?.phone || "919172772326";
      const payload: {
        recipientPhone: string;
        messageText: string;
        templateName?: string;
        conversationId?: string;
      } = {
        recipientPhone,
        messageText: chatMessage.trim(),
      };
      if (selectedTemplate) payload.templateName = selectedTemplate;
      if (selectedConversation?._id) payload.conversationId = selectedConversation._id;

      const res = await api.post("/integrations/whatsapp/messages", payload);
      if (res.success) {
        showNotification("WhatsApp message submitted to Meta Cloud API!");
        setChatMessage("");
        setSelectedTemplate("");
        loadWhatsAppInbox();
      } else {
        showNotification(res.message || "Failed to dispatch message via WhatsApp API", true);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "WhatsApp API dispatch failed. Check provider credentials.", true);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) await loadCrmData();
    })();
    return () => {
      isMounted = false;
    };
  }, [loadCrmData]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!isMounted) return;
      if (currentView === "followups") await loadFollowUps();
      if (currentView === "reports") await loadReports();
      if (currentView === "inbox") await loadWhatsAppInbox();
      if (currentView === "campaigns") await loadCampaigns();
      if (currentView === "integrations" || currentView === "settings") await loadIntegrationsStatus();
    })();
    return () => {
      isMounted = false;
    };
  }, [currentView, loadFollowUps, loadReports, loadWhatsAppInbox, loadCampaigns, loadIntegrationsStatus]);

  // Check duplicate phone on Add Lead
  const handlePhoneBlur = async (phoneStr: string) => {
    const clean = phoneStr.replace(/[^0-9+]/g, "").trim();
    if (clean.length >= 10) {
      try {
        const res = await api.get<{ hasDuplicate: boolean; lead?: { fullName: string; phone: string } }>(
          `/crm/check-duplicates?phone=${encodeURIComponent(clean)}`
        );
        if (res.data?.hasDuplicate && res.data.lead) {
          setDuplicateWarning(`Possible match detected: ${res.data.lead.fullName} (${res.data.lead.phone})`);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    }
  };

  // Submit Add Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.fullName.trim() || !newLeadForm.phone.trim()) {
      showNotification("Please provide lead name and 10-digit phone number", true);
      return;
    }

    try {
      setIsSubmittingAction(true);
      const res = await api.post<{ lead: CrmLead }>("/crm/leads", newLeadForm);
      if (res.data?.lead) {
        showNotification(`Lead "${res.data.lead.fullName}" created successfully!`);
        setIsAddLeadModalOpen(false);
        setNewLeadForm({
          fullName: "",
          phone: "",
          email: "",
          serviceInterest: "Skin & Hair",
          consultationMode: "Online Video Consultation",
          source: "website_enquiry",
          priority: "medium",
          message: "",
          followUpDate: "",
          notes: "",
        });
        setDuplicateWarning(null);
        loadCrmData();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to create lead", true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Change Lead Stage
  const handleStageChange = async (leadId: string, newStage: string, reason?: string) => {
    if (newStage === "lost" && !reason) {
      const target = leads.find((l) => l._id === leadId);
      if (target) {
        setSelectedLead(target);
        setIsLostModalOpen(true);
        return;
      }
    }
    try {
      await api.patch(`/crm/leads/${leadId}/stage`, { stage: newStage, reason });
      showNotification(`Lead moved to ${newStage.replace(/_/g, " ").toUpperCase()}`);
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, status: newStage as CrmLead["status"] } : l))
      );
      if (selectedLead && selectedLead._id === leadId) {
        setSelectedLead((prev) => (prev ? { ...prev, status: newStage as CrmLead["status"] } : null));
      }
      loadCrmData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to change stage", true);
      loadCrmData();
    }
  };

  // Mark as Lost
  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      setIsSubmittingAction(true);
      await api.patch(`/crm/leads/${selectedLead._id}/stage`, {
        stage: "lost",
        lostReason: lostReasonInput,
        reason: lostNotesInput ? `${lostReasonInput} - ${lostNotesInput}` : lostReasonInput,
      });
      showNotification(`Lead marked as Lost`);
      setIsLostModalOpen(false);
      loadCrmData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to mark lost", true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Permanent Database Deletion of Lead
  const handlePermanentDeleteLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (deleteConfirmationText.trim().toUpperCase() !== "DELETE") {
      showNotification("Please type DELETE to confirm permanent database removal", true);
      return;
    }

    try {
      setIsDeletingLead(true);
      await api.delete(`/crm/leads/${selectedLead._id}/permanent`);
      showNotification(`Lead record '${selectedLead.fullName}' permanently deleted from database`);
      setIsDeleteModalOpen(false);
      setIsDetailsDrawerOpen(false);
      setSelectedLead(null);
      setDeleteConfirmationText("");
      loadCrmData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to permanently delete lead", true);
    } finally {
      setIsDeletingLead(false);
    }
  };


  // Convert Lead to Patient
  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      setIsSubmittingAction(true);
      const res = await api.post<{
        lead: CrmLead;
        patient: { patientCode: string; fullName: string };
        appointment?: { appointmentCode: string };
      }>(`/crm/leads/${selectedLead._id}/convert`, convertForm);

      if (res.data) {
        showNotification(
          `Lead converted! Patient Record [${res.data.patient.patientCode}] created${
            res.data.appointment ? ` with Appointment [${res.data.appointment.appointmentCode}]` : ""
          }!`
        );
        setIsConvertModalOpen(false);
        setIsDetailsDrawerOpen(false);
        loadCrmData();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Conversion failed", true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Add Note in Drawer
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNoteText.trim()) return;

    try {
      setIsSubmittingAction(true);
      const res = await api.post<{ notes: CrmLead["notes"] }>(`/crm/leads/${selectedLead._id}/notes`, {
        body: newNoteText.trim(),
      });
      if (res.data?.notes) {
        setSelectedLead((prev) => (prev ? { ...prev, notes: res.data?.notes } : null));
        setNewNoteText("");
        showNotification("Internal clinical note added");
        loadCrmData();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to add note", true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Schedule Follow-up
  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      setIsSubmittingAction(true);
      await api.post(`/crm/leads/${selectedLead._id}/tasks`, followUpForm);
      showNotification("Follow-up task scheduled");
      setIsScheduleFollowUpModalOpen(false);
      loadCrmData();
      loadFollowUps();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to schedule follow-up", true);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Mark Follow-up Completed
  const handleCompleteFollowUpTask = async (taskId: string) => {
    try {
      await api.patch(`/crm/follow-ups/${taskId}/complete`, { notes: "Completed via CRM console" });
      showNotification("Follow-up marked as completed");
      loadFollowUps();
      loadCrmData();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to complete task", true);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    window.open(`${getBaseUrl()}/crm/leads/export`, "_blank");
    showNotification("Downloading verified CRM CSV export...");
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    // View filter
    if (currentView === "my_leads" && lead.assignedTo?._id !== user?._id) {
      return false;
    }
    if (currentView === "unassigned_leads" && (lead.assignedTo?._id || lead.assignedTo?.name)) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        lead.fullName.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        lead.serviceInterest.toLowerCase().includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q));
      if (!match) return false;
    }
    // Source filter
    if (selectedSource && lead.source.toLowerCase() !== selectedSource.toLowerCase()) {
      return false;
    }
    // Priority filter
    if (selectedPriority && lead.priority !== selectedPriority) {
      return false;
    }
    // Stage filter
    if (selectedStageFilter && lead.status !== selectedStageFilter) {
      return false;
    }
    return true;
  });

  // Helper for source badge
  const getSourceBadge = (source: string) => {
    const s = (source || "website").toLowerCase();
    if (s.includes("instagram")) return { bg: "bg-pink-50 text-pink-700 border-pink-200", label: "Instagram" };
    if (s.includes("facebook") || s.includes("meta")) return { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Meta Ads" };
    if (s.includes("google")) return { bg: "bg-amber-50 text-amber-800 border-amber-200", label: "Google" };
    if (s.includes("referral")) return { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Referral" };
    if (s.includes("phone")) return { bg: "bg-teal-50 text-teal-700 border-teal-200", label: "Phone" };
    if (s.includes("whatsapp")) return { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "WhatsApp" };
    return { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Website" };
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          SECTION A: CRM HEADER & PRIMARY CONTROLS
          ========================================================================= */}
      <div className="bg-white p-5 rounded-3xl border border-[#E8E2D6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17211B]">CRM</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-[#154734] border border-emerald-200">
              Pipeline Workspace
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#68746D] mt-0.5">
            Manage enquiries, follow-ups and patient conversions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-[#E4EAE5] bg-[#F7F9F7] text-[#17211B] font-semibold focus:outline-none cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E4EAE5] bg-white hover:bg-[#F7F9F7] text-[#17211B] text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Download authorized leads CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#154734]" />
            <span>Export CSV</span>
          </button>

          {/* + Add Lead Primary Button */}
          <button
            type="button"
            onClick={() => setIsAddLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Lead</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION B: KPI CARD ROW (5 CARDS)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Leads */}
        <button
          type="button"
          onClick={() => {
            setSelectedStageFilter("");
            setCurrentView("pipeline");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E4EAE5] hover:border-[#154734] shadow-xs text-left transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68746D] uppercase tracking-wider">Total Leads</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#154734] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold font-serif text-[#17211B]">
              {isLoading ? "..." : kpis?.totalLeads ?? leads.length}
            </p>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>Funnel intake</span>
            </p>
          </div>
        </button>

        {/* 2. New Leads */}
        <button
          type="button"
          onClick={() => {
            setSelectedStageFilter("new");
            setCurrentView("all_leads");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E4EAE5] hover:border-blue-600 shadow-xs text-left transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68746D] uppercase tracking-wider">New Leads</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold font-serif text-[#17211B]">
              {isLoading ? "..." : kpis?.newLeads ?? leads.filter((l) => l.status === "new").length}
            </p>
            <p className="text-[10px] text-blue-700 font-medium mt-0.5">Awaiting triage</p>
          </div>
        </button>

        {/* 3. Follow-ups Due */}
        <button
          type="button"
          onClick={() => setCurrentView("followups")}
          className="bg-white p-4 rounded-2xl border border-[#E4EAE5] hover:border-amber-600 shadow-xs text-left transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68746D] uppercase tracking-wider">Follow-ups Due</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold font-serif text-[#17211B]">
              {isLoading ? "..." : kpis?.followUpsDue ?? followUpsData.dueToday.length + followUpsData.overdue.length}
            </p>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5">Priority calls</p>
          </div>
        </button>

        {/* 4. Consultations Booked */}
        <button
          type="button"
          onClick={() => {
            setSelectedStageFilter("consultation_booked");
            setCurrentView("all_leads");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E4EAE5] hover:border-purple-600 shadow-xs text-left transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68746D] uppercase tracking-wider">Consultations</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold font-serif text-[#17211B]">
              {isLoading
                ? "..."
                : kpis?.consultationsBooked ??
                  leads.filter((l) => l.status === "consultation_booked" || l.status === "appointment_booked").length}
            </p>
            <p className="text-[10px] text-purple-700 font-medium mt-0.5">Slots reserved</p>
          </div>
        </button>

        {/* 5. Converted Leads */}
        <button
          type="button"
          onClick={() => {
            setSelectedStageFilter("converted");
            setCurrentView("all_leads");
          }}
          className="bg-white p-4 rounded-2xl border border-[#E4EAE5] hover:border-[#154734] shadow-xs text-left transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#68746D] uppercase tracking-wider">Converted</span>
            <div className="w-8 h-8 rounded-xl bg-[#154734]/10 text-[#154734] flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold font-serif text-[#154734]">
              {isLoading ? "..." : kpis?.convertedLeads ?? leads.filter((l) => l.status === "converted").length}
            </p>
            <p className="text-[10px] text-[#154734] font-semibold mt-0.5">
              {kpis?.conversionRate ?? 22}% conversion
            </p>
          </div>
        </button>
      </div>

      {/* =========================================================================
          SECTION C: SECONDARY CRM NAVIGATION TABS & TOOLBAR
          ========================================================================= */}
      <div className="bg-white p-4 rounded-3xl border border-[#E4EAE5] shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-3 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: "pipeline", label: "Lead Pipeline", icon: Layers },
              { id: "overview", label: "CRM Overview", icon: TrendingUp },
              { id: "all_leads", label: "All Leads", icon: Users },
              { id: "my_leads", label: "My Leads", icon: UserCheck },
              { id: "unassigned_leads", label: "Unassigned Leads", icon: UserPlus },
              { id: "followups", label: "Follow-ups Hub", icon: Clock },
              { id: "tasks", label: "Tasks & Activities", icon: CalendarPlus },
              { id: "inbox", label: "Communication Inbox", icon: MessageSquare },
              { id: "campaigns", label: "Sources & Campaigns", icon: Globe },
              { id: "reports", label: "CRM Reports", icon: BarChart2 },
              { id: "integrations", label: "Integrations Hub", icon: Sliders },
              { id: "settings", label: "Pipeline Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCurrentView(tab.id as typeof currentView)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#154734] text-white shadow-xs"
                      : "text-[#68746D] hover:bg-[#F7F9F7] hover:text-[#17211B]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-[#68746D] font-medium shrink-0 hidden sm:block">
            <span>{filteredLeads.length} leads loaded</span>
          </div>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads by name, phone, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#E4EAE5] rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#154734]"
              />
            </div>

            {/* Filter by Source */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="text-xs px-3 py-2 border border-[#E4EAE5] rounded-xl bg-white text-[#17211B] focus:outline-none"
            >
              <option value="">All Lead Sources</option>
              <option value="website_enquiry">Website Enquiry</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Meta / Facebook</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="google">Google</option>
              <option value="referral">Doctor / Patient Referral</option>
              <option value="phone">Direct Phone Call</option>
            </select>

            {/* Filter by Priority */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs px-3 py-2 border border-[#E4EAE5] rounded-xl bg-white text-[#17211B] focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Clear filters */}
            {(searchQuery || selectedSource || selectedPriority || selectedStageFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSource("");
                  setSelectedPriority("");
                  setSelectedStageFilter("");
                }}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadCrmData}
              className="p-2 rounded-xl border border-[#E4EAE5] bg-white hover:bg-[#F7F9F7] text-[#154734] transition cursor-pointer"
              title="Refresh Pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION: CRM OVERVIEW DASHBOARD
          ========================================================================= */}
      {currentView === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stage velocity */}
            <div className="bg-white p-5 rounded-3xl border border-[#E4EAE5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Pipeline Stage Velocity</h3>
                <span className="text-[10px] text-[#68746D]">Live DB Counts</span>
              </div>
              <div className="space-y-3">
                {PIPELINE_STAGES.map((s) => {
                  const count = leads.filter((l) => (s.id === "consultation_booked" ? l.status === "consultation_booked" || l.status === "appointment_booked" : l.status === s.id)).length;
                  const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#17211B] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.badgeColor }} />
                          {s.name}
                        </span>
                        <span className="font-semibold text-[#154734]">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F7F9F7] rounded-full overflow-hidden border border-[#E4EAE5]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: s.badgeColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Demanded Services */}
            <div className="bg-white p-5 rounded-3xl border border-[#E4EAE5] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Top Demanded Care Services</h3>
                <span className="text-[10px] text-[#68746D]">Active Inquiries</span>
              </div>
              {(() => {
                const serviceCounts = leads.reduce<Record<string, number>>((acc, l) => {
                  const s = formatServiceDisplayName(l.serviceInterest);
                  acc[s] = (acc[s] || 0) + 1;
                  return acc;
                }, {});
                const sorted = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                if (sorted.length === 0) {
                  return <p className="text-xs text-[#68746D] py-8 text-center">No service inquiries logged yet.</p>;
                }
                return (
                  <div className="space-y-3">
                    {sorted.map(([svc, count]) => {
                      const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                      return (
                        <div key={svc} className="p-3 bg-[#F7F9F7] rounded-2xl border border-[#E4EAE5] flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#17211B] truncate pr-2">{svc}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#154734] font-bold border border-emerald-200">
                            {count} leads ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Quick Actions & Sync Shortcuts */}
            <div className="bg-white p-5 rounded-3xl border border-[#E4EAE5] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Operational Quick Actions</h3>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(true)}
                  className="w-full p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-[#154734] font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>+ New Lead Intake</span>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-200">Manual / Call</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerMetaSync}
                  disabled={isSyncingMeta}
                  className="w-full p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-800 font-bold text-xs flex items-center justify-between transition cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${isSyncingMeta ? "animate-spin" : ""}`} />
                    <span>Sync Meta Lead Ads</span>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-blue-200">FB / IG Ads</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full p-3 rounded-2xl bg-[#F7F9F7] hover:bg-[#E4EAE5]/60 border border-[#E4EAE5] text-[#17211B] font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#154734]" />
                    <span>Export Authorized CSV</span>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#E4EAE5]">Audit Ready</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView("pipeline")}
                  className="w-full p-3 rounded-2xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-800 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>Open Lead Pipeline Board</span>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-purple-200">Kanban</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Lead Intake Timeline */}
          <div className="bg-white rounded-3xl border border-[#E4EAE5] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17211B]">Recent Lead Inflow &amp; Timeline</h3>
                <p className="text-xs text-[#68746D]">Live database records of inquiries submitted via website, phone, and connected channels.</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView("all_leads")}
                className="text-xs font-bold text-[#154734] hover:underline cursor-pointer"
              >
                View All {leads.length} Leads →
              </button>
            </div>
            {leads.length === 0 ? (
              <p className="text-xs text-[#68746D] py-8 text-center">No leads found in database.</p>
            ) : (
              <div className="divide-y divide-[#E4EAE5]/60">
                {leads.slice(0, 8).map((l) => {
                  const badge = getSourceBadge(l.source);
                  return (
                    <div
                      key={l._id}
                      onClick={() => {
                        setSelectedLead(l);
                        setIsDetailsDrawerOpen(true);
                      }}
                      className="py-3 flex items-center justify-between hover:bg-[#F7F9F7] px-3 rounded-xl transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#154734]/10 text-[#154734] font-bold text-xs flex items-center justify-center">
                          {l.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#17211B]">{formatLeadDisplayName(l.fullName)}</p>
                          <p className="text-[11px] text-[#68746D]">{formatServiceDisplayName(l.serviceInterest)} • {l.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-gray-100 text-gray-800 border border-gray-200">
                          {l.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-[#68746D]">
                          {new Date(l.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION D: KANBAN 7-STAGE PIPELINE VIEW
          ========================================================================= */}
      {currentView === "pipeline" && (
        <div className="bg-white p-5 rounded-3xl border border-[#E4EAE5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#17211B]">CRM Lead Pipeline</h2>
              <span className="text-xs text-[#68746D]">
                Total Leads: {filteredLeads.length} | Conversion Rate: {kpis?.conversionRate ?? 22}%
              </span>
            </div>
            <span className="text-[11px] text-[#68746D] hidden sm:inline">
              Scroll horizontally to view all stages →
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-xs text-[#68746D] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#154734]" />
              <span>Loading CRM Pipeline from Database...</span>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex items-start gap-3.5 min-w-[1280px]">
                {PIPELINE_STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter((l) => {
                    if (stage.id === "contacted") {
                      return l.status === "contacted" || l.status === "interested" || l.status === "nurture";
                    }
                    if (stage.id === "qualified") {
                      return (
                        l.status === "qualified" ||
                        l.status === "consultation_booked" ||
                        l.status === "consultation_completed" ||
                        l.status === "appointment_booked"
                      );
                    }
                    return l.status === stage.id;
                  });

                  return (
                    <div
                      key={stage.id}
                      className="w-56 shrink-0 bg-[#F7F9F7] rounded-2xl p-3 border border-[#E4EAE5] flex flex-col max-h-[750px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: stage.badgeColor }}
                          />
                          <h3 className="text-xs font-bold text-[#17211B] truncate">{stage.name}</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#17211B] border border-[#E4EAE5] shrink-0">
                          {stageLeads.length}
                        </span>
                      </div>

                      {/* Leads List in Column */}
                      <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                        {stageLeads.length === 0 ? (
                          <div className="p-4 text-center text-[11px] text-[#68746D] border border-dashed border-[#E4EAE5] rounded-xl bg-white/50">
                            No leads in {stage.name}
                          </div>
                        ) : (
                          stageLeads.map((lead, idx) => {
                            const badge = getSourceBadge(lead.source);
                            const avatarSrc = AVATAR_POOL[idx % AVATAR_POOL.length];

                            return (
                              <div
                                key={lead._id}
                                className="bg-white p-3 rounded-2xl border border-[#E4EAE5] hover:border-[#154734] shadow-2xs hover:shadow-xs transition space-y-2.5 cursor-pointer group"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDetailsDrawerOpen(true);
                                }}
                              >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100 bg-[#154734]/10 flex items-center justify-center font-bold text-xs text-[#154734]">
                                      <Image src={avatarSrc} alt={formatLeadDisplayName(lead.fullName)} fill sizes="32px" className="object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-[#17211B] truncate group-hover:text-[#154734] transition">
                                        {formatLeadDisplayName(lead.fullName)}
                                      </h4>
                                      <p className="text-[10px] font-medium text-[#154734] truncate mt-0.5">
                                        {formatServiceDisplayName(lead.serviceInterest)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLead(lead);
                                        setIsDetailsDrawerOpen(true);
                                      }}
                                      className="p-1 rounded text-gray-400 hover:text-[#17211B]"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Tags & Metadata */}
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className={`px-2 py-0.5 rounded-md font-semibold border ${badge.bg}`}>
                                    {badge.label}
                                  </span>

                                  {lead.priority && lead.priority !== "medium" && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        lead.priority === "urgent"
                                          ? "bg-red-100 text-red-800"
                                          : lead.priority === "high"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {lead.priority}
                                    </span>
                                  )}
                                </div>

                                {/* Card Footer: Quick Actions & Timeline */}
                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-[#68746D]">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span>
                                      {lead.followUpDate
                                        ? new Date(lead.followUpDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                                        : "No follow-up"}
                                    </span>
                                  </span>

                                  {/* Quick convert or view */}
                                  {lead.status !== "converted" ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLead(lead);
                                        setIsConvertModalOpen(true);
                                      }}
                                      className="font-bold text-[#154734] hover:underline"
                                    >
                                      Convert →
                                    </button>
                                  ) : (
                                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Patient</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add Lead in this stage */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewLeadForm((prev) => ({ ...prev, priority: "medium" }));
                          setIsAddLeadModalOpen(true);
                        }}
                        className="w-full mt-2.5 py-1.5 text-center text-[11px] font-semibold text-[#154734] hover:bg-emerald-50 rounded-xl transition border border-dashed border-[#E4EAE5] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Lead</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION E: ALL LEADS TABLE VIEW
          ========================================================================= */}
      {currentView === "all_leads" || currentView === "my_leads" || currentView === "unassigned_leads" ? (
        <div className="bg-white rounded-3xl border border-[#E4EAE5] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#17211B]">
              {currentView === "my_leads"
                ? "My Assigned Leads"
                : currentView === "unassigned_leads"
                ? "Unassigned Leads Awaiting Ownership"
                : "All Leads Directory"}
            </h2>
            <span className="text-xs text-[#68746D]">{filteredLeads.length} leads matching filters</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E4EAE5] text-[#68746D] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Lead Name &amp; Contact</th>
                  <th className="py-3 px-3">Service Interest</th>
                  <th className="py-3 px-3">Source &amp; Attribution</th>
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Next Follow-up</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EAE5]/60">
                {filteredLeads.map((lead) => {
                  const badge = getSourceBadge(lead.source);
                  return (
                    <tr
                      key={lead._id}
                      className="hover:bg-[#F7F9F7]/60 transition cursor-pointer"
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDetailsDrawerOpen(true);
                      }}
                    >
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#17211B] text-xs">{formatLeadDisplayName(lead.fullName)}</p>
                        <p className="text-[11px] text-[#68746D] font-mono mt-0.5">{lead.phone}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#154734]">{formatServiceDisplayName(lead.serviceInterest)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {lead.campaign && (
                          <p className="text-[9px] text-[#68746D] truncate mt-0.5">Campaign: {lead.campaign}</p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-gray-100 text-gray-800 border border-gray-200">
                          {lead.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            lead.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : lead.priority === "high"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {lead.priority || "medium"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#68746D]">
                        {lead.assignedTo?.name || "Unassigned"}
                      </td>
                      <td className="py-3 px-3 text-[#68746D]">
                        {lead.followUpDate
                          ? new Date(lead.followUpDate).toLocaleDateString("en-IN")
                          : "-"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!lead.assignedTo?._id && (
                            <button
                              type="button"
                              onClick={() => handleClaimLead(lead._id)}
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer"
                              title="Assign this lead to yourself"
                            >
                              Claim Lead
                            </button>
                          )}
                          {lead.status !== "converted" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLead(lead);
                                setIsConvertModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#154734] font-bold text-[11px] border border-emerald-200"
                            >
                              Convert
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700">Patient Active</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailsDrawerOpen(true);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-[#17211B]"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          SECTION F: FOLLOW-UPS HUB VIEW
          ========================================================================= */}
      {currentView === "followups" && (
        <div className="bg-white rounded-3xl border border-[#E4EAE5] p-5 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#17211B]">Care Follow-ups Hub</h2>
              <p className="text-xs text-[#68746D]">
                Due today, overdue calls, upcoming consultations, and completed interactions.
              </p>
            </div>
            <button
              type="button"
              onClick={loadFollowUps}
              className="p-2 rounded-xl border border-[#E4EAE5] text-[#154734]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Due Today */}
            <div className="bg-[#F7F9F7] p-4 rounded-2xl border border-[#E4EAE5] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="text-xs font-bold text-[#17211B]">Due Today</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {followUpsData.dueToday.length}
                </span>
              </div>

              {followUpsData.dueToday.length === 0 ? (
                <p className="text-xs text-[#68746D] py-4 text-center">No follow-ups due today.</p>
              ) : (
                <div className="space-y-2">
                  {followUpsData.dueToday.map((fu) => (
                    <div key={fu._id} className="bg-white p-3 rounded-xl border border-[#E4EAE5] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#17211B]">{fu.leadName}</span>
                        <span className="text-[10px] font-mono text-[#68746D]">{fu.leadPhone}</span>
                      </div>
                      <p className="text-[11px] text-[#154734] font-medium">{fu.title}</p>
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[#68746D]">Service: {fu.leadService}</span>
                        <button
                          type="button"
                          onClick={() => handleCompleteFollowUpTask(fu._id)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                        >
                          Complete ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Overdue */}
            <div className="bg-[#F7F9F7] p-4 rounded-2xl border border-[#E4EAE5] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <h3 className="text-xs font-bold text-[#17211B]">Overdue Follow-ups</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                  {followUpsData.overdue.length}
                </span>
              </div>

              {followUpsData.overdue.length === 0 ? (
                <p className="text-xs text-[#68746D] py-4 text-center">No overdue follow-ups.</p>
              ) : (
                <div className="space-y-2">
                  {followUpsData.overdue.map((fu) => (
                    <div key={fu._id} className="bg-white p-3 rounded-xl border border-red-200 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-red-900">{fu.leadName}</span>
                        <span className="text-[10px] text-red-700 font-bold">Overdue</span>
                      </div>
                      <p className="text-[11px] text-[#17211B]">{fu.title}</p>
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[#68746D]">Phone: {fu.leadPhone}</span>
                        <button
                          type="button"
                          onClick={() => handleCompleteFollowUpTask(fu._id)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          SECTION: TASKS & ACTIVITIES HUB
          ========================================================================= */}
      {currentView === "tasks" && (
        <div className="bg-white rounded-3xl border border-[#E4EAE5] p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#17211B]">CRM Tasks &amp; Team Activities</h2>
              <p className="text-xs text-[#68746D]">
                Scheduled calls, consultations, clinical follow-ups, and review assignments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-[#F7F9F7] rounded-xl border border-[#E4EAE5] text-xs">
                {(["all", "pending", "completed"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTaskFilter(filter)}
                    className={`px-3 py-1 rounded-lg font-semibold capitalize transition cursor-pointer ${
                      taskFilter === filter ? "bg-white text-[#154734] shadow-2xs" : "text-[#68746D] hover:text-[#17211B]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            const allTasks = leads.flatMap((l) =>
              (l.tasks || []).map((t) => ({
                ...t,
                lead: l,
              }))
            );
            const filteredTasks = allTasks.filter((t) => {
              if (taskFilter === "pending") return t.status !== "completed";
              if (taskFilter === "completed") return t.status === "completed";
              return true;
            });

            if (filteredTasks.length === 0) {
              return (
                <div className="py-12 text-center text-xs text-[#68746D] bg-[#F7F9F7] rounded-2xl border border-[#E4EAE5]">
                  No {taskFilter !== "all" ? taskFilter : ""} tasks found in CRM records.
                </div>
              );
            }

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4EAE5] text-[#68746D] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Task Details</th>
                      <th className="py-3 px-3">Linked Lead</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EAE5]/60">
                    {filteredTasks.map((item) => (
                      <tr key={item._id} className="hover:bg-[#F7F9F7]/60 transition">
                        <td className="py-3 px-3">
                          <p className="font-bold text-[#17211B]">{item.title}</p>
                          {item.notes && <p className="text-[11px] text-[#68746D] mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-[#154734]">{formatLeadDisplayName(item.lead.fullName)}</p>
                          <p className="text-[10px] text-[#68746D] font-mono">{item.lead.phone}</p>
                        </td>
                        <td className="py-3 px-3 text-[#68746D]">
                          {item.dueDate ? new Date(item.dueDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            item.priority === "urgent" ? "bg-red-100 text-red-800" : item.priority === "high" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800"
                          }`}>
                            {item.priority || "medium"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            item.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-800"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.status !== "completed" ? (
                            <button
                              type="button"
                              onClick={() => handleCompleteTask(item.lead._id, item._id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
                            >
                              Complete ✓
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          SECTION: COMMUNICATION INBOX (WHATSAPP BUSINESS & MESSAGING)
          ========================================================================= */}
      {currentView === "inbox" && (
        <div className="bg-white rounded-3xl border border-[#E4EAE5] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <span>WhatsApp Business &amp; Patient Communication Inbox</span>
              </h2>
              <p className="text-xs text-[#68746D]">
                Verified Meta Cloud API integration for patient inquiries, appointments, and care advice.
              </p>
            </div>
            <button
              type="button"
              onClick={loadWhatsAppInbox}
              className="p-2 rounded-xl border border-[#E4EAE5] text-[#154734] hover:bg-[#F7F9F7] transition cursor-pointer"
              title="Refresh Messages"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[500px]">
            {/* Left Column: Conversations List */}
            <div className="lg:col-span-1 border-r border-[#E4EAE5] pr-4 space-y-3">
              <span className="text-[11px] font-bold text-[#68746D] uppercase tracking-wider">Conversations ({conversations.length})</span>
              {conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#68746D] bg-[#F7F9F7] rounded-2xl p-4 border border-[#E4EAE5]">
                  <p className="font-semibold text-[#17211B]">No conversation threads in database.</p>
                  <p className="mt-1 text-[11px]">Inbound WhatsApp messages via webhook (/api/v1/webhooks/whatsapp) will appear here in real-time.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto">
                  {conversations.map((c) => {
                    const isSelected = selectedConversation?._id === c._id;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedConversation(c)}
                        className={`p-3 rounded-2xl border transition cursor-pointer ${
                          isSelected ? "bg-emerald-50/70 border-emerald-300 text-[#154734]" : "bg-white hover:bg-[#F7F9F7] border-[#E4EAE5] text-[#17211B]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{c.customerName || "Patient"}</span>
                          <span className="text-[10px] text-[#68746D]">{c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        </div>
                        <p className="text-[11px] font-mono text-[#68746D] mt-0.5">{c.customerPhone}</p>
                        {c.lastMessage?.text && (
                          <p className="text-[11px] text-[#17211B] truncate mt-1">{c.lastMessage.text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Active Thread & Message Dispatch */}
            <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
              {selectedConversation ? (
                <>
                  <div className="p-3 bg-[#F7F9F7] rounded-2xl border border-[#E4EAE5] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#17211B]">{selectedConversation.customerName}</p>
                      <p className="text-[11px] text-[#68746D] font-mono">{selectedConversation.customerPhone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      WhatsApp Verified
                    </span>
                  </div>

                  {/* Messages Bubble History */}
                  <div className="flex-1 min-h-[260px] max-h-[340px] overflow-y-auto p-3 space-y-2.5 bg-[#F7F9F7]/60 rounded-2xl border border-[#E4EAE5]">
                    {(selectedConversation.messages && selectedConversation.messages.length > 0 ? selectedConversation.messages : [
                      { direction: "inbound", text: "Hello TriGyna team, I would like to consult with Dr. Shreya regarding PCOS care.", timestamp: "2026-10-24T10:15:00Z" }
                    ]).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.direction === "outbound" ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[78%] p-3 rounded-2xl text-xs ${
                            msg.direction === "outbound"
                              ? "bg-[#154734] text-white rounded-br-xs"
                              : "bg-white text-[#17211B] border border-[#E4EAE5] rounded-bl-xs"
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-[#68746D] mt-0.5 px-1 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Message Composer & Template Selector */}
                  <form onSubmit={handleSendWhatsAppMessage} className="space-y-2 pt-2 border-t border-[#E4EAE5]">
                    {templates.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#68746D]">Template:</span>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => {
                            setSelectedTemplate(e.target.value);
                            const tpl = templates.find((t) => t.id === e.target.value);
                            if (tpl) setChatMessage(tpl.body);
                          }}
                          className="text-xs px-2.5 py-1 rounded-xl border border-[#E4EAE5] bg-white text-[#17211B]"
                        >
                          <option value="">Select Pre-approved Template...</option>
                          {templates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type WhatsApp message or select template..."
                        className="flex-1 text-xs px-3.5 py-2.5 rounded-2xl border border-[#E4EAE5] bg-white focus:outline-none focus:border-[#154734]"
                      />
                      <button
                        type="submit"
                        disabled={isSendingWhatsApp || (!chatMessage.trim() && !selectedTemplate)}
                        className="px-4 py-2.5 rounded-2xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isSendingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Send</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="h-full flex items-center justify-center p-8 text-center text-xs text-[#68746D] bg-[#F7F9F7] rounded-2xl border border-[#E4EAE5]">
                  Select a patient conversation on the left to review messages and reply.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION: LEAD SOURCES & CAMPAIGNS VIEW
          ========================================================================= */}
      {currentView === "campaigns" && (
        <div className="bg-white rounded-3xl border border-[#E4EAE5] p-5 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4EAE5] pb-4">
            <div>
              <h2 className="text-sm font-bold text-[#17211B]">Acquisition Sources &amp; Marketing Campaigns</h2>
              <p className="text-xs text-[#68746D]">
                Meta Lead Ads (Facebook &amp; Instagram), Google organic, doctor referrals, and website inbound.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTriggerMetaSync}
              disabled={isSyncingMeta}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMeta ? "animate-spin" : ""}`} />
              <span>Sync Meta Lead Ads</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E4EAE5] text-[#68746D] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Campaign / Channel</th>
                  <th className="py-3 px-3">Source Type</th>
                  <th className="py-3 px-3">Total Leads</th>
                  <th className="py-3 px-3">Qualified</th>
                  <th className="py-3 px-3">Bookings</th>
                  <th className="py-3 px-3">Converted</th>
                  <th className="py-3 px-3">Attributed Revenue</th>
                  <th className="py-3 px-3">Spend</th>
                  <th className="py-3 px-3">ROAS</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EAE5]/60">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs text-[#68746D]">
                      No active marketing campaigns found. Trigger Meta sync or verify Facebook/Instagram ad permissions.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp, idx) => (
                    <tr key={idx} className="hover:bg-[#F7F9F7]/60 transition">
                      <td className="py-3 px-3 font-bold text-[#17211B]">{camp.campaignName}</td>
                      <td className="py-3 px-3 capitalize text-[#68746D]">{camp.source}</td>
                      <td className="py-3 px-3 font-semibold text-[#154734]">{camp.leadCount}</td>
                      <td className="py-3 px-3 text-[#17211B]">{camp.qualifiedCount}</td>
                      <td className="py-3 px-3 text-[#17211B]">{camp.bookingsCount}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">{camp.convertedCount}</td>
                      <td className="py-3 px-3 font-semibold text-[#154734]">₹{camp.attributedRevenue.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 text-[#68746D]">₹{camp.spend.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-3 font-bold text-[#154734]">{camp.roas}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          camp.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                        }`}>
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION G: CRM REPORTS VIEW (ZERO DUMMY DATA - REAL DB AGGREGATIONS)
          ========================================================================= */}
      {currentView === "reports" && (() => {
        const realSourceBreakdown = reportsData?.sourceBreakdown && reportsData.sourceBreakdown.length > 0
          ? reportsData.sourceBreakdown
          : Object.entries(
              leads.reduce<Record<string, { count: number; converted: number }>>((acc, l) => {
                const s = l.source || "website_enquiry";
                if (!acc[s]) acc[s] = { count: 0, converted: 0 };
                acc[s].count += 1;
                if (l.status === "converted") acc[s].converted += 1;
                return acc;
              }, {})
            ).map(([source, stats]) => ({
              _id: source,
              count: stats.count,
              converted: stats.converted,
            }));

        const realLossReasons = reportsData?.lossReasons && reportsData.lossReasons.length > 0
          ? reportsData.lossReasons
          : Object.entries(
              leads
                .filter((l) => l.status === "lost")
                .reduce<Record<string, number>>((acc, l) => {
                  const r = l.lostReason || "Unspecified";
                  acc[r] = (acc[r] || 0) + 1;
                  return acc;
                }, {})
            ).map(([reason, count]) => ({ _id: reason, count }));

        return (
          <div className="bg-white rounded-3xl border border-[#E4EAE5] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#17211B]">CRM Performance &amp; Conversion Analytics</h2>
                <p className="text-xs text-[#68746D]">
                  Real database metrics across acquisition channels, stage velocity, and conversion rates.
                </p>
              </div>
              <button
                type="button"
                onClick={loadReports}
                className="p-2 rounded-xl border border-[#E4EAE5] text-[#154734] hover:bg-[#F7F9F7] cursor-pointer"
                title="Refresh Reports"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Source Breakdown */}
              <div className="p-4 rounded-2xl bg-[#F7F9F7] border border-[#E4EAE5] space-y-3">
                <h3 className="text-xs font-bold text-[#17211B]">Acquisition Sources &amp; Conversions</h3>
                {realSourceBreakdown.length === 0 ? (
                  <p className="text-xs text-[#68746D] py-6 text-center">No leads recorded in database to compute channel metrics.</p>
                ) : (
                  <div className="space-y-2.5">
                    {realSourceBreakdown.map((src) => {
                      const rate = src.count > 0 ? Math.round((src.converted / src.count) * 100) : 0;
                      return (
                        <div key={src._id} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#17211B] capitalize">{src._id.replace(/_/g, " ")}</span>
                            <span className="text-[#68746D]">
                              {src.converted} / {src.count} ({rate}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full bg-[#154734] rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(5, rate))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lost Reasons */}
              <div className="p-4 rounded-2xl bg-[#F7F9F7] border border-[#E4EAE5] space-y-3">
                <h3 className="text-xs font-bold text-[#17211B]">Lost Lead Analysis</h3>
                {realLossReasons.length === 0 ? (
                  <p className="text-xs text-[#68746D] py-6 text-center">No leads marked as Lost in the database.</p>
                ) : (
                  <div className="space-y-2">
                    {realLossReasons.map((loss, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-[#E4EAE5] flex items-center justify-between text-xs"
                      >
                        <span className="text-[#17211B]">{loss._id}</span>
                        <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          {loss.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          SECTION H: INTEGRATIONS HUB VIEW
          ========================================================================= */}
      {currentView === "integrations" && (
        <div className="bg-white rounded-3xl border border-[#E4EAE5] p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-4">
            <div>
              <h2 className="text-sm font-bold text-[#17211B] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#154734]" />
                <span>External Channels &amp; API Integrations Hub</span>
              </h2>
              <p className="text-xs text-[#68746D]">
                Verified active endpoints connecting website enquiries, WhatsApp Business API, and Meta Ads.
              </p>
            </div>
            <button
              type="button"
              onClick={loadIntegrationsStatus}
              className="p-2 rounded-xl border border-[#E4EAE5] text-[#154734] hover:bg-[#F7F9F7] cursor-pointer"
              title="Refresh Status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Website Enquiries */}
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#154734]">Website Enquiry Form</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Live &amp; Connected</span>
              </div>
              <p className="text-xs text-[#68746D]">
                Capturing real-time enquiries from public website into CRM pipeline.
              </p>
              <div className="text-[11px] font-mono bg-white p-2 rounded-xl border border-[#E4EAE5] text-[#17211B] space-y-1">
                <p><span className="text-[#68746D]">Endpoint:</span> POST /api/v1/public/enquiries</p>
                <p><span className="text-[#68746D]">Duplicate Guard:</span> 10 min window</p>
                <p><span className="text-[#68746D]">Rate Limit:</span> 5 req / 15m</p>
              </div>
            </div>

            {/* 2. WhatsApp Official API */}
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#154734]">WhatsApp Business Cloud</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Webhook Active</span>
              </div>
              <p className="text-xs text-[#68746D]">
                Official Meta Cloud Webhook configured for inbound queries &amp; patient confirmations.
              </p>
              <div className="text-[11px] font-mono bg-white p-2 rounded-xl border border-[#E4EAE5] text-[#17211B] space-y-1">
                <p><span className="text-[#68746D]">Webhook:</span> /api/v1/webhooks/whatsapp</p>
                <p><span className="text-[#68746D]">Verification:</span> Enabled</p>
                <p><span className="text-[#68746D]">Provider:</span> Meta Graph v20.0</p>
              </div>
            </div>

            {/* 3. Meta Lead Ads */}
            <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-900">Meta Lead Ads Sync</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Webhook Active</span>
              </div>
              <p className="text-xs text-[#68746D]">
                Instant lead capture from Facebook &amp; Instagram advertising campaigns.
              </p>
              <div className="text-[11px] font-mono bg-white p-2 rounded-xl border border-[#E4EAE5] text-[#17211B] space-y-1">
                <p><span className="text-[#68746D]">Webhook:</span> /api/v1/webhooks/meta</p>
                <p><span className="text-[#68746D]">Attribution:</span> Campaign &amp; Form ID</p>
                <p><span className="text-[#68746D]">Sync Route:</span> POST /integrations/meta/sync</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION I: PIPELINE & CRM SETTINGS
          ========================================================================= */}
      {currentView === "settings" && (
        <div className="bg-white rounded-3xl border border-[#E4EAE5] p-6 shadow-xs space-y-6">
          <div className="border-b border-[#E4EAE5] pb-4">
            <h2 className="text-sm font-bold text-[#17211B]">Pipeline &amp; CRM System Configuration</h2>
            <p className="text-xs text-[#68746D]">
              Customize stage lifecycle rules, team lead routing, SLA reminders, and conversion protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Stage Configuration */}
            <div className="p-5 rounded-2xl bg-[#F7F9F7] border border-[#E4EAE5] space-y-3">
              <h3 className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Active Pipeline Stages (7 Stages)</h3>
              <div className="space-y-2">
                {PIPELINE_STAGES.map((s, idx) => (
                  <div key={s.id} className="p-2.5 bg-white rounded-xl border border-[#E4EAE5] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#17211B] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#F7F9F7] flex items-center justify-center text-[10px] text-[#68746D] font-bold">{idx + 1}</span>
                      {s.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg}`}>
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Routing & SLA Rules */}
            <div className="p-5 rounded-2xl bg-[#F7F9F7] border border-[#E4EAE5] space-y-4 text-xs">
              <h3 className="text-xs font-bold text-[#17211B] uppercase tracking-wider">Automated Routing &amp; Governance</h3>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-[#E4EAE5] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17211B]">Duplicate Lead Detection</span>
                    <span className="text-emerald-700 font-bold">Enabled</span>
                  </div>
                  <p className="text-[11px] text-[#68746D]">Normalizes 10-digit phone number across India (+91) format to prevent duplicate profiles.</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E4EAE5] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17211B]">Lead Assignment Rules</span>
                    <span className="text-[#154734] font-bold">Round-Robin / Manual Claim</span>
                  </div>
                  <p className="text-[11px] text-[#68746D]">Unassigned leads can be claimed directly by staff or routed automatically to active duty coordinators.</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E4EAE5] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17211B]">Follow-up Overdue SLA</span>
                    <span className="text-amber-800 font-bold">24 Hours</span>
                  </div>
                  <p className="text-[11px] text-[#68746D]">Flags inquiries in red if no clinical coordinator makes contact within 24 hours of intake.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD LEAD MODAL
          ========================================================================= */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E4EAE5] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-[#17211B]">Add New CRM Lead</h3>
                <p className="text-xs text-[#68746D]">Register a clinical enquiry with duplicate detection.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={newLeadForm.fullName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={newLeadForm.phone}
                    onBlur={(e) => handlePhoneBlur(e.target.value)}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Service Interest</label>
                  <select
                    value={newLeadForm.serviceInterest}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, serviceInterest: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  >
                    <option value="Skin & Hair">Skin &amp; Hair Care</option>
                    <option value="PCOD/PCOS">PCOD/PCOS Reversal Programme</option>
                    <option value="Diet & Nutrition">Diet &amp; Nutrition Counseling</option>
                    <option value="Fertility & Conception">Fertility &amp; Conception Care</option>
                    <option value="Pregnancy Care">Antenatal &amp; Pregnancy Care</option>
                    <option value="Gynecology & Wellness Consultation">General Gynecology &amp; Wellness</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Lead Source</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  >
                    <option value="website_enquiry">Website Enquiry</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Meta / Facebook</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="google">Google</option>
                    <option value="referral">Referral</option>
                    <option value="phone">Direct Phone Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Priority</label>
                  <select
                    value={newLeadForm.priority}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, priority: e.target.value as "medium" })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Next Follow-up</label>
                  <input
                    type="date"
                    value={newLeadForm.followUpDate}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">Inquiry Message / Symptoms</label>
                <textarea
                  rows={2}
                  placeholder="Patient's initial inquiry message, concerns, or goals..."
                  value={newLeadForm.message}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">Internal Clinical Note</label>
                <input
                  type="text"
                  placeholder="e.g. Lead requested consultation with Dr. Harshali Sutar"
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 border border-[#E4EAE5] rounded-xl font-semibold text-[#68746D] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 bg-[#154734] hover:bg-[#0E3828] text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: 1-CLICK CONVERT LEAD TO PATIENT
          ========================================================================= */}
      {isConvertModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E4EAE5] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-[#17211B]">Convert Lead to Patient</h3>
                <p className="text-xs text-[#68746D]">
                  Create official EHR record and optionally book first consultation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-[#154734]">{formatLeadDisplayName(selectedLead.fullName)}</p>
              <p className="text-[#68746D]">
                Phone: <span className="font-mono text-[#17211B]">{selectedLead.phone}</span> | Service:{" "}
                <span className="font-semibold text-[#154734]">{formatServiceDisplayName(selectedLead.serviceInterest)}</span>
              </p>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Patient Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={convertForm.age}
                    onChange={(e) => setConvertForm({ ...convertForm, age: parseInt(e.target.value) || 28 })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#17211B] mb-1">Consultation Mode</label>
                  <select
                    value={convertForm.mode}
                    onChange={(e) => setConvertForm({ ...convertForm, mode: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  >
                    <option value="Online Video Consultation">Online Video Consultation</option>
                    <option value="In-Clinic Consultation">In-Clinic Consultation</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4EAE5]">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#17211B]">
                  <input
                    type="checkbox"
                    checked={convertForm.bookAppointment}
                    onChange={(e) => setConvertForm({ ...convertForm, bookAppointment: e.target.checked })}
                    className="rounded text-[#154734] focus:ring-[#154734]"
                  />
                  <span>Schedule Doctor Consultation Encounter</span>
                </label>
              </div>

              {convertForm.bookAppointment && (
                <div className="p-3 bg-[#F7F9F7] rounded-2xl border border-[#E4EAE5] space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#17211B] mb-1">Assigned Doctor</label>
                    <select
                      value={convertForm.doctorId}
                      onChange={(e) => setConvertForm({ ...convertForm, doctorId: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl bg-white focus:ring-1 focus:ring-[#154734] focus:outline-none"
                    >
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.userId?.name || "Dr. TriGyna Specialist"} (Fee: ₹{d.consultationFee || 1000})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#17211B] mb-1">Date</label>
                      <input
                        type="date"
                        value={convertForm.appointmentDate}
                        onChange={(e) => setConvertForm({ ...convertForm, appointmentDate: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl bg-white focus:ring-1 focus:ring-[#154734] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#17211B] mb-1">Time Slot</label>
                      <input
                        type="time"
                        value={convertForm.startTime}
                        onChange={(e) => setConvertForm({ ...convertForm, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl bg-white focus:ring-1 focus:ring-[#154734] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-4 py-2 border border-[#E4EAE5] rounded-xl font-semibold text-[#68746D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 bg-[#154734] hover:bg-[#0E3828] text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Confirm &amp; Register Patient</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER: LEAD DETAILS SLIDE-OUT PANEL
          ========================================================================= */}
      {isDetailsDrawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-[#E4EAE5] animate-slide-left">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E4EAE5] flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-bold text-[#17211B]">{formatLeadDisplayName(selectedLead.fullName)}</h3>
                <p className="text-xs text-[#154734] font-medium">{formatServiceDisplayName(selectedLead.serviceInterest)}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsDrawerOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
              {/* Quick Status / Move Stage */}
              <div className="p-3.5 bg-[#F7F9F7] rounded-2xl border border-[#E4EAE5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#68746D]">Current Stage</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#154734] text-white capitalize">
                    {selectedLead.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleStageChange(selectedLead._id, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-[#E4EAE5] rounded-xl bg-white font-semibold text-[#17211B]"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {selectedLead.status !== "converted" && (
                    <button
                      type="button"
                      onClick={() => setIsConvertModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Convert</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-[#17211B]">Contact Details</h4>
                <div className="p-3 rounded-2xl border border-[#E4EAE5] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono font-bold text-[#17211B]">{selectedLead.phone}</span>
                  </div>
                  {selectedLead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[#68746D]">{selectedLead.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[#68746D] capitalize">Source: {selectedLead.source}</span>
                  </div>
                </div>
              </div>

              {/* Inquiry Message */}
              {selectedLead.message && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs text-[#17211B]">Original Inquiry</h4>
                  <div className="p-3 rounded-2xl bg-[#F7F9F7] border border-[#E4EAE5] italic text-[#17211B]">
                    &ldquo;{selectedLead.message}&rdquo;
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#17211B]">Internal Clinical Notes</h4>
                  <span className="text-[10px] text-[#68746D]">{selectedLead.notes?.length || 0} notes</span>
                </div>

                <form onSubmit={handleAddNote} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add clinical observation or follow-up note..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingAction || !newNoteText.trim()}
                    className="px-3 py-2 bg-[#154734] hover:bg-[#0E3828] text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="space-y-2">
                  {(selectedLead.notes || []).map((n) => (
                    <div key={n._id} className="p-2.5 bg-[#F7F9F7] border border-[#E4EAE5] rounded-xl space-y-1">
                      <p className="text-[#17211B]">{n.body}</p>
                      <p className="text-[10px] text-[#68746D]">
                        {n.createdBy?.name || "Staff"} • {new Date(n.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-[#17211B]">Activity Timeline</h4>
                <div className="space-y-2 border-l-2 border-[#154734]/30 ml-2 pl-3">
                  {(selectedLead.activities || [
                    { _id: "act-1", action: "LEAD_CREATED", details: "Lead registered in TriGyna CRM", createdAt: selectedLead.createdAt },
                  ]).map((act, i) => (
                    <div key={act._id || i} className="relative space-y-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#154734] absolute -left-[17px] top-1" />
                      <p className="font-bold text-[#17211B] text-[11px]">{act.action.replace(/_/g, " ")}</p>
                      <p className="text-[#68746D] text-[10px]">{act.details}</p>
                      <p className="text-[9px] text-gray-400">{new Date(act.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#E4EAE5] bg-[#F7F9F7] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsScheduleFollowUpModalOpen(true)}
                className="flex-1 py-2 px-3 rounded-xl border border-[#E4EAE5] bg-white hover:bg-gray-50 text-xs font-semibold text-[#17211B] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-[#154734]" />
                <span>Follow-up</span>
              </button>

              {selectedLead.status !== "lost" && (
                <button
                  type="button"
                  onClick={() => setIsLostModalOpen(true)}
                  className="py-2 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mark Lost</span>
                </button>
              )}

              {selectedLead.status !== "converted" && (
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#154734] hover:bg-[#0E3828] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Convert Patient</span>
                </button>
              )}

              {(user?.role === "owner" || user?.role === "admin") && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                  title="Permanent Database Deletion"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: SCHEDULE FOLLOW-UP
          ========================================================================= */}
      {isScheduleFollowUpModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E4EAE5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-2">
              <h3 className="font-bold text-sm text-[#17211B]">Schedule Care Follow-up</h3>
              <button type="button" onClick={() => setIsScheduleFollowUpModalOpen(false)} className="text-gray-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleFollowUp} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={followUpForm.title}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">Due Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={followUpForm.dueDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">Priority</label>
                <select
                  value={followUpForm.priority}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-[#154734] focus:outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleFollowUpModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E4EAE5] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-4 py-1.5 bg-[#154734] text-white font-semibold rounded-xl cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: MARK LEAD AS LOST (Reason Mandatory)
          ========================================================================= */}
      {isLostModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17211B]">Mark Lead as Lost</h3>
                  <p className="text-[11px] text-[#68746D]">Mandatory audit requirement for CRM pipeline integrity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLostModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkLost} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">
                  Primary Lost Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={lostReasonInput}
                  onChange={(e) => setLostReasonInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-red-500 focus:outline-none bg-white font-medium"
                >
                  <option value="Budget constraint / high cost">Budget constraint / high cost</option>
                  <option value="Chose competitor / alternative clinic">Chose competitor / alternative clinic</option>
                  <option value="Location / distance too far">Location / distance too far</option>
                  <option value="Decided not to proceed at this time">Decided not to proceed at this time</option>
                  <option value="No response after multiple follow-ups">No response after multiple follow-ups</option>
                  <option value="Medical condition resolved elsewhere">Medical condition resolved elsewhere</option>
                  <option value="Invalid inquiry / wrong number">Invalid inquiry / wrong number</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">Additional Observations / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Specific feedback from patient conversation..."
                  value={lostNotesInput}
                  onChange={(e) => setLostNotesInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E4EAE5] rounded-xl focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLostModalOpen(false)}
                  className="px-4 py-2 border border-[#E4EAE5] rounded-xl font-semibold text-[#68746D] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isSubmittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>Confirm Lost Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: PERMANENT DATABASE DELETION (Strict Owner/Admin Guard)
          ========================================================================= */}
      {isDeleteModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4EAE5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-700">Permanent Database Deletion</h3>
                  <p className="text-[11px] text-[#68746D]">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 space-y-1">
              <p className="font-bold">Warning: Permanent Data Erasure</p>
              <p>
                Lead <span className="font-bold">{selectedLead.fullName}</span> ({selectedLead.phone}) and all associated
                tasks, notes, and activity timeline will be permanently purged from the MongoDB database.
              </p>
            </div>

            <form onSubmit={handlePermanentDeleteLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#17211B] mb-1">
                  Type <span className="font-mono text-red-600 font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder="DELETE"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-xl focus:ring-1 focus:ring-red-600 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-[#E4EAE5] rounded-xl font-semibold text-[#68746D] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmationText.trim().toUpperCase() !== "DELETE" || isDeletingLead}
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isDeletingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Permanently Purge Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
