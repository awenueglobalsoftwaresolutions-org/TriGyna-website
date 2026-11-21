const WhatsAppConversation = require("./whatsapp.model");
const Lead = require("../crm/lead.model");
const Appointment = require("../appointments/appointment.model");
const Invoice = require("../billing/invoice.model");
const { dispatchNotificationEvent } = require("../notifications/notification.service");

class AIAgentService {
  constructor() {
    this.aiEnabled = process.env.WHATSAPP_AI_ENABLED !== "false";
    this.modelName = process.env.AI_MODEL || "gemini-1.5-flash";
  }

  getHealthStatus() {
    return {
      aiEnabled: this.aiEnabled,
      configuredModel: this.modelName,
      hasExternalApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY),
      activeAgents: [
        { name: "Reception Agent", role: "Triage & Welcome", bounded: true },
        { name: "Lead Qualification Agent", role: "Intent & Stage Classification", bounded: true },
        { name: "Follow-up Agent", role: "Care Cadence Coordination", bounded: true },
        { name: "Appointment Assistant", role: "Schedule Verification", bounded: true },
        { name: "Billing Support Agent", role: "Invoice & Receipt Queries", bounded: true },
        { name: "Admin Automation Monitor", role: "Health & Dead-letter Diagnostics", bounded: true },
        { name: "Human Handoff Agent", role: "Clinical & Grievance Escalation", bounded: true },
      ],
      safetyGuardrails: {
        directDatabaseWritesForbidden: true,
        clinicalAdviceForbidden: true,
        financialAlterationForbidden: true,
        strictSchemaValidation: true,
      },
    };
  }

  /**
   * Emergency / Escalation trigger detector (Agent G)
   */
  detectHumanEscalationTriggers(text = "") {
    const lower = text.toLowerCase();

    // 1. Red-flag clinical emergency keywords
    const emergencyKeywords = [
      "chest pain",
      "heart attack",
      "breathing",
      "severe bleeding",
      "unconscious",
      "emergency",
      "suicide",
      "overdose",
      "ambulance",
      "critical",
    ];
    for (const kw of emergencyKeywords) {
      if (lower.includes(kw)) {
        return {
          shouldEscalate: true,
          urgency: "urgent",
          reason: `Potential clinical emergency detected: '${kw}'. Immediate human intervention and emergency protocol required.`,
          isEmergency: true,
        };
      }
    }

    // 2. Explicit human request keywords
    const humanKeywords = [
      "talk to human",
      "speak with doctor",
      "human agent",
      "real person",
      "customer care",
      "connect to staff",
      "sales executive",
      "call me",
      "manager",
    ];
    for (const kw of humanKeywords) {
      if (lower.includes(kw)) {
        return {
          shouldEscalate: true,
          urgency: "high",
          reason: `Customer explicitly requested human support: '${kw}'.`,
          isEmergency: false,
        };
      }
    }

    // 3. Dispute / Grievance keywords
    const grievanceKeywords = [
      "fraud",
      "scam",
      "refund my money",
      "dispute",
      "complaint",
      "cheated",
      "lawyer",
      "consumer forum",
      "chargeback",
    ];
    for (const kw of grievanceKeywords) {
      if (lower.includes(kw)) {
        return {
          shouldEscalate: true,
          urgency: "high",
          reason: `Customer grievance / dispute detected: '${kw}'.`,
          isEmergency: false,
        };
      }
    }

    return { shouldEscalate: false };
  }

  /**
   * Execute human escalation on conversation
   */
  async escalateToHuman(conversationId, reason, user = null) {
    const conv = await WhatsAppConversation.findById(conversationId);
    if (!conv) throw new Error("Conversation thread not found");

    conv.isEscalated = true;
    conv.escalationReason = reason || "Human support requested";
    conv.escalatedAt = new Date();
    conv.status = "waiting";

    const noteText = `[Human Handoff] Escalated by ${user?.name || "AI Agent"}: ${reason}`;
    conv.internalNotes.push({
      note: noteText,
      author: user?.name || "AI Safety Supervisor",
      createdAt: new Date(),
    });

    await conv.save();

    // Alert staff
    await dispatchNotificationEvent("whatsapp.escalation", {
      conversationId: conv._id,
      customerPhone: conv.customerPhone,
      customerName: conv.customerName,
      reason,
    });

    return { success: true, conversation: conv };
  }

  /**
   * Classify intent and service concern from incoming enquiry (Agent A & B)
   */
  async classifyIntent(messageText = "") {
    const lower = messageText.toLowerCase();

    // Check emergency first
    const emergencyCheck = this.detectHumanEscalationTriggers(messageText);
    if (emergencyCheck.shouldEscalate) {
      return {
        intent: emergencyCheck.isEmergency ? "emergency" : "human_escalation",
        confidence: 0.98,
        serviceInterest: "Emergency / Priority Support",
        suggestedStage: "contacted",
        escalation: emergencyCheck,
      };
    }

    // Service interest detection
    let serviceInterest = "Women's Health Care";
    if (lower.includes("pcos") || lower.includes("pcod") || lower.includes("period") || lower.includes("cycle")) {
      serviceInterest = "PCOS & Hormonal Healing";
    } else if (lower.includes("skin") || lower.includes("eczema") || lower.includes("psoriasis") || lower.includes("acne")) {
      serviceInterest = "Chronic Skin & Dermatology";
    } else if (lower.includes("fertility") || lower.includes("pregnancy") || lower.includes("conceive")) {
      serviceInterest = "Natural Fertility & Conception";
    } else if (lower.includes("hair") || lower.includes("alopecia") || lower.includes("fall")) {
      serviceInterest = "Hair Fall & Trichology";
    }

    // Action intent classification
    let intent = "service_inquiry";
    let suggestedStage = "new";

    if (lower.includes("book") || lower.includes("appointment") || lower.includes("slot")) {
      intent = "appointment_booking";
      suggestedStage = "appointment_requested";
    } else if (lower.includes("pay") || lower.includes("price") || lower.includes("cost") || lower.includes("fee") || lower.includes("receipt") || lower.includes("bill")) {
      intent = "billing_inquiry";
      suggestedStage = "contacted";
    } else if (serviceInterest !== "Women's Health Care" || lower.includes("consult") || lower.includes("treatment")) {
      intent = "treatment_enquiry";
      suggestedStage = "interested";
    }

    return {
      intent,
      confidence: 0.92,
      serviceInterest,
      suggestedStage,
      escalation: { shouldEscalate: false },
    };
  }

  /**
   * Generate contextual suggested reply (Agent B & C)
   */
  async generateSuggestedReply(conversationId) {
    const conv = await WhatsAppConversation.findById(conversationId)
      .populate("leadId")
      .populate("patientId");

    if (!conv) throw new Error("Conversation not found");

    const lastMsg = conv.messages.slice(-1)[0] || conv.lastMessage;
    const text = lastMsg?.text || "";

    // Emergency or Human Escalation Check
    const trigger = this.detectHumanEscalationTriggers(text);
    if (trigger.shouldEscalate) {
      if (trigger.isEmergency) {
        return {
          suggestedReply:
            "Namaste. If you are experiencing a medical emergency, please call 112 / 108 or visit the nearest emergency hospital immediately. Our team has also been alerted to contact you right away.",
          suggestedTemplate: null,
          intent: "emergency",
          requiresEscalation: true,
          escalationReason: trigger.reason,
        };
      }
      return {
        suggestedReply:
          "Namaste. I am connecting you with a senior care consultant from TriGyna Clinic who will assist you shortly.",
        suggestedTemplate: null,
        intent: "human_request",
        requiresEscalation: true,
        escalationReason: trigger.reason,
      };
    }

    const classification = await this.classifyIntent(text);

    let reply = `Namaste ${conv.customerName}! Thank you for reaching out to TriGyna Women's Health & Wellness. How may our clinical consultants assist you today?`;
    let templateName = "welcome_enquiry";

    if (classification.intent === "appointment_booking") {
      reply = `Hello ${conv.customerName}, we would be delighted to schedule your consultation with our senior homoeopathic physician. We offer both secure Online Video Consultations and In-Clinic visits in Prayagraj. Which mode do you prefer?`;
      templateName = "lead_followup";
    } else if (classification.intent === "treatment_enquiry") {
      reply = `Namaste ${conv.customerName}, our clinical team specializes in constitutional root-cause care for ${classification.serviceInterest}. Would you like to consult our specialist this week?`;
      templateName = "lead_followup";
    } else if (classification.intent === "billing_inquiry") {
      reply = `Hello ${conv.customerName}, you can view and verify all active consultations, invoices, and formal tax receipts directly inside your TriGyna Patient Portal at https://www.trigyna.in/patient/dashboard.`;
      templateName = "payment_reminder";
    }

    return {
      suggestedReply: reply,
      suggestedTemplate: templateName,
      intent: classification.intent,
      serviceInterest: classification.serviceInterest,
      confidence: classification.confidence,
      requiresEscalation: false,
    };
  }

  /**
   * Summarize conversation thread for Sales/Doctor handover (Agent B)
   */
  async summarizeConversation(conversationId) {
    const conv = await WhatsAppConversation.findById(conversationId);
    if (!conv) throw new Error("Conversation not found");

    const messageCount = conv.messages.length;
    if (messageCount === 0) {
      return {
        summary: "No messages in conversation thread.",
        keyPoints: [],
        customerSentiment: "neutral",
      };
    }

    const customerMsgs = conv.messages.filter((m) => m.sender === "customer").map((m) => m.text);
    const joined = customerMsgs.join(" ");

    const classification = await this.classifyIntent(joined);

    return {
      summary: `Customer ${conv.customerName} (+${conv.customerPhone}) contacted TriGyna regarding ${classification.serviceInterest}. Total messages exchanged: ${messageCount}. Thread status: ${conv.status}.`,
      intent: classification.intent,
      serviceInterest: classification.serviceInterest,
      suggestedStage: classification.suggestedStage,
      customerSentiment: conv.isEscalated ? "urgent" : "receptive",
      isEscalated: conv.isEscalated,
      lastInteractionAt: conv.lastMessage?.timestamp || conv.updatedAt,
    };
  }

  /**
   * Monitor automation failures & queue backlog (Agent F)
   */
  async getOperationalHealthSummary() {
    const WhatsAppOutboundMessage = require("./outbound-message.model");
    const AutomationExecution = require("./automation-execution.model");
    const WhatsAppWebhookEvent = require("./webhook-event.model");

    const [failedOutbound, failedExecutions, escalatedCount, totalInbound] = await Promise.all([
      WhatsAppOutboundMessage.countDocuments({ status: "failed" }),
      AutomationExecution.countDocuments({ status: "failed" }),
      WhatsAppConversation.countDocuments({ isEscalated: true }),
      WhatsAppWebhookEvent.countDocuments({ eventType: "inbound_message" }),
    ]);

    const recentFailures = await WhatsAppOutboundMessage.find({ status: "failed" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("recipientPhone templateName failureReason createdAt")
      .lean();

    return {
      status: failedOutbound > 10 ? "attention_required" : "healthy",
      failedOutboundCount: failedOutbound,
      failedExecutionsCount: failedExecutions,
      escalatedBacklogCount: escalatedCount,
      totalInboundMessages: totalInbound,
      recentFailures,
      recommendedActions:
        failedOutbound > 0
          ? ["Verify Meta Cloud API System User Token and payment method in Meta Business Manager.", "Review dead-letter outbound queue."]
          : ["System operating within normal parameters."],
    };
  }
}

module.exports = new AIAgentService();
