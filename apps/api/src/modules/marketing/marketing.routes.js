const express = require("express");
const {
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
} = require("./marketing.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Allow public website touchpoint tracking (first-party tracking snippet)
router.post("/attribution/track", trackWebsiteTouchpoint);

// Authenticated routes
router.use(requireAuth);

// Analytics & Overview
router.get("/overview", requireRole("owner", "admin", "crm", "sales"), getOverview);
router.get("/kpis", requireRole("owner", "admin", "crm", "sales"), getKpis);
router.get("/lead-booking-performance", requireRole("owner", "admin", "crm", "sales"), getLeadBookingPerformance);
router.get("/revenue-attribution", requireRole("owner", "admin", "crm", "sales"), getRevenueAttribution);
router.get("/channel-performance", requireRole("owner", "admin", "crm", "sales"), getChannelPerformance);

// Campaigns Lifecycle
router.get("/campaigns", requireRole("owner", "admin", "crm", "sales"), listCampaigns);
router.post("/campaigns", requireRole("owner", "admin"), createCampaign);
router.get("/campaigns/:id", requireRole("owner", "admin", "crm", "sales"), getCampaignById);
router.patch("/campaigns/:id", requireRole("owner", "admin"), updateCampaign);
router.post("/campaigns/:id/submit-approval", requireRole("owner", "admin", "crm"), submitCampaignApproval);
router.post("/campaigns/:id/approve", requireRole("owner", "admin"), approveCampaign);
router.post("/campaigns/:id/publish", requireRole("owner", "admin"), publishCampaign);
router.post("/campaigns/:id/pause", requireRole("owner", "admin"), pauseCampaign);
router.post("/campaigns/:id/resume", requireRole("owner", "admin"), resumeCampaign);
router.post("/campaigns/:id/archive", requireRole("owner", "admin"), archiveCampaign);

// Ad Accounts & Integrations
router.get("/accounts", requireRole("owner", "admin", "crm", "sales"), listAdAccounts);
router.post("/accounts/connect", requireRole("owner", "admin"), connectAdAccount);
router.post("/accounts/sync", requireRole("owner", "admin", "crm", "sales"), syncAdAccounts);

// Attribution & UTM Tracking
router.get("/attribution", requireRole("owner", "admin", "crm", "sales"), listAttributions);
router.get("/utm", requireRole("owner", "admin", "crm", "sales"), listUtmLinks);
router.post("/utm", requireRole("owner", "admin", "crm"), createUtmLink);

// Financial Reconciliation & ROAS
router.post("/recalculate-revenue", requireRole("owner", "admin"), recalculateRevenue);

module.exports = router;
