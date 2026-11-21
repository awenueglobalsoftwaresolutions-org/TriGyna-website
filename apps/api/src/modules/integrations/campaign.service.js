const Campaign = require("./campaign.model");
const CampaignRecipient = require("./campaign-recipient.model");
const ContactConsent = require("./contact-consent.model");
const whatsappService = require("./whatsapp.service");
const Lead = require("../crm/lead.model");
const Patient = require("../patients/patient.model");

class CampaignService {
  /**
   * Resolve eligible audience based on business filters and strict consent controls
   */
  async resolveAudience(filters = {}) {
    const leadQuery = {};

    if (filters.serviceInterest && filters.serviceInterest.length > 0) {
      leadQuery.serviceInterest = { $in: filters.serviceInterest };
    }

    if (filters.leadStage && filters.leadStage.length > 0) {
      leadQuery.status = { $in: filters.leadStage };
    }

    if (filters.source && filters.source.length > 0) {
      leadQuery.source = { $in: filters.source };
    }

    const leads = await Lead.find(leadQuery).select("fullName phone serviceInterest status").lean();

    // Map unique contacts by phone
    const contactMap = new Map();
    for (const l of leads) {
      const cleanPhone = whatsappService.normalizePhoneNumber(l.phone);
      if (cleanPhone && cleanPhone.length >= 10 && !contactMap.has(cleanPhone)) {
        contactMap.set(cleanPhone, {
          phone: cleanPhone,
          name: l.fullName || "Prospective Patient",
          leadId: l._id,
        });
      }
    }

    // Exclude contacts who have explicitly opted out
    const allPhones = Array.from(contactMap.keys());
    const optOutRecords = await ContactConsent.find({
      phone: { $in: allPhones },
      optInMarketing: false,
    }).select("phone");

    const optedOutSet = new Set(optOutRecords.map((r) => r.phone));

    // Exclude existing registered patients if requested
    if (filters.excludeExistingPatients) {
      const existingPatients = await Patient.find({ phone: { $in: allPhones } }).select("phone");
      for (const p of existingPatients) {
        const pClean = whatsappService.normalizePhoneNumber(p.phone);
        if (pClean) optedOutSet.add(pClean);
      }
    }

    const eligible = [];
    const excludedCount = optedOutSet.size;

    for (const [phone, contact] of contactMap.entries()) {
      if (!optedOutSet.has(phone)) {
        eligible.push(contact);
      }
    }

    return {
      totalFound: contactMap.size,
      eligibleCount: eligible.length,
      excludedCount,
      eligible,
    };
  }

  /**
   * Create a new campaign draft
   */
  async createCampaign({
    name,
    description,
    templateName,
    languageCode = "en_IN",
    templateVariables = [],
    audienceFilters = {},
    scheduledAt = null,
    batchSize = 25,
    rateLimitPerMinute = 60,
    createdBy,
  }) {
    if (!name || !templateName) {
      throw new Error("Campaign name and approved template selection are required");
    }

    const audience = await this.resolveAudience(audienceFilters);

    const campaign = await Campaign.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      templateName: templateName.trim(),
      languageCode,
      templateVariables,
      audienceFilters,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      batchSize: Math.max(5, Math.min(batchSize, 100)),
      rateLimitPerMinute: Math.max(10, Math.min(rateLimitPerMinute, 200)),
      status: "draft",
      stats: {
        targetCount: audience.eligibleCount,
        queuedCount: 0,
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        optOutCount: audience.excludedCount,
        repliesCount: 0,
      },
      createdBy,
    });

    return { campaign, audienceSummary: { eligible: audience.eligibleCount, excluded: audience.excludedCount } };
  }

  /**
   * Approve a campaign (transitions to approved or scheduled)
   */
  async approveCampaign(campaignId, approvedBy) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    if (campaign.status === "completed" || campaign.status === "cancelled") {
      throw new Error(`Cannot approve campaign with status '${campaign.status}'`);
    }

    campaign.status = campaign.scheduledAt && new Date(campaign.scheduledAt) > new Date() ? "scheduled" : "approved";
    campaign.approvedBy = approvedBy;
    campaign.approvalDate = new Date();
    await campaign.save();

    // Populate recipients if not already populated
    const existingRecipients = await CampaignRecipient.countDocuments({ campaignId: campaign._id });
    if (existingRecipients === 0) {
      const audience = await this.resolveAudience(campaign.audienceFilters);
      if (audience.eligible.length > 0) {
        const recipientDocs = audience.eligible.map((contact) => ({
          campaignId: campaign._id,
          contactPhone: contact.phone,
          contactName: contact.name,
          leadId: contact.leadId,
          status: "pending",
        }));
        await CampaignRecipient.insertMany(recipientDocs, { ordered: false }).catch(() => {});
        campaign.stats.targetCount = audience.eligible.length;
        campaign.stats.queuedCount = audience.eligible.length;
        await campaign.save();
      }
    }

    return campaign;
  }

  /**
   * Dispatch a batch of messages for an active campaign
   */
  async dispatchBatch(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");

    if (campaign.status !== "running" && campaign.status !== "approved") {
      return { dispatchedCount: 0, status: campaign.status };
    }

    campaign.status = "running";
    if (!campaign.startedAt) campaign.startedAt = new Date();
    await campaign.save();

    const pendingRecipients = await CampaignRecipient.find({
      campaignId: campaign._id,
      status: "pending",
    }).limit(campaign.batchSize || 25);

    if (pendingRecipients.length === 0) {
      // All recipients processed
      campaign.status = "completed";
      campaign.completedAt = new Date();
      await campaign.save();
      return { dispatchedCount: 0, completed: true };
    }

    let dispatched = 0;
    for (const rec of pendingRecipients) {
      // Re-verify opt-out before dispatching
      const isEligible = await ContactConsent.isEligibleForMarketing(rec.contactPhone);
      if (!isEligible) {
        rec.status = "skipped";
        rec.skipReason = "Opted out prior to dispatch";
        await rec.save();
        campaign.stats.optOutCount = (campaign.stats.optOutCount || 0) + 1;
        continue;
      }

      try {
        const sendResult = await whatsappService.sendTemplateMessage({
          to: rec.contactPhone,
          templateName: campaign.templateName,
          languageCode: campaign.languageCode,
          variables: campaign.templateVariables,
          leadId: rec.leadId,
          initiator: { type: "campaign", campaignId: campaign._id, name: campaign.name },
        });

        rec.status = "sent";
        rec.messageId = sendResult.messages?.[0]?.id;
        rec.sentAt = new Date();
        await rec.save();

        campaign.stats.sentCount = (campaign.stats.sentCount || 0) + 1;
        if (campaign.stats.queuedCount > 0) campaign.stats.queuedCount--;
        dispatched++;
      } catch (err) {
        rec.status = "failed";
        rec.error = { message: err.message };
        await rec.save();
        campaign.stats.failedCount = (campaign.stats.failedCount || 0) + 1;
        if (campaign.stats.queuedCount > 0) campaign.stats.queuedCount--;
      }
    }

    await campaign.save();
    return { dispatchedCount: dispatched, remainingPending: await CampaignRecipient.countDocuments({ campaignId: campaign._id, status: "pending" }) };
  }

  /**
   * Pause an active campaign
   */
  async pauseCampaign(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    campaign.status = "paused";
    await campaign.save();
    return campaign;
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    campaign.status = "running";
    await campaign.save();
    return campaign;
  }

  /**
   * Cancel an active or scheduled campaign
   */
  async cancelCampaign(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    campaign.status = "cancelled";
    await campaign.save();

    // Mark remaining pending recipients as skipped
    await CampaignRecipient.updateMany(
      { campaignId: campaign._id, status: "pending" },
      { $set: { status: "skipped", skipReason: "Campaign was cancelled by administrator" } }
    );

    return campaign;
  }

  /**
   * Get campaign real analytics backed by recipient records
   */
  async getAnalytics(campaignId) {
    const campaign = await Campaign.findById(campaignId).populate("createdBy", "name role").populate("approvedBy", "name role");
    if (!campaign) throw new Error("Campaign not found");

    const [pending, sent, delivered, read, failed, skipped] = await Promise.all([
      CampaignRecipient.countDocuments({ campaignId, status: "pending" }),
      CampaignRecipient.countDocuments({ campaignId, status: "sent" }),
      CampaignRecipient.countDocuments({ campaignId, status: "delivered" }),
      CampaignRecipient.countDocuments({ campaignId, status: "read" }),
      CampaignRecipient.countDocuments({ campaignId, status: "failed" }),
      CampaignRecipient.countDocuments({ campaignId, status: "skipped" }),
    ]);

    return {
      campaign,
      breakdown: {
        totalTarget: campaign.stats.targetCount,
        pending,
        sent,
        delivered,
        read,
        failed,
        skipped,
        deliveryRate: sent > 0 ? (((delivered + read) / sent) * 100).toFixed(1) + "%" : "0.0%",
        readRate: (delivered + read) > 0 ? ((read / (delivered + read)) * 100).toFixed(1) + "%" : "0.0%",
      },
    };
  }
}

module.exports = new CampaignService();

