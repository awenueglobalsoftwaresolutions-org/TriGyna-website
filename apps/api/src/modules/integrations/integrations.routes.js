const express = require("express");
const {
  getIntegrationsStatus,
  updateIntegrationConfig,
  getMetaCampaigns,
  triggerMetaSync,
  listWhatsAppConversations,
  getWhatsAppConversation,
  sendWhatsAppMessage,
  addWhatsAppInternalNote,
  getWhatsAppTemplates,
} = require("./integrations.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// Status & Configurations (Owner/Admin)
router.get("/status", requireRole("owner", "admin", "crm"), getIntegrationsStatus);
router.patch("/:provider", requireRole("owner", "admin"), updateIntegrationConfig);

// Meta Ads & Attribution
router.get("/meta/campaigns", requireRole("owner", "admin", "crm"), getMetaCampaigns);
router.post("/meta/sync", requireRole("owner", "admin", "crm"), triggerMetaSync);

// WhatsApp Business Unified Inbox
router.get("/whatsapp/conversations", requireRole("owner", "admin", "crm", "reception", "doctor"), listWhatsAppConversations);
router.get("/whatsapp/conversations/:id", requireRole("owner", "admin", "crm", "reception", "doctor"), getWhatsAppConversation);
router.post("/whatsapp/messages", requireRole("owner", "admin", "crm", "reception", "doctor"), sendWhatsAppMessage);
router.post("/whatsapp/conversations/:id/messages", requireRole("owner", "admin", "crm", "reception", "doctor"), sendWhatsAppMessage);
router.post("/whatsapp/conversations/:id/notes", requireRole("owner", "admin", "crm", "reception", "doctor"), addWhatsAppInternalNote);
router.get("/whatsapp/templates", requireRole("owner", "admin", "crm", "reception", "doctor"), getWhatsAppTemplates);

module.exports = router;
