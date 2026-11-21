const Lead = require("./lead.model");
const User = require("../users/user.model");
const { dispatchNotificationEvent } = require("../notifications/notification.service");
const { recordAudit } = require("../audit/audit.service");

// Authorized partner API keys (includes baseline keys and environment additions)
const envKeys = (process.env.PARTNER_API_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);
const ALLOWED_PARTNER_KEYS = new Set([
  "trigyna_partner_key_live",
  "partner_affiliate_secret_2026",
  "partner_key_1",
  "partner_key_2",
  ...envKeys,
]);

/**
 * Universal CRM Lead Ingestion Engine
 * Unifies Public Website, Meta Ads, WhatsApp Inbound, and External Partner APIs.
 */
class LeadIngestionService {
  /**
   * Normalize contact phone number to clean numeric format
   */
  normalizePhoneNumber(phone) {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.length === 12 && clean.startsWith("91")) {
      clean = clean.slice(2);
    }
    if (clean.length === 11 && clean.startsWith("0")) {
      clean = clean.slice(1);
    }
    return clean;
  }

  /**
   * Automated sales representative assignment (round-robin / lowest load)
   */
  async assignSalesRepresentative() {
    try {
      const salesUsers = await User.find({
        role: { $in: ["sales", "crm"] },
        status: "active",
      }).select("_id name phone email");

      if (!salesUsers || salesUsers.length === 0) {
        return null;
      }

      // Find user with lowest open leads
      const userLeadCounts = await Promise.all(
        salesUsers.map(async (user) => {
          const count = await Lead.countDocuments({
            assignedTo: user._id,
            status: { $in: ["new", "contacted", "interested", "assigned"] },
          });
          return { user, count };
        })
      );

      userLeadCounts.sort((a, b) => a.count - b.count);
      return userLeadCounts[0].user;
    } catch (err) {
      console.warn("[CRM Auto-Assign] Error selecting sales rep:", err.message);
      return null;
    }
  }

  /**
   * Core universal lead ingestion
   */
  async ingestUniversalLead({
    fullName,
    phone,
    email,
    serviceInterest,
    consultationMode = "Online Video Consultation",
    source = "website_enquiry",
    message = "",
    campaign,
    utmSource,
    utmMedium,
    utmCampaign,
    assignedTo,
    priority = "medium",
    actorRole = "system",
    ipAddress,
  }) {
    if (!fullName || !fullName.trim()) {
      throw new Error("Full name is required for lead ingestion");
    }

    const cleanPhone = this.normalizePhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error("A valid 10-digit phone number is required");
    }

    // 1. Idempotency duplicate check: same phone within 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingRecent = await Lead.findOne({
      phone: cleanPhone,
      createdAt: { $gte: tenMinutesAgo },
    });

    if (existingRecent) {
      return {
        success: true,
        isDuplicate: true,
        lead: existingRecent,
        message: "Enquiry already captured recently. Existing lead preserved.",
      };
    }

    // 2. Select sales representative if not pre-assigned
    let representativeId = assignedTo;
    let representativeUser = null;
    if (!representativeId) {
      representativeUser = await this.assignSalesRepresentative();
      if (representativeUser) {
        representativeId = representativeUser._id;
      }
    }

    // 3. Create canonical Lead record
    const newLead = await Lead.create({
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : undefined,
      serviceInterest: serviceInterest || "Women's Health & PCOS",
      consultationMode,
      source,
      message: message ? message.trim() : "",
      campaign,
      utmSource,
      utmMedium,
      utmCampaign,
      assignedTo: representativeId,
      status: "new",
      priority,
      activities: [
        {
          action: "Lead Ingested",
          details: `Source: ${source}${campaign ? ` | Campaign: ${campaign}` : ""}${representativeUser ? ` | Auto-assigned to ${representativeUser.name}` : ""}`,
          createdAt: new Date(),
        },
      ],
      stageHistory: [
        {
          toStage: "new",
          reason: `Initial capture via ${source}`,
          changedAt: new Date(),
        },
      ],
    });

    // 4. Fire multi-channel automation & notification event
    try {
      await dispatchNotificationEvent("lead.created", { lead: newLead });
    } catch (notifErr) {
      console.warn("[CRM Ingestion] Notification dispatch warning:", notifErr.message);
    }

    // 5. Audit record
    await recordAudit({
      actorRole,
      action: "LEAD_INGESTED",
      targetEntity: "Lead",
      targetId: newLead._id.toString(),
      details: {
        source,
        phone: cleanPhone,
        service: newLead.serviceInterest,
        assignedTo: representativeId?.toString(),
      },
      ipAddress,
    });

    return {
      success: true,
      isDuplicate: false,
      lead: newLead,
      message: "Lead successfully ingested and queued in CRM pipeline",
    };
  }

  /**
   * Verify and ingest lead from external authorized partner API
   */
  async ingestExternalPartnerLead(apiKey, payload, ip) {
    if (!apiKey || !ALLOWED_PARTNER_KEYS.has(apiKey)) {
      const err = new Error("Invalid or missing x-api-key authentication for partner lead API");
      err.statusCode = 401;
      throw err;
    }

    return await this.ingestUniversalLead({
      fullName: payload.fullName || payload.name,
      phone: payload.phone,
      email: payload.email,
      serviceInterest: payload.serviceInterest || payload.service,
      consultationMode: payload.consultationMode,
      source: payload.source || "partner_api",
      message: payload.message || payload.notes,
      campaign: payload.campaign || "External Affiliate Network",
      priority: payload.priority || "medium",
      actorRole: "partner_api",
      ipAddress: ip,
    });
  }
}

module.exports = new LeadIngestionService();

