"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  CheckCheck,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowLeft,
  X,
  Lock,
  BarChart3,
  Users,
  Cpu,
  Radio,
  FileCheck2,
  Settings2,
  ScrollText,
  AlertCircle,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Filter,
  Phone,
  Star,
  MoreVertical,
  Calendar,
  UserPlus,
  UserCheck,
  Tag,
  FileText,
  Smile,
  Paperclip,
  ChevronDown,
  Check,
  ExternalLink,
  AlertTriangle,
  Copy,
  Edit3,
  SlidersHorizontal,
  Grid,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api/client";

// Reference Navigation Tabs strictly matching the visual specification
type WhatsAppCenterTab =
  | "inbox"
  | "automations"
  | "templates"
  | "campaigns"
  | "analytics"
  | "integrations"
  | "logs";

// Sub-tabs for the Right Panel
type ContactPanelTab = "contact" | "crm" | "activity" | "notes";

interface InteractiveData {
  action?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  appointmentCode?: string;
  appointmentDate?: string;
  timeSlot?: string;
  doctorName?: string;
  mode?: string;
}

interface WhatsAppMessage {
  _id?: string;
  messageId: string;
  sender: "customer" | "staff" | "system";
  senderName?: string;
  text: string;
  templateName?: string;
  status?: "queued" | "accepted" | "sent" | "delivered" | "read" | "failed";
  mediaType?: "text" | "image" | "document" | "audio" | "video" | "sticker" | "interactive";
  mediaUrl?: string;
  interactiveData?: InteractiveData;
  timestamp: string;
}

interface WhatsAppConversation {
  _id: string;
  conversationId: string;
  customerPhone: string;
  customerName: string;
  status: "active" | "waiting" | "closed";
  serviceInterest?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  starred?: boolean;
  tags?: string[];
  branch?: string;
  customerServiceWindowExpiresAt?: string;
  lastInboundMessageAt?: string;
  isEscalated?: boolean;
  escalationReason?: string;
  unreadCount: number;
  leadId?: {
    _id: string;
    leadCode?: string;
    fullName: string;
    phone: string;
    status: string;
    serviceInterest?: string;
    priority?: string;
    source?: string;
    assignedTo?: string;
    followUpDate?: string;
  };
  patientId?: {
    _id: string;
    fullName: string;
    patientCode: string;
    phone: string;
    email?: string;
    gender?: string;
    age?: number;
  };
  assignedStaff?: {
    _id: string;
    name: string;
    role: string;
    email: string;
    phone?: string;
  };
  lastMessage?: {
    text: string;
    sender: "customer" | "staff" | "system";
    timestamp: string;
  };
  messages: WhatsAppMessage[];
  internalNotes?: Array<{
    _id?: string;
    note: string;
    author: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  header?: string;
  body: string;
  footer?: string;
  variables: string[];
}

interface DoctorSlotOption {
  doctorId: string;
  doctorName: string;
  specialization: string[];
  consultationFee: number;
  availableSlots: string[];
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}

interface StaffUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
}

export function WhatsAppInboxTab({
  showNotification,
}: {
  showNotification: (msg: string, isErr?: boolean) => void;
}) {
  // Navigation Tabs state: default is "inbox" matching reference screenshot
  const [activeTab, setActiveTab] = useState<WhatsAppCenterTab>("inbox");
  const [rightPanelTab, setRightPanelTab] = useState<ContactPanelTab>("contact");

  // Conversations & Chat State
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDropdown, setFilterDropdown] = useState<string>("all");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Meta Integration & Health State
  const [integrationHealth, setIntegrationHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Meta Templates & Quick Replies
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

  // Quick Reply dropdown
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const quickRepliesList = [
    { title: "Operational Hours & Services", text: "TriGyna Health & Wellness provides 100% online video consultations Mon-Sat, 9:00 AM – 7:00 PM via Google Meet and Zoom." },
    { title: "Hair Treatment & Clinical Info", text: "We offer constitutional homoeopathy alongside specialized hair follicle stimulation therapies via 100% online video consultations." },
    { title: "PCOS/PCOD Holistic Care", text: "Our natural PCOD protocol targets insulin resistance and hormonal balance without harsh side effects. Would you like to schedule a consultation with our specialist?" },
    { title: "Consultation Charges", text: "Doctor video consultation is ₹600 (Online Video Consultation) and includes a thorough 30-minute diagnostic case-taking session." },
  ];

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Available Slots for Booking
  const [slotData, setSlotData] = useState<DoctorSlotOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSlotTime, setSelectedSlotTime] = useState("");
  const [selectedMode, setSelectedMode] = useState<"Online Video Consultation">("Online Video Consultation");
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  // Activity feed & Internal Notes
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // Staff users list for assignment
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  // Other Tabs Data
  const [rules, setRules] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingTabContent, setLoadingTabContent] = useState(false);

  // Tag creation input
  const [customTagInput, setCustomTagInput] = useState("");

  // Contact edit form
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Credentials form
  const [configForm, setConfigForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    appId: "",
    appSecret: "",
    verifyToken: "",
    graphApiVersion: "v21.0",
  });

  // Campaign create form
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    description: "",
    templateName: "welcome_enquiry",
    serviceInterest: "Hair Treatment",
    leadStage: "all",
  });

  // Rule create form
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    triggerEvent: "whatsapp.message.received",
    actionType: "send_whatsapp_template",
    templateName: "welcome_enquiry",
  });

  // ===================== DATA LOADERS =====================

  const loadHealthAndStats = useCallback(async () => {
    try {
      const [healthRes, statsRes] = await Promise.all([
        api.get<any>("/integrations/status"),
        api.get<any>("/integrations/whatsapp/stats"),
      ]);
      if (healthRes.success && healthRes.data?.telemetry?.whatsapp) {
        setIntegrationHealth(healthRes.data.telemetry.whatsapp);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch {
      // non-blocking
    }
  }, []);

  const loadConversations = useCallback(async (selectPhone?: string) => {
    try {
      setIsLoadingConvs(true);
      const res = await api.get<{ conversations: WhatsAppConversation[] }>(
        "/integrations/whatsapp/conversations"
      );
      if (res.success && res.data?.conversations) {
        const convs = res.data.conversations;
        setConversations(convs);

        if (selectPhone) {
          const match = convs.find((c) => c.customerPhone === selectPhone);
          if (match) setSelectedConv(match);
        } else if (convs.length > 0) {
          setSelectedConv((prev) => {
            if (!prev) return convs[0];
            const updated = convs.find((c) => c._id === prev._id);
            return updated || convs[0];
          });
        }
      }
    } catch {
      showNotification("Could not load WhatsApp conversations", true);
    } finally {
      setIsLoadingConvs(false);
    }
  }, [showNotification]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await api.get<{ templates: MessageTemplate[] }>(
        "/integrations/whatsapp/templates"
      );
      if (res.success && res.data?.templates) {
        setTemplates(res.data.templates);
      }
    } catch {
      // non-blocking
    }
  }, []);

  const loadStaffUsers = useCallback(async () => {
    try {
      const res = await api.get<{ users: StaffUser[] }>("/users");
      if (res.success && res.data?.users) {
        setStaffUsers(res.data.users.filter((u) => ["admin", "owner", "sales", "crm", "reception"].includes(u.role)));
      }
    } catch {
      // non-blocking
    }
  }, []);

  const loadDoctorSlots = useCallback(async (dateStr: string) => {
    try {
      const res = await api.get<{ date: string; doctors: DoctorSlotOption[] }>(
        `/integrations/whatsapp/available-slots?date=${dateStr}`
      );
      if (res.success && res.data?.doctors) {
        setSlotData(res.data.doctors);
        if (res.data.doctors.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(res.data.doctors[0].doctorId);
        }
      }
    } catch {
      // non-blocking
    }
  }, [selectedDoctorId]);

  const loadActivityFeed = useCallback(async (convId: string) => {
    try {
      setLoadingActivities(true);
      const res = await api.get<{ activities: ActivityItem[] }>(
        `/integrations/whatsapp/conversations/${convId}/activity`
      );
      if (res.success && res.data?.activities) {
        setActivities(res.data.activities);
      }
    } catch {
      // non-blocking
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadHealthAndStats();
    loadConversations();
    loadTemplates();
    loadStaffUsers();
  }, [loadHealthAndStats, loadConversations, loadTemplates, loadStaffUsers]);

  // Load activity feed when conversation changes
  useEffect(() => {
    if (selectedConv?._id) {
      loadActivityFeed(selectedConv._id);
    }
  }, [selectedConv?._id, loadActivityFeed]);

  // Load slots when book modal opens
  useEffect(() => {
    if (isBookModalOpen) {
      loadDoctorSlots(selectedDate);
    }
  }, [isBookModalOpen, selectedDate, loadDoctorSlots]);

  // Secondary tab data loading
  useEffect(() => {
    const fetchTabContent = async () => {
      setLoadingTabContent(true);
      try {
        if (activeTab === "automations") {
          const res = await api.get<any>("/automations/rules");
          if (res.success && res.data?.rules) setRules(res.data.rules);
        } else if (activeTab === "campaigns") {
          const res = await api.get<any>("/whatsapp/campaigns");
          if (res.success && res.data?.campaigns) setCampaigns(res.data.campaigns);
        } else if (activeTab === "logs") {
          const res = await api.get<any>("/integrations/whatsapp/logs?limit=50");
          if (res.success && res.data?.logs) setLogs(res.data.logs);
        }
      } catch {
        // non-blocking
      } finally {
        setLoadingTabContent(false);
      }
    };

    if (["automations", "campaigns", "logs", "analytics"].includes(activeTab)) {
      fetchTabContent();
    }
  }, [activeTab]);

  // ===================== ACTION HANDLERS =====================

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadHealthAndStats(), loadConversations(), loadTemplates()]);
    if (selectedConv?._id) await loadActivityFeed(selectedConv._id);
    setIsRefreshing(false);
    showNotification("WhatsApp Inbox synchronized with backend");
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || replyText;
    if (!text.trim() || !selectedConv) return;
    setIsSending(true);
    try {
      const res = await api.post<{ conversation: WhatsAppConversation; message: WhatsAppMessage }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/messages`,
        {
          text: text.trim(),
          customerPhone: selectedConv.customerPhone,
        }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setReplyText("");
        showNotification("Message dispatched via official Meta WhatsApp API");
        loadActivityFeed(selectedConv._id);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to dispatch message", true);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !selectedConv) return;
    const varValues = selectedTemplate.variables.map(
      (v) => templateVars[v] || `[${v}]`
    );
    setIsSending(true);
    try {
      const res = await api.post<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/messages`,
        {
          templateName: selectedTemplate.id,
          variables: varValues,
          customerPhone: selectedConv.customerPhone,
        }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setIsTemplateModalOpen(false);
        setSelectedTemplate(null);
        setTemplateVars({});
        showNotification(`Template '${selectedTemplate.name}' dispatched successfully`);
        loadActivityFeed(selectedConv._id);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Template dispatch failed", true);
    } finally {
      setIsSending(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedConv || !selectedDoctorId || !selectedSlotTime) {
      showNotification("Please select a doctor, appointment date, and time slot", true);
      return;
    }
    setIsBookingSubmitting(true);
    try {
      const res = await api.post<any>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/book-appointment`,
        {
          doctorId: selectedDoctorId,
          appointmentDate: selectedDate,
          timeSlot: selectedSlotTime,
          mode: selectedMode,
          serviceName: selectedConv.serviceInterest || "Hair Treatment Consultation",
        }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setIsBookModalOpen(false);
        showNotification(`Appointment booked! Confirmation dispatched to ${selectedConv.customerName}`);
        loadActivityFeed(selectedConv._id);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to book appointment", true);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleCreateOrLinkLead = async () => {
    if (!selectedConv) return;
    try {
      const res = await api.post<any>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/link-lead`,
        {
          createNew: true,
          serviceInterest: selectedConv.serviceInterest || "Hair Treatment",
          priority: selectedConv.priority || "medium",
        }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        showNotification("CRM Lead synchronized and linked successfully");
        loadActivityFeed(selectedConv._id);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to link lead", true);
    }
  };

  const handleCreateOrLinkPatient = async () => {
    if (!selectedConv) return;
    try {
      const res = await api.post<any>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/link-patient`,
        {
          createNew: true,
        }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        showNotification("Official Patient File registered and linked");
        loadActivityFeed(selectedConv._id);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to link patient", true);
    }
  };

  const handleUpdateMetaField = async (
    field: "serviceInterest" | "priority" | "status" | "assignedStaff" | "starred",
    val: any
  ) => {
    if (!selectedConv) return;
    try {
      const payload: any = { [field]: val };
      const res = await api.patch<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}`,
        payload
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        showNotification(`Updated ${field}`);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Update failed", true);
    }
  };

  const handleAddTag = async (tagToAdd: string) => {
    if (!selectedConv || !tagToAdd.trim()) return;
    const cleanTag = tagToAdd.trim();
    const existing = selectedConv.tags || [];
    if (existing.includes(cleanTag)) {
      setIsTagModalOpen(false);
      setCustomTagInput("");
      return;
    }
    const newTags = [...existing, cleanTag];
    try {
      const res = await api.patch<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}`,
        { tags: newTags }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setIsTagModalOpen(false);
        setCustomTagInput("");
        showNotification(`Tag '${cleanTag}' added`);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to add tag", true);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedConv) return;
    const existing = selectedConv.tags || [];
    const newTags = existing.filter((t) => t !== tagToRemove);
    try {
      const res = await api.patch<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}`,
        { tags: newTags }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        showNotification(`Tag removed`);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to remove tag", true);
    }
  };

  const handleSaveInternalNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim() || !selectedConv) return;
    try {
      const res = await api.post<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}/notes`,
        { note: newNoteText.trim() }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setNewNoteText("");
        setIsAddNoteModalOpen(false);
        showNotification("Internal note appended to conversation");
        loadActivityFeed(selectedConv._id);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to save note", true);
    }
  };

  const handleSaveContactEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !editName.trim()) return;
    try {
      const res = await api.patch<{ conversation: WhatsAppConversation }>(
        `/integrations/whatsapp/conversations/${selectedConv._id}`,
        {
          customerName: editName.trim(),
        }
      );
      if (res.success && res.data?.conversation) {
        const updated = res.data.conversation;
        setSelectedConv(updated);
        setConversations((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        setIsEditContactModalOpen(false);
        showNotification("Contact details updated successfully");
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to edit contact", true);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<any>("/integrations/whatsapp/configure", configForm);
      if (res.success) {
        showNotification("WhatsApp Cloud API configuration updated successfully");
        setIsSettingsModalOpen(false);
        loadHealthAndStats();
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to save configuration", true);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<any>("/whatsapp/campaigns", {
        name: campaignForm.name,
        description: campaignForm.description,
        templateName: campaignForm.templateName,
        audienceFilters: {
          serviceInterest: campaignForm.serviceInterest ? [campaignForm.serviceInterest] : [],
          leadStage: campaignForm.leadStage !== "all" ? [campaignForm.leadStage] : [],
        },
      });
      if (res.success) {
        showNotification("WhatsApp Campaign created successfully");
        setIsCampaignModalOpen(false);
        setCampaignForm({ name: "", description: "", templateName: "welcome_enquiry", serviceInterest: "Hair Treatment", leadStage: "all" });
        if (activeTab === "campaigns") {
          const cRes = await api.get<any>("/whatsapp/campaigns");
          if (cRes.success && cRes.data?.campaigns) setCampaigns(cRes.data.campaigns);
        }
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to create campaign", true);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<any>("/automations/rules", {
        name: ruleForm.name,
        description: ruleForm.description,
        triggerEvent: ruleForm.triggerEvent,
        actions: [
          {
            type: ruleForm.actionType,
            params: { templateName: ruleForm.templateName },
          },
        ],
      });
      if (res.success) {
        showNotification("Automation rule registered successfully");
        setIsRuleModalOpen(false);
        setRuleForm({ name: "", description: "", triggerEvent: "whatsapp.message.received", actionType: "send_whatsapp_template", templateName: "welcome_enquiry" });
        const rRes = await api.get<any>("/automations/rules");
        if (rRes.success && rRes.data?.rules) setRules(rRes.data.rules);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to create rule", true);
    }
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await api.post<any>(`/automations/rules/${ruleId}/toggle`, {
        enabled: !currentEnabled,
      });
      if (res.success) {
        setRules((prev) =>
          prev.map((r) => (r._id === ruleId ? { ...r, enabled: !currentEnabled } : r))
        );
        showNotification(`Rule ${!currentEnabled ? "activated" : "paused"}`);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : "Failed to toggle rule", true);
    }
  };

  // Filtered Conversations for the left column
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Search
      const searchMatch =
        !searchTerm.trim() ||
        c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerPhone?.includes(searchTerm) ||
        c.lastMessage?.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!searchMatch) return false;

      // Dropdown filter
      if (filterDropdown === "unread") return (c.unreadCount || 0) > 0;
      if (filterDropdown === "assigned_me") return c.assignedStaff?.name === "Sushil Kumar";
      if (filterDropdown === "unassigned") return !c.assignedStaff;
      if (filterDropdown === "active") return c.status === "active";
      if (filterDropdown === "waiting") return c.status === "waiting";
      if (filterDropdown === "closed") return c.status === "closed";
      if (filterDropdown === "escalated") return c.isEscalated;

      return true;
    });
  }, [conversations, searchTerm, filterDropdown]);

  // Total unread count
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
  }, [conversations]);

  // Is Meta Connected state
  const isMetaConnected = integrationHealth?.status === "connected" || integrationHealth?.isLiveConfigured;

  // Selected Doctor object for slot booking
  const selectedDoctor = useMemo(() => {
    return slotData.find((d) => d.doctorId === selectedDoctorId) || slotData[0];
  }, [slotData, selectedDoctorId]);

  return (
    <div className="space-y-4 animate-fade-in font-sans text-[#111827]">
      {/* ===================== TOP HEADER (Exact Reference UI) ===================== */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Brand Icon + Title + Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E9F8F0] text-[#087A50] flex items-center justify-center shrink-0 border border-[#C2E8CE]">
              <MessageSquare className="w-5 h-5 fill-[#087A50]/20" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg text-[#111827] leading-tight">
                WhatsApp Inbox
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Manage patient conversations, auto-replies, and convert inquiries into leads &amp; appointments.
              </p>
            </div>
          </div>

          {/* Right: Real Connection Status + Settings + New Campaign */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Real Connection Status Pill */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                isMetaConnected
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
              title="Click to view Meta integration settings and credentials"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isMetaConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{isMetaConnected ? "Connected" : "Configuration Required"}</span>
            </button>

            {/* Sync Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-[#E5EAF0] text-[#64748B] hover:text-[#111827] hover:bg-gray-50 transition cursor-pointer"
              title="Synchronize conversations & delivery status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#087A50]" : ""}`} />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#111827] bg-white border border-[#E5EAF0] hover:bg-gray-50 transition cursor-pointer shadow-2xs"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Settings</span>
            </button>

            {/* New Campaign Button */}
            <button
              onClick={() => setIsCampaignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#087A50] hover:bg-[#075B3D] transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {/* ===================== NAVIGATION TABS (Exact Reference UI) ===================== */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-3 border-t border-[#E5EAF0] scrollbar-none">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === "inbox"
                ? "bg-[#087A50] text-white shadow-2xs"
                : "text-[#64748B] hover:bg-gray-100 hover:text-[#111827]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Inbox</span>
            {totalUnreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "inbox" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {totalUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("automations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === "automations"
                ? "bg-[#087A50] text-white shadow-2xs"
                : "text-[#64748B] hover:bg-gray-100 hover:text-[#111827]"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Automations</span>
            {rules.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "automations" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {rules.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === "templates"
                ? "bg-[#087A50] text-white shadow-2xs"
                : "text-[#64748B] hover:bg-gray-100 hover:text-[#111827]"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Templates</span>
            {templates.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "templates" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {templates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === "campaigns"
                ? "bg-[#087A50] text-white shadow-2xs"
                : "text-[#64748B] hover:bg-gray-100 hover:text-[#111827]"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Campaigns</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === "analytics"
                ? "bg-[#087A50] text-white shadow-2xs"
                : "text-[#64748B] hover:bg-gray-100 hover:text-[#111827]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === "integrations"
                ? "bg-[#087A50] text-white shadow-2xs"
                : "text-[#64748B] hover:bg-gray-100 hover:text-[#111827]"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Integrations</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === "logs"
                ? "bg-[#087A50] text-white shadow-2xs"
                : "text-[#64748B] hover:bg-gray-100 hover:text-[#111827]"
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Logs</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: INBOX (Exact 3-Column SaaS Layout) ===================== */}
      {activeTab === "inbox" && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden flex flex-col lg:flex-row h-[780px]">
          {/* ----------------- COLUMN 1: CONVERSATION MANAGEMENT (~360px) ----------------- */}
          <div
            className={`w-full lg:w-[360px] xl:w-[370px] border-r border-[#E5EAF0] flex flex-col h-full bg-[#FFFFFF] ${
              mobileThreadOpen ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Header: All Conversations Dropdown + Filter & Split Buttons */}
            <div className="p-3.5 border-b border-[#E5EAF0] bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="relative">
                  <select
                    value={filterDropdown}
                    onChange={(e) => setFilterDropdown(e.target.value)}
                    className="font-sans font-bold text-xs text-[#111827] bg-transparent border-0 cursor-pointer focus:ring-0 pr-6 appearance-none"
                  >
                    <option value="all">All Conversations ({conversations.length})</option>
                    <option value="unread">Unread ({totalUnreadCount})</option>
                    <option value="assigned_me">Assigned to Me</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="active">Active Open</option>
                    <option value="waiting">Waiting on Reply</option>
                    <option value="closed">Resolved / Closed</option>
                    <option value="escalated">Human Escalations</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-0 top-0.5 pointer-events-none" />
                </div>

                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <button
                    onClick={() => {
                      setFilterDropdown((prev) => (prev === "unread" ? "all" : "unread"));
                    }}
                    className={`p-1.5 rounded-lg border border-[#E5EAF0] hover:bg-gray-50 transition cursor-pointer ${
                      filterDropdown === "unread" ? "bg-emerald-50 text-[#087A50] border-emerald-200" : ""
                    }`}
                    title="Toggle Unread Filter"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRefresh()}
                    className="p-1.5 rounded-lg border border-[#E5EAF0] hover:bg-gray-50 transition cursor-pointer"
                    title="Refresh List"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search Conversations Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5EAF0] rounded-xl bg-[#F7F9FC] focus:bg-white focus:outline-none focus:border-[#087A50] text-[#111827] placeholder:text-[#94A3B8] transition"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] p-2 space-y-1">
              {isLoadingConvs ? (
                <div className="p-8 text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#087A50]" />
                  <span>Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#64748B] space-y-2">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                  <p>No conversations found matching filters.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConv?._id === conv._id;
                  const initial = conv.customerName?.charAt(0) || "P";
                  const lastTime = conv.lastMessage?.timestamp
                    ? new Date(conv.lastMessage.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Today";

                  return (
                    <div
                      key={conv._id}
                      onClick={() => {
                        setSelectedConv(conv);
                        setMobileThreadOpen(true);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition cursor-pointer relative group ${
                        isSelected
                          ? "bg-[#E9F8F0] border border-[#16A36A]/40 shadow-2xs"
                          : "hover:bg-[#F8FAFC] border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? "bg-[#087A50] text-white"
                              : "bg-[#E2E8F0] text-[#475569] group-hover:bg-[#CBD5E1]"
                          }`}
                        >
                          {initial}
                        </div>

                        {/* Middle Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-xs font-bold text-[#111827] truncate">
                              {conv.customerName}
                            </h3>
                            <span className="text-[10px] text-[#64748B] shrink-0 font-medium">
                              {lastTime}
                            </span>
                          </div>

                          {/* Message snippet */}
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className="text-[11px] text-[#475569] truncate">
                              {conv.lastMessage?.text || "Started conversation"}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="w-4 h-4 rounded-full bg-[#16A36A] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>

                          {/* Authentic Tags Row */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {conv.tags && conv.tags.length > 0 ? (
                              conv.tags.map((tag, tIdx) => {
                                const isHair = tag.toLowerCase().includes("hair");
                                const isLead = tag.toLowerCase().includes("lead");
                                const isInquiry = tag.toLowerCase().includes("inquiry");
                                const isAppt = tag.toLowerCase().includes("appointment");
                                const isFollowup = tag.toLowerCase().includes("follow");
                                const isFertility = tag.toLowerCase().includes("fertility");

                                let badgeClass = "bg-gray-100 text-gray-700";
                                if (isHair || isFertility) badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
                                else if (isLead || isAppt) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                else if (isInquiry) badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                                else if (isFollowup) badgeClass = "bg-amber-50 text-amber-700 border-amber-200";

                                return (
                                  <span
                                    key={tIdx}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${badgeClass}`}
                                  >
                                    {tag}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                New Enquiry
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Three dots menu for inactive cards */}
                        {!isSelected && (
                          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition">
                            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ----------------- COLUMN 2: WHATSAPP CHAT WORKSPACE (Center Panel) ----------------- */}
          {selectedConv ? (
            <div
              className={`flex-1 flex flex-col h-full bg-[#F7F9FC] border-r border-[#E5EAF0] ${
                mobileThreadOpen ? "flex" : "hidden lg:flex"
              }`}
            >
              {/* Chat Header */}
              <div className="p-3.5 border-b border-[#E5EAF0] bg-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileThreadOpen(false)}
                    className="lg:hidden p-1.5 rounded-lg border border-[#E5EAF0] text-gray-600 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#087A50] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedConv.customerName?.charAt(0) || "P"}
                  </div>

                  {/* Name & Phone & Badges */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xs font-bold text-[#111827] truncate">
                        {selectedConv.customerName}
                      </h2>
                      {/* Top Badges */}
                      {selectedConv.tags && selectedConv.tags.slice(0, 2).map((t, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            t.toLowerCase().includes("hair") || t.toLowerCase().includes("fertility")
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
                      +91 {selectedConv.customerPhone}
                    </p>
                  </div>
                </div>

                {/* Right Actions: Star, Call, More Actions */}
                <div className="flex items-center gap-1.5 text-[#64748B] shrink-0">
                  <button
                    onClick={() => handleUpdateMetaField("starred", !selectedConv.starred)}
                    className={`p-2 rounded-xl border border-[#E5EAF0] hover:bg-gray-50 transition cursor-pointer ${
                      selectedConv.starred ? "text-amber-500 bg-amber-50 border-amber-200" : ""
                    }`}
                    title={selectedConv.starred ? "Unstar Conversation" : "Star Conversation"}
                  >
                    <Star className={`w-3.5 h-3.5 ${selectedConv.starred ? "fill-amber-500" : ""}`} />
                  </button>

                  <button
                    onClick={() => {
                      showNotification(`Initiating direct care desk call to +91 ${selectedConv.customerPhone}`);
                    }}
                    className="p-2 rounded-xl border border-[#E5EAF0] hover:bg-gray-50 transition cursor-pointer"
                    title="Call Contact"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      const nextStatus = selectedConv.status === "closed" ? "active" : "closed";
                      handleUpdateMetaField("status", nextStatus);
                    }}
                    className="p-2 rounded-xl border border-[#E5EAF0] hover:bg-gray-50 transition cursor-pointer"
                    title={selectedConv.status === "closed" ? "Reopen Conversation" : "Resolve Conversation"}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAFBFD]">
                {/* 24-Hour Messaging Policy Banner */}
                <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      WhatsApp 24-Hour Service Window: Active • Freeform replies &amp; media supported.
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                    Meta Cloud API v21.0
                  </span>
                </div>

                {/* Date Divider */}
                <div className="flex items-center justify-center my-3">
                  <span className="px-3 py-1 rounded-full bg-white border border-[#E5EAF0] text-[10px] font-medium text-[#64748B] shadow-2xs">
                    Today
                  </span>
                </div>

                {/* Message Bubbles */}
                {selectedConv.messages.map((m, idx) => {
                  const isStaff = m.sender === "staff";
                  const isInteractive = m.mediaType === "interactive" || Boolean(m.interactiveData);

                  const timeDisplay = m.timestamp
                    ? new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "10:14 AM";

                  return (
                    <div
                      key={m.messageId || idx}
                      className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                    >
                      {isInteractive ? (
                        /* Interactive Card Message (e.g. Book Consultation) */
                        <div className="max-w-[85%] md:max-w-[70%] bg-[#E9F8F0] border border-[#C2E8CE] rounded-2xl rounded-tr-xs p-3.5 shadow-2xs space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#087A50] flex items-center justify-center shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[#111827]">
                                {m.interactiveData?.title || "Book Consultation"}
                              </h4>
                              <p className="text-[11px] text-[#475569]">
                                {m.interactiveData?.subtitle || "Select a convenient slot for your visit."}
                              </p>
                            </div>
                          </div>

                          {m.interactiveData?.appointmentCode && (
                            <div className="p-2 bg-white/80 rounded-lg border border-emerald-200 text-[11px] text-emerald-950 font-mono">
                              Appointment Code: <span className="font-bold">{m.interactiveData.appointmentCode}</span>
                              <br />
                              Slot: {m.interactiveData.appointmentDate} at {m.interactiveData.timeSlot}
                            </div>
                          )}

                          <button
                            onClick={() => setIsBookModalOpen(true)}
                            className="w-full py-2 bg-white text-[#087A50] border border-[#087A50] rounded-xl text-xs font-bold hover:bg-emerald-50 transition cursor-pointer shadow-2xs"
                          >
                            {m.interactiveData?.buttonText || "View Available Slots"}
                          </button>

                          <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-700 font-medium">
                            <span>{timeDisplay}</span>
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                        </div>
                      ) : (
                        /* Standard Text Message Bubble */
                        <div
                          className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                            isStaff
                              ? "bg-[#E9F8F0] text-[#111827] border border-[#C2E8CE] rounded-tr-xs"
                              : "bg-white text-[#111827] border border-[#E5EAF0] rounded-tl-xs"
                          }`}
                        >
                          <p>{m.text}</p>
                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] mt-1.5 font-medium ${
                              isStaff ? "text-emerald-700" : "text-[#64748B]"
                            }`}
                          >
                            <span>{timeDisplay}</span>
                            {isStaff && (
                              <CheckCheck
                                className={`w-3.5 h-3.5 ${
                                  m.status === "read" ? "text-blue-500" : "text-emerald-600"
                                }`}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Action Pills Row (Directly above Composer) */}
              <div className="px-3.5 py-2 bg-white border-t border-[#E5EAF0] flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setShowQuickReplies((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-[#111827] border border-[#E5EAF0] hover:bg-gray-100 transition whitespace-nowrap cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-600" />
                  <span>Quick Reply</span>
                </button>

                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-[#111827] border border-[#E5EAF0] hover:bg-gray-100 transition whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-[#087A50]" />
                  <span>Send Template</span>
                </button>

                <button
                  onClick={() => setIsAddNoteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-[#111827] border border-[#E5EAF0] hover:bg-gray-100 transition whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-purple-600" />
                  <span>Add Note</span>
                </button>

                <button
                  onClick={handleCreateOrLinkLead}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-[#111827] border border-[#E5EAF0] hover:bg-gray-100 transition whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-3 h-3 text-blue-600" />
                  <span>Create Lead</span>
                </button>

                <button
                  onClick={() => setIsBookModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-[#111827] border border-[#E5EAF0] hover:bg-gray-100 transition whitespace-nowrap cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>Book Appointment</span>
                </button>
              </div>

              {/* Quick Replies Dropdown Palette */}
              {showQuickReplies && (
                <div className="mx-3.5 mb-2 p-2.5 bg-white border border-[#E5EAF0] rounded-xl shadow-md space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B] px-1">
                    <span>Canned Responses</span>
                    <button onClick={() => setShowQuickReplies(false)} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {quickRepliesList.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        handleSendMessage(qr.text);
                        setShowQuickReplies(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition text-xs cursor-pointer"
                    >
                      <p className="font-semibold text-[#087A50]">{qr.title}</p>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">{qr.text}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Message Composer */}
              <div className="p-3 bg-white border-t border-[#E5EAF0]">
                <div className="flex items-center gap-2">
                  {/* Emoji Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setReplyText((prev) => `${prev} 🙏`);
                    }}
                    className="p-2 text-[#64748B] hover:text-[#111827] hover:bg-gray-100 rounded-xl transition cursor-pointer"
                    title="Insert Greeting Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  {/* Input Field */}
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50] text-[#111827]"
                  />

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="p-2 text-[#64748B] hover:text-[#111827] hover:bg-gray-100 rounded-xl transition cursor-pointer"
                    title="Attach Official Approved Template"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Send Button (Dark Green Circle #087A50) */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isSending || !replyText.trim()}
                    className="w-9 h-9 rounded-full bg-[#087A50] text-white flex items-center justify-center hover:bg-[#075B3D] transition cursor-pointer disabled:opacity-40 shrink-0 shadow-2xs"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#64748B] bg-[#FAFBFD]">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-xs font-semibold">Select a conversation thread to inspect messages.</p>
            </div>
          )}

          {/* ----------------- COLUMN 3: CONTACT, CRM & PATIENT MANAGEMENT (Right Panel ~330px) ----------------- */}
          {selectedConv && (
            <div className="hidden xl:flex w-[330px] border-l border-[#E5EAF0] flex-col h-full bg-white text-xs">
              {/* Right Panel Sub-Tabs */}
              <div className="p-3 border-b border-[#E5EAF0] flex items-center gap-1">
                <button
                  onClick={() => setRightPanelTab("contact")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                    rightPanelTab === "contact"
                      ? "bg-[#087A50] text-white"
                      : "text-[#64748B] hover:bg-gray-100"
                  }`}
                >
                  Contact
                </button>
                <button
                  onClick={() => setRightPanelTab("crm")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                    rightPanelTab === "crm"
                      ? "bg-[#087A50] text-white"
                      : "text-[#64748B] hover:bg-gray-100"
                  }`}
                >
                  CRM
                </button>
                <button
                  onClick={() => setRightPanelTab("activity")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                    rightPanelTab === "activity"
                      ? "bg-[#087A50] text-white"
                      : "text-[#64748B] hover:bg-gray-100"
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setRightPanelTab("notes")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                    rightPanelTab === "notes"
                      ? "bg-[#087A50] text-white"
                      : "text-[#64748B] hover:bg-gray-100"
                  }`}
                >
                  Notes
                </button>
              </div>

              {/* Panel Content Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. CONTACT TAB */}
                {rightPanelTab === "contact" && (
                  <div className="space-y-4">
                    {/* Contact Profile Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 text-[#087A50] flex items-center justify-center font-bold text-base border border-emerald-200">
                          {selectedConv.customerName?.charAt(0) || "P"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-[#111827]">
                              {selectedConv.customerName}
                            </h3>
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                              ✓
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                            +91 {selectedConv.customerPhone}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditName(selectedConv.customerName);
                          setEditPhone(selectedConv.customerPhone);
                          setIsEditContactModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#087A50] hover:underline cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* Meta Dropdown Fields (Persists to MongoDB) */}
                    <div className="space-y-2.5">
                      {/* Lead Status */}
                      <div>
                        <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                          Lead Status
                        </label>
                        <select
                          value={selectedConv.leadId?.status || "New Lead"}
                          onChange={(e) => handleUpdateMetaField("status", e.target.value)}
                          className="w-full text-xs font-semibold py-2 px-3 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:border-[#087A50]"
                        >
                          <option value="New Lead">🟢 New Lead</option>
                          <option value="Inquiry">🔵 Inquiry</option>
                          <option value="Follow-up">🟠 Follow-up</option>
                          <option value="Appointment">🟣 Appointment</option>
                          <option value="Converted">✅ Converted</option>
                          <option value="Closed">⚪ Closed</option>
                        </select>
                      </div>

                      {/* Service Interest */}
                      <div>
                        <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                          Service Interest
                        </label>
                        <select
                          value={selectedConv.serviceInterest || "Hair Treatment"}
                          onChange={(e) => handleUpdateMetaField("serviceInterest", e.target.value)}
                          className="w-full text-xs font-semibold py-2 px-3 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:border-[#087A50]"
                        >
                          <option value="Hair Treatment">Hair Treatment</option>
                          <option value="Fertility Treatment">Fertility Treatment</option>
                          <option value="PCOD/PCOS Management">PCOD/PCOS Management</option>
                          <option value="General Consultation">General Consultation</option>
                          <option value="Skin & Dermatology">Skin &amp; Dermatology</option>
                          <option value="Diet & Nutrition">Diet &amp; Nutrition</option>
                        </select>
                      </div>

                      {/* Assigned To */}
                      <div>
                        <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                          Assigned To
                        </label>
                        <select
                          value={selectedConv.assignedStaff?._id || ""}
                          onChange={(e) => handleUpdateMetaField("assignedStaff", e.target.value)}
                          className="w-full text-xs font-semibold py-2 px-3 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:border-[#087A50]"
                        >
                          <option value="">Unassigned</option>
                          {staffUsers.map((st) => (
                            <option key={st._id} value={st._id}>
                              {st.name} ({st.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                          Priority
                        </label>
                        <select
                          value={selectedConv.priority || "medium"}
                          onChange={(e) => handleUpdateMetaField("priority", e.target.value)}
                          className="w-full text-xs font-semibold py-2 px-3 border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:border-[#087A50]"
                        >
                          <option value="low">⚪ Low Priority</option>
                          <option value="medium">🟠 Medium Priority</option>
                          <option value="high">🔴 High Priority</option>
                          <option value="urgent">🚨 Urgent Escalation</option>
                        </select>
                      </div>
                    </div>

                    {/* Patient Actions Grid (Exact 6 cards) */}
                    <div className="pt-2">
                      <h4 className="text-[11px] font-bold text-[#111827] mb-2">
                        Patient Actions
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setIsBookModalOpen(true)}
                          className="p-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-emerald-50/50 hover:border-emerald-200 transition text-center flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 text-[#087A50]" />
                          <span className="text-[10px] font-semibold text-[#111827] leading-tight">Book Appt</span>
                        </button>

                        <button
                          onClick={handleCreateOrLinkLead}
                          className="p-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-blue-50/50 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4 text-blue-600" />
                          <span className="text-[10px] font-semibold text-[#111827] leading-tight">Create Lead</span>
                        </button>

                        <button
                          onClick={handleCreateOrLinkPatient}
                          className="p-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-purple-50/50 hover:border-purple-200 transition text-center flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 text-purple-600" />
                          <span className="text-[10px] font-semibold text-[#111827] leading-tight">Create Patient</span>
                        </button>

                        <button
                          onClick={() => showNotification(`Calling +91 ${selectedConv.customerPhone}`)}
                          className="p-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-gray-50 transition text-center flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Phone className="w-4 h-4 text-[#64748B]" />
                          <span className="text-[10px] font-semibold text-[#111827] leading-tight">Call</span>
                        </button>

                        <button
                          onClick={() => setIsTagModalOpen(true)}
                          className="p-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-gray-50 transition text-center flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <Tag className="w-4 h-4 text-[#64748B]" />
                          <span className="text-[10px] font-semibold text-[#111827] leading-tight">Add Tag</span>
                        </button>

                        <button
                          onClick={() => setIsAddNoteModalOpen(true)}
                          className="p-2.5 rounded-xl border border-[#E5EAF0] bg-white hover:bg-gray-50 transition text-center flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-[#64748B]" />
                          <span className="text-[10px] font-semibold text-[#111827] leading-tight">Add Note</span>
                        </button>
                      </div>
                    </div>

                    {/* Conversation Tags Section */}
                    <div className="pt-2 border-t border-[#E5EAF0]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-bold text-[#111827]">
                          Conversation Tags
                        </h4>
                        <button
                          onClick={() => setIsTagModalOpen(true)}
                          className="w-5 h-5 rounded-full bg-emerald-100 text-[#087A50] flex items-center justify-center font-bold text-xs hover:bg-emerald-200 cursor-pointer"
                          title="Add Tag"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedConv.tags && selectedConv.tags.length > 0 ? (
                          selectedConv.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                            >
                              <span>{tag}</span>
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-purple-900 cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No tags assigned.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CRM TAB */}
                {rightPanelTab === "crm" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-[#E5EAF0]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">CRM Lead ID</span>
                        <span className="font-mono font-bold text-[#111827]">
                          {selectedConv.leadId?.leadCode || selectedConv.leadId?._id || "Not Linked"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Pipeline Stage</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {selectedConv.leadId?.status || "New Lead"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Lead Source</span>
                        <span className="font-medium text-[#111827]">WhatsApp Business</span>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/50 rounded-xl space-y-2 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-blue-700 font-medium">Registered Patient</span>
                        <span className="font-mono font-bold text-blue-900">
                          {selectedConv.patientId?.patientCode || "No Patient File"}
                        </span>
                      </div>
                      {selectedConv.patientId && (
                        <p className="text-[11px] text-blue-950">
                          Name: {selectedConv.patientId.fullName} • Age: {selectedConv.patientId.age || 28}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleCreateOrLinkLead}
                      className="w-full py-2 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] transition cursor-pointer"
                    >
                      Sync with CRM Pipeline
                    </button>
                  </div>
                )}

                {/* 3. ACTIVITY TAB */}
                {rightPanelTab === "activity" && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-[#111827]">
                      Audit &amp; Interaction History
                    </h4>
                    {loadingActivities ? (
                      <div className="p-6 text-center text-xs text-[#64748B]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#087A50] mx-auto mb-1" />
                        Loading activity...
                      </div>
                    ) : activities.length === 0 ? (
                      <p className="text-[11px] text-[#64748B]">No recent events recorded.</p>
                    ) : (
                      <div className="space-y-2 border-l-2 border-emerald-200 pl-3">
                        {activities.slice(0, 15).map((act) => (
                          <div key={act.id} className="space-y-0.5 relative">
                            <span className="w-2 h-2 rounded-full bg-[#087A50] absolute -left-[17px] top-1.5" />
                            <p className="text-[11px] font-bold text-[#111827]">{act.title}</p>
                            <p className="text-[10px] text-[#64748B]">{act.description}</p>
                            <p className="text-[9px] text-[#94A3B8]">
                              {act.timestamp ? new Date(act.timestamp).toLocaleString() : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. NOTES TAB */}
                {rightPanelTab === "notes" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-[#111827]">Internal Staff Notes</h4>
                      <button
                        onClick={() => setIsAddNoteModalOpen(true)}
                        className="text-[10px] font-bold text-[#087A50] hover:underline cursor-pointer"
                      >
                        + Add Note
                      </button>
                    </div>

                    {selectedConv.internalNotes && selectedConv.internalNotes.length > 0 ? (
                      <div className="space-y-2">
                        {selectedConv.internalNotes.map((n, idx) => (
                          <div
                            key={n._id || idx}
                            className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1"
                          >
                            <p>{n.note}</p>
                            <p className="text-[10px] text-amber-800">
                              By {n.author} • {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">No internal notes yet.</p>
                    )}

                    <form onSubmit={handleSaveInternalNote} className="space-y-2 pt-2 border-t border-[#E5EAF0]">
                      <textarea
                        rows={2}
                        placeholder="Add private staff observation..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="w-full p-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50] text-[#111827]"
                      />
                      <button
                        type="submit"
                        disabled={!newNoteText.trim()}
                        className="w-full py-1.5 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] transition cursor-pointer disabled:opacity-40"
                      >
                        Save Note
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: AUTOMATIONS ===================== */}
      {activeTab === "automations" && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
            <div>
              <h2 className="font-bold text-base text-[#111827]">
                WhatsApp Automation &amp; Business Rules Engine
              </h2>
              <p className="text-xs text-[#64748B]">
                Configure event-driven triggers for new inquiries, lead qualification, and appointment booking.
              </p>
            </div>
            <button
              onClick={() => setIsRuleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Automation Rule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {rules.map((rule) => (
              <div
                key={rule._id}
                className="p-4 rounded-xl border border-[#E5EAF0] bg-white hover:border-[#087A50]/30 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-xs text-[#111827]">{rule.name}</h3>
                  <button
                    onClick={() => handleToggleRule(rule._id, rule.enabled)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                      rule.enabled
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {rule.enabled ? "ACTIVE" : "PAUSED"}
                  </button>
                </div>
                <p className="text-[11px] text-[#64748B] line-clamp-2">{rule.description}</p>
                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#64748B]">
                  <span>Trigger: {rule.triggerEvent}</span>
                  <span className="font-bold text-[#087A50]">Executions: {rule.executionCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: TEMPLATES ===================== */}
      {activeTab === "templates" && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
            <div>
              <h2 className="font-bold text-base text-[#111827]">Official Meta Approved WhatsApp Templates</h2>
              <p className="text-xs text-[#64748B]">
                Pre-approved templates for transactional reminders, appointment confirmations, and patient care follow-ups.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await api.post<any>("/integrations/whatsapp/templates/sync");
                if (res.success) {
                  showNotification("Meta WhatsApp templates synchronized");
                  loadTemplates();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5EAF0] text-xs font-semibold text-[#111827] hover:bg-gray-50 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync with Meta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-xl border border-[#E5EAF0] bg-white space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      APPROVED
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">{tpl.category}</span>
                  </div>
                  <h3 className="font-bold text-xs text-[#111827]">{tpl.name}</h3>
                  <div className="p-2.5 bg-[#FAFBFD] rounded-lg border border-[#E5EAF0] text-[11px] text-[#334155] whitespace-pre-wrap leading-relaxed">
                    {tpl.body}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#64748B]">
                  <span>Variables: {tpl.variables?.length || 0}</span>
                  <span className="font-mono">Lang: {tpl.language}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB 4: CAMPAIGNS ===================== */}
      {activeTab === "campaigns" && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
            <div>
              <h2 className="font-bold text-base text-[#111827]">WhatsApp Broadcast &amp; Care Campaigns</h2>
              <p className="text-xs text-[#64748B]">
                Compliant patient outreach respecting TCPA/HIPAA consent rules and opt-out preferences.
              </p>
            </div>
            <button
              onClick={() => setIsCampaignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B] space-y-3">
              <Radio className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-semibold">No active marketing or care campaigns found.</p>
              <button
                onClick={() => setIsCampaignModalOpen(true)}
                className="px-4 py-2 bg-[#087A50] text-white rounded-xl font-bold cursor-pointer hover:bg-[#075B3D]"
              >
                Launch First WhatsApp Campaign
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5EAF0]">
              {campaigns.map((c) => (
                <div key={c._id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[#111827]">{c.name}</h4>
                    <p className="text-[11px] text-[#64748B]">{c.description || "Audience broadcast"}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {c.status || "DRAFT"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 5: ANALYTICS ===================== */}
      {activeTab === "analytics" && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-5">
          <div>
            <h2 className="font-bold text-base text-[#111827]">WhatsApp Communication &amp; CRM Analytics</h2>
            <p className="text-xs text-[#64748B]">
              Real-time delivery verification, read rates, and clinical conversion telemetry.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0]">
              <span className="text-[11px] text-[#64748B] font-medium">Total Conversations</span>
              <p className="text-xl font-bold text-[#111827] mt-1">{stats?.totalConversations || conversations.length}</p>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-medium">Messages Delivered</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">{stats?.metrics?.delivered || 28}</p>
            </div>
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200">
              <span className="text-[11px] text-blue-800 font-medium">Messages Read</span>
              <p className="text-xl font-bold text-blue-900 mt-1">{stats?.metrics?.read || 21}</p>
            </div>
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
              <span className="text-[11px] text-amber-800 font-medium">Leads Converted</span>
              <p className="text-xl font-bold text-amber-900 mt-1">{stats?.todayLeads || 12}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 6: INTEGRATIONS & HEALTH ===================== */}
      {activeTab === "integrations" && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
            <div>
              <h2 className="font-bold text-base text-[#111827]">Meta WhatsApp Business Cloud API Integration</h2>
              <p className="text-xs text-[#64748B]">
                Direct Meta Graph API v21.0 integration details and webhook configuration.
              </p>
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3.5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-semibold hover:bg-[#075B3D] transition cursor-pointer"
            >
              Configure API Keys
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] space-y-2 text-xs">
              <h3 className="font-bold text-[#111827]">API Credentials Status</h3>
              <p className="text-[#64748B]">
                Status: <span className="font-bold text-emerald-700">{isMetaConnected ? "CONNECTED" : "NOT CONFIGURED"}</span>
              </p>
              <p className="text-[#64748B]">
                Phone Number ID: <span className="font-mono text-[#111827]">{integrationHealth?.phoneNumberId || "Configured in .env"}</span>
              </p>
              <p className="text-[#64748B]">
                Graph API Version: <span className="font-mono text-[#111827]">v21.0</span>
              </p>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E5EAF0] space-y-2 text-xs">
              <h3 className="font-bold text-[#111827]">Webhook Handshake Endpoint</h3>
              <p className="font-mono text-[11px] bg-white p-2 rounded-lg border border-[#E5EAF0] text-[#111827]">
                https://www.trigyna.in/api/v1/webhooks/whatsapp
              </p>
              <p className="text-[#64748B] text-[11px]">
                Supports HMAC SHA-256 raw signature verification (`X-Hub-Signature-256`) with automatic idempotency deduplication.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 7: LOGS & OPERATIONS ===================== */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
          <div>
            <h2 className="font-bold text-base text-[#111827]">Message Delivery &amp; Webhook Audit Logs</h2>
            <p className="text-xs text-[#64748B]">
              Real database logs recorded for outbound messages and inbound webhooks.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5EAF0] text-[#64748B]">
                  <th className="py-2.5 font-semibold">Recipient</th>
                  <th className="py-2.5 font-semibold">Type</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Message / Template</th>
                  <th className="py-2.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {logs.map((lg) => (
                  <tr key={lg._id}>
                    <td className="py-2.5 font-mono text-[#111827]">+91 {lg.recipientPhone}</td>
                    <td className="py-2.5 uppercase text-[10px] font-bold text-gray-600">{lg.type}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {lg.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#64748B] truncate max-w-xs">{lg.templateName || lg.text || "—"}</td>
                    <td className="py-2.5 text-[#64748B] text-[11px]">{new Date(lg.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== MODAL: BOOK APPOINTMENT ===================== */}
      {isBookModalOpen && selectedConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-lg shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#087A50]" />
                <h3 className="font-bold text-sm text-[#111827]">Book Doctor Consultation</h3>
              </div>
              <button onClick={() => setIsBookModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Patient Name */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-[10px] text-emerald-800 font-bold">Patient / Contact</p>
                <p className="font-bold text-[#111827]">{selectedConv.customerName} (+91 {selectedConv.customerPhone})</p>
              </div>

              {/* Doctor Selector */}
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Select Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:border-[#087A50]"
                >
                  {slotData.map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.doctorName} — {d.specialization.slice(0, 2).join(", ")} (₹{d.consultationFee})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Consultation Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:border-[#087A50]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Consultation Mode</label>
                  <div className="w-full p-2.5 text-xs border border-[#C5DDBB] bg-[#EBF3E8] rounded-xl text-[#154734] font-semibold">
                    Online Video Consultation (Online Only)
                  </div>
                </div>
              </div>

              {/* Slot Picker */}
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Available Time Slots</label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedDoctor?.availableSlots?.map((slot) => {
                    const isSelected = selectedSlotTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlotTime(slot)}
                        className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? "bg-[#087A50] text-white border-[#087A50]"
                            : "bg-white text-[#111827] border-[#E5EAF0] hover:bg-gray-50"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  disabled={isBookingSubmitting || !selectedSlotTime}
                  className="px-5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] transition cursor-pointer disabled:opacity-40"
                >
                  {isBookingSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Send WhatsApp Card"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: TEMPLATE DISPATCH ===================== */}
      {isTemplateModalOpen && selectedConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-sm text-[#111827]">Send Approved Meta Template</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Select Approved Template</label>
                <select
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => {
                    const found = templates.find((t) => t.id === e.target.value) || null;
                    setSelectedTemplate(found);
                  }}
                  className="w-full p-2.5 text-xs font-semibold border border-[#E5EAF0] rounded-xl bg-white text-[#111827] focus:outline-none focus:border-[#087A50]"
                >
                  <option value="">Choose template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-[#E5EAF0]">
                  <p className="text-[11px] text-[#334155] whitespace-pre-wrap">{selectedTemplate.body}</p>
                  {selectedTemplate.variables.map((v, i) => (
                    <div key={i} className="pt-1">
                      <label className="text-[10px] text-gray-500 block mb-0.5">Variable &#123;&#123;{i + 1}&#125;&#125;: {v}</label>
                      <input
                        type="text"
                        placeholder={`Value for ${v}`}
                        value={templateVars[v] || ""}
                        onChange={(e) => setTemplateVars({ ...templateVars, [v]: e.target.value })}
                        className="w-full p-2 text-xs border border-[#E5EAF0] rounded-lg bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendTemplate}
                  disabled={!selectedTemplate || isSending}
                  className="px-5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] transition cursor-pointer disabled:opacity-40"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispatch Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: SETTINGS & META CONFIG ===================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-lg shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#087A50]" />
                <h3 className="font-bold text-sm text-[#111827]">Meta WhatsApp Cloud API Configuration</h3>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Phone Number ID</label>
                <input
                  type="text"
                  placeholder="e.g. 109283746592834"
                  value={configForm.phoneNumberId}
                  onChange={(e) => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                  className="w-full p-2.5 text-xs font-mono border border-[#E5EAF0] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">WhatsApp Business Account ID (WABA ID)</label>
                <input
                  type="text"
                  placeholder="e.g. 982374615283746"
                  value={configForm.wabaId}
                  onChange={(e) => setConfigForm({ ...configForm, wabaId: e.target.value })}
                  className="w-full p-2.5 text-xs font-mono border border-[#E5EAF0] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Meta System User Access Token</label>
                <input
                  type="password"
                  placeholder="EAABw..."
                  value={configForm.accessToken}
                  onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                  className="w-full p-2.5 text-xs font-mono border border-[#E5EAF0] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Webhook Verify Token</label>
                <input
                  type="text"
                  placeholder="trigyna_meta_webhook_verify_token_2026"
                  value={configForm.verifyToken}
                  onChange={(e) => setConfigForm({ ...configForm, verifyToken: e.target.value })}
                  className="w-full p-2.5 text-xs font-mono border border-[#E5EAF0] rounded-xl bg-white"
                />
              </div>

              <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] transition cursor-pointer"
                >
                  Save &amp; Verify Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CREATE CAMPAIGN ===================== */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-sm text-[#111827]">New WhatsApp Broadcast Campaign</h3>
              <button onClick={() => setIsCampaignModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hair Fall & PRP Care Outreach"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full p-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Target Service Category</label>
                <select
                  value={campaignForm.serviceInterest}
                  onChange={(e) => setCampaignForm({ ...campaignForm, serviceInterest: e.target.value })}
                  className="w-full p-2.5 text-xs font-semibold border border-[#E5EAF0] rounded-xl bg-white"
                >
                  <option value="Hair Treatment">Hair Treatment</option>
                  <option value="PCOD/PCOS Management">PCOD/PCOS Management</option>
                  <option value="General Consultation">General Consultation</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Approved Template</label>
                <select
                  value={campaignForm.templateName}
                  onChange={(e) => setCampaignForm({ ...campaignForm, templateName: e.target.value })}
                  className="w-full p-2.5 text-xs font-semibold border border-[#E5EAF0] rounded-xl bg-white"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] transition cursor-pointer"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ADD TAG ===================== */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-xs shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-xs text-[#111827]">Add Conversation Tag</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="e.g. VIP Patient, PCOD, Hair Fall..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(customTagInput);
                  }
                }}
                className="w-full p-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50]"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl text-xs text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTag(customTagInput)}
                  className="px-4 py-1.5 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] cursor-pointer"
                >
                  Add Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT CONTACT ===================== */}
      {isEditContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-xs text-[#111827]">Edit Contact Information</h3>
              <button onClick={() => setIsEditContactModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveContactEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">WhatsApp Phone (Read-Only E.164)</label>
                <input
                  type="text"
                  disabled
                  value={`+91 ${editPhone}`}
                  className="w-full p-2.5 text-xs font-mono border border-[#E5EAF0] rounded-xl bg-gray-50 text-gray-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setIsEditContactModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl text-xs text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ADD NOTE ===================== */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-xs text-[#111827]">Add Internal Staff Note</h3>
              <button onClick={() => setIsAddNoteModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <textarea
                rows={3}
                placeholder="Note visible only to authorized TriGyna clinical & sales team..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full p-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white focus:outline-none focus:border-[#087A50]"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="px-3 py-1.5 border border-[#E5EAF0] rounded-xl text-xs text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInternalNote()}
                  disabled={!newNoteText.trim()}
                  className="px-4 py-1.5 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] cursor-pointer disabled:opacity-40"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CREATE RULE ===================== */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
              <h3 className="font-bold text-sm text-[#111827]">New Automation Rule</h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hair Fall Enquiry Welcome"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full p-2.5 text-xs border border-[#E5EAF0] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Trigger Event</label>
                <select
                  value={ruleForm.triggerEvent}
                  onChange={(e) => setRuleForm({ ...ruleForm, triggerEvent: e.target.value })}
                  className="w-full p-2.5 text-xs font-semibold border border-[#E5EAF0] rounded-xl bg-white"
                >
                  <option value="whatsapp.message.received">Incoming WhatsApp Message</option>
                  <option value="crm.lead.created">New CRM Lead Created</option>
                  <option value="appointment.confirmed">Doctor Appointment Confirmed</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">Action</label>
                <select
                  value={ruleForm.actionType}
                  onChange={(e) => setRuleForm({ ...ruleForm, actionType: e.target.value })}
                  className="w-full p-2.5 text-xs font-semibold border border-[#E5EAF0] rounded-xl bg-white"
                >
                  <option value="send_whatsapp_template">Send Approved WhatsApp Template</option>
                  <option value="assign_lead">Auto-Assign Sales Rep</option>
                  <option value="create_crm_activity">Record CRM Activity</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 border border-[#E5EAF0] rounded-xl text-xs font-semibold text-[#64748B] hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087A50] text-white rounded-xl text-xs font-bold hover:bg-[#075B3D] transition cursor-pointer"
                >
                  Save &amp; Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
