const Campaign = require("./campaign.model");
const CampaignRecipient = require("./campaign-recipient.model");
const campaignService = require("./campaign.service");
const whatsappService = require("./whatsapp.service");
const { sendSuccess, sendError } = require("../../shared/response");
const { ValidationError, NotFoundError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

async function listCampaigns(req, res, next) {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name role email")
      .populate("approvedBy", "name role");

    return sendSuccess(res, { campaigns, total: campaigns.length }, "Campaigns retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createCampaign(req, res, next) {
  try {
    const {
      name,
      description,
      templateName,
      languageCode,
      templateVariables,
      audienceFilters,
      scheduledAt,
      batchSize,
      rateLimitPerMinute,
    } = req.body;

    const result = await campaignService.createCampaign({
      name,
      description,
      templateName,
      languageCode,
      templateVariables,
      audienceFilters,
      scheduledAt,
      batchSize,
      rateLimitPerMinute,
      createdBy: req.user._id,
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CAMPAIGN_CREATED",
      targetEntity: "Campaign",
      targetId: result.campaign._id.toString(),
      details: { name, templateName },
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, "Campaign draft created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function getCampaignDetails(req, res, next) {
  try {
    const { id } = req.params;
    const analytics = await campaignService.getAnalytics(id);
    return sendSuccess(res, analytics, "Campaign details loaded");
  } catch (err) {
    return next(err);
  }
}

async function previewCampaignAudience(req, res, next) {
  try {
    const audience = await campaignService.resolveAudience(req.body.audienceFilters || {});
    return sendSuccess(
      res,
      {
        totalFound: audience.totalFound,
        eligibleCount: audience.eligibleCount,
        excludedCount: audience.excludedCount,
        sample: audience.eligible.slice(0, 10),
      },
      "Audience preview calculated"
    );
  } catch (err) {
    return next(err);
  }
}

async function testSendCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const { testPhoneNumber } = req.body;

    if (!testPhoneNumber) {
      return next(new ValidationError("Test recipient phone number is required"));
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) return next(new NotFoundError("Campaign not found"));

    const result = await whatsappService.sendTemplateMessage({
      to: testPhoneNumber,
      templateName: campaign.templateName,
      languageCode: campaign.languageCode,
      variables: campaign.templateVariables,
      initiator: { type: "test", name: `Test send by ${req.user.name}` },
    });

    return sendSuccess(res, { testResult: result }, `Test message sent to ${testPhoneNumber}`);
  } catch (err) {
    return next(err);
  }
}

async function approveCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const campaign = await campaignService.approveCampaign(id, req.user._id);

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CAMPAIGN_APPROVED",
      targetEntity: "Campaign",
      targetId: campaign._id.toString(),
      details: { name: campaign.name, status: campaign.status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { campaign }, "Campaign approved successfully");
  } catch (err) {
    return next(err);
  }
}

async function scheduleCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    const campaign = await Campaign.findById(id);
    if (!campaign) return next(new NotFoundError("Campaign not found"));

    if (scheduledAt) campaign.scheduledAt = new Date(scheduledAt);
    campaign.status = "scheduled";
    await campaign.save();

    return sendSuccess(res, { campaign }, "Campaign scheduled");
  } catch (err) {
    return next(err);
  }
}

async function dispatchCampaignBatch(req, res, next) {
  try {
    const { id } = req.params;
    const result = await campaignService.dispatchBatch(id);
    return sendSuccess(res, result, `Dispatched batch of ${result.dispatchedCount} messages`);
  } catch (err) {
    return next(err);
  }
}

async function pauseCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const campaign = await campaignService.pauseCampaign(id);
    return sendSuccess(res, { campaign }, "Campaign paused");
  } catch (err) {
    return next(err);
  }
}

async function resumeCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const campaign = await campaignService.resumeCampaign(id);
    return sendSuccess(res, { campaign }, "Campaign resumed");
  } catch (err) {
    return next(err);
  }
}

async function cancelCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const campaign = await campaignService.cancelCampaign(id);
    return sendSuccess(res, { campaign }, "Campaign cancelled");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listCampaigns,
  createCampaign,
  getCampaignDetails,
  previewCampaignAudience,
  testSendCampaign,
  approveCampaign,
  scheduleCampaign,
  dispatchCampaignBatch,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
};

