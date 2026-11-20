const express = require("express");
const {
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
} = require("./campaign.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRole("owner", "admin", "crm"), listCampaigns);
router.post("/", requireRole("owner", "admin", "crm"), createCampaign);
router.get("/:id", requireRole("owner", "admin", "crm"), getCampaignDetails);
router.get("/:id/analytics", requireRole("owner", "admin", "crm"), getCampaignDetails);
router.post("/preview", requireRole("owner", "admin", "crm"), previewCampaignAudience);
router.post("/:id/preview", requireRole("owner", "admin", "crm"), previewCampaignAudience);
router.post("/:id/test-send", requireRole("owner", "admin"), testSendCampaign);
router.post("/:id/approve", requireRole("owner", "admin"), approveCampaign);
router.post("/:id/schedule", requireRole("owner", "admin"), scheduleCampaign);
router.post("/:id/dispatch-batch", requireRole("owner", "admin"), dispatchCampaignBatch);
router.post("/:id/pause", requireRole("owner", "admin"), pauseCampaign);
router.post("/:id/resume", requireRole("owner", "admin"), resumeCampaign);
router.post("/:id/cancel", requireRole("owner", "admin"), cancelCampaign);

module.exports = router;

