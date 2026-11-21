const marketingService = require("./marketing.service");
const MarketingCampaign = require("./marketing-campaign.model");
const AdvertisingAccount = require("./ad-account.model");
const MarketingAttribution = require("./attribution.model");
const UTMTracking = require("./utm-tracking.model");
const { sendSuccess, sendError } = require("../../shared/response");
const { recordAudit } = require("../audit/audit.service");

// GET /api/v1/marketing/overview
async function getOverview(req, res, next) {
  try {
    const { dateRange } = req.query;
    const overview = await marketingService.getOverviewMetrics({ dateRange });
    return sendSuccess(res, overview, "Marketing overview metrics retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/kpis
async function getKpis(req, res, next) {
  try {
    const { dateRange } = req.query;
    const overview = await marketingService.getOverviewMetrics({ dateRange });
    return sendSuccess(res, overview.kpis, "Marketing KPIs retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/lead-booking-performance
async function getLeadBookingPerformance(req, res, next) {
  try {
    const { dateRange } = req.query;
    const overview = await marketingService.getOverviewMetrics({ dateRange });
    return sendSuccess(res, overview.analytics.performanceTrend, "Lead & booking performance retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/revenue-attribution
async function getRevenueAttribution(req, res, next) {
  try {
    const { dateRange } = req.query;
    const overview = await marketingService.getOverviewMetrics({ dateRange });
    return sendSuccess(res, overview.analytics.roiGauge, "Revenue attribution metrics retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/channel-performance
async function getChannelPerformance(req, res, next) {
  try {
    const overview = await marketingService.getOverviewMetrics();
    return sendSuccess(res, overview.analytics.channels, "Channel performance retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/campaigns
async function listCampaigns(req, res, next) {
  try {
    const { platform, status, search, page, limit } = req.query;
    const result = await marketingService.listCampaigns({ platform, status, search, page, limit });
    return sendSuccess(res, result, "Marketing campaigns retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/campaigns
async function createCampaign(req, res, next) {
  try {
    const userId = req.user?._id;
    const campaign = await marketingService.createCampaign(req.body, userId);
    return sendSuccess(res, campaign, "Campaign created successfully", 201);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/campaigns/:id
async function getCampaignById(req, res, next) {
  try {
    const campaign = await MarketingCampaign.findById(req.params.id);
    if (!campaign) {
      return sendError(res, { statusCode: 404, message: "Campaign not found" });
    }
    return sendSuccess(res, campaign, "Campaign retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/marketing/campaigns/:id
async function updateCampaign(req, res, next) {
  try {
    const campaign = await MarketingCampaign.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!campaign) {
      return sendError(res, { statusCode: 404, message: "Campaign not found" });
    }
    return sendSuccess(res, campaign, "Campaign updated successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/campaigns/:id/submit-approval
async function submitCampaignApproval(req, res, next) {
  try {
    const campaign = await marketingService.submitForApproval(req.params.id, req.user?._id);
    return sendSuccess(res, campaign, "Campaign submitted for approval");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/campaigns/:id/approve
async function approveCampaign(req, res, next) {
  try {
    const campaign = await marketingService.approveCampaign(req.params.id, req.user?._id, req.body.notes);
    return sendSuccess(res, campaign, "Campaign approved successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/campaigns/:id/publish
async function publishCampaign(req, res, next) {
  try {
    const campaign = await marketingService.publishCampaign(req.params.id, req.user?._id);
    return sendSuccess(res, campaign, "Campaign published live successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/campaigns/:id/pause
async function pauseCampaign(req, res, next) {
  try {
    const campaign = await marketingService.pauseCampaign(req.params.id, req.user?._id);
    return sendSuccess(res, campaign, "Campaign paused successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/campaigns/:id/resume
async function resumeCampaign(req, res, next) {
  try {
    const campaign = await marketingService.resumeCampaign(req.params.id, req.user?._id);
    return sendSuccess(res, campaign, "Campaign resumed successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/campaigns/:id/archive
async function archiveCampaign(req, res, next) {
  try {
    const campaign = await marketingService.archiveCampaign(req.params.id, req.user?._id);
    return sendSuccess(res, campaign, "Campaign archived successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/accounts
async function listAdAccounts(req, res, next) {
  try {
    await marketingService.ensureSeedCampaigns();
    const accounts = await AdvertisingAccount.find({}).sort({ platform: 1 });
    const safeAccounts = accounts.map((a) => a.toSafeObject());
    return sendSuccess(res, safeAccounts, "Advertising accounts retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/accounts/connect
async function connectAdAccount(req, res, next) {
  try {
    const { platform, accountName, providerAccountId, accessToken, refreshToken } = req.body;
    if (!platform || !accountName || !providerAccountId) {
      return sendError(res, { statusCode: 400, message: "platform, accountName, and providerAccountId are required" });
    }

    const account = await AdvertisingAccount.create({
      platform,
      accountName,
      providerAccountId,
      encryptedAccessToken: accessToken,
      refreshToken,
      connectionStatus: "connected",
      lastSyncAt: new Date(),
      createdBy: req.user?._id,
    });

    return sendSuccess(res, account.toSafeObject(), "Advertising account connected successfully", 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/accounts/sync
async function syncAdAccounts(req, res, next) {
  try {
    const { provider } = req.body;
    const result = await marketingService.syncAdAccounts(provider || "all");
    return sendSuccess(res, result, "Advertising accounts synchronized successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/attribution
async function listAttributions(req, res, next) {
  try {
    const { platform, page = 1, limit = 20 } = req.query;
    const filter = platform ? { platform } : {};
    const skip = (Math.max(1, page) - 1) * limit;

    const [attributions, total] = await Promise.all([
      MarketingAttribution.find(filter)
        .populate("leadId", "fullName phone email serviceInterest currentStage createdAt")
        .populate("patientId", "fullName patientCode")
        .populate("appointmentId", "appointmentCode appointmentDate startTime")
        .populate("campaignId", "name campaignId platform")
        .sort({ touchpointTimestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MarketingAttribution.countDocuments(filter),
    ]);

    return sendSuccess(res, { attributions, total, page: Number(page), limit: Number(limit) }, "Attribution records retrieved");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/attribution/track
async function trackWebsiteTouchpoint(req, res, next) {
  try {
    const result = await marketingService.trackWebsiteTouchpoint(req.body);
    return sendSuccess(res, result, "Website touchpoint tracked successfully");
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/marketing/utm
async function listUtmLinks(req, res, next) {
  try {
    const links = await UTMTracking.find({}).sort({ createdAt: -1 });
    return sendSuccess(res, links, "UTM tracking links retrieved successfully");
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/utm
async function createUtmLink(req, res, next) {
  try {
    const { destinationUrl, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, title } = req.body;
    if (!destinationUrl || !utmSource || !utmMedium || !utmCampaign) {
      return sendError(res, { statusCode: 400, message: "destinationUrl, utmSource, utmMedium, and utmCampaign are required" });
    }

    const url = new URL(destinationUrl);
    url.searchParams.set("utm_source", utmSource);
    url.searchParams.set("utm_medium", utmMedium);
    url.searchParams.set("utm_campaign", utmCampaign);
    if (utmContent) url.searchParams.set("utm_content", utmContent);
    if (utmTerm) url.searchParams.set("utm_term", utmTerm);

    const trackingCode = `UTM-${Math.floor(1000 + Math.random() * 9000)}`;

    const link = await UTMTracking.create({
      trackingCode,
      title: title || `${utmCampaign} (${utmSource})`,
      destinationUrl,
      fullUrl: url.toString(),
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      createdBy: req.user?._id,
    });

    return sendSuccess(res, link, "UTM link generated successfully", 201);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/marketing/recalculate-revenue
async function recalculateRevenue(req, res, next) {
  try {
    const result = await marketingService.recalculateVerifiedRevenue();
    return sendSuccess(res, result, "Verified revenue and ROAS recalculated successfully");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getKpis,
  getLeadBookingPerformance,
  getRevenueAttribution,
  getChannelPerformance,
  listCampaigns,
  createCampaign,
  getCampaignById,
  updateCampaign,
  submitCampaignApproval,
  approveCampaign,
  publishCampaign,
  pauseCampaign,
  resumeCampaign,
  archiveCampaign,
  listAdAccounts,
  connectAdAccount,
  syncAdAccounts,
  listAttributions,
  trackWebsiteTouchpoint,
  listUtmLinks,
  createUtmLink,
  recalculateRevenue,
};
