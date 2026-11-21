const express = require("express");
const {
  getIntegrationsStatus,
  updateIntegrationConfig,
  testProviderConnection,
  getMetaCampaigns,
  triggerMetaSync,
  listWhatsAppConversations,
  getWhatsAppConversation,
  updateWhatsAppConversation,
  linkConversationLead,
  linkConversationPatient,
  getAvailableDoctorSlots,
  bookConversationAppointment,
  getConversationActivity,
  configureWhatsAppCredentials,
  syncWhatsAppTemplates,
  sendWhatsAppMessage,
  addWhatsAppInternalNote,
  assignWhatsAppConversation,
  updateWhatsAppConversationStatus,
  getWhatsAppTemplates,
  getWhatsAppLogs,
  getWhatsAppStats,
  getContactConsent,
  updateContactConsent,
} = require("./integrations.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// Status & Configurations (Owner/Admin)
router.get("/status", requireRole("owner", "admin", "crm", "sales"), getIntegrationsStatus);
router.patch("/:provider", requireRole("owner", "admin"), updateIntegrationConfig);
router.patch("/:provider/config", requireRole("owner", "admin"), updateIntegrationConfig);
router.post("/:provider/test", requireRole("owner", "admin", "crm", "sales"), testProviderConnection);
router.post("/test/:provider", requireRole("owner", "admin", "crm", "sales"), testProviderConnection);

// Meta Ads & Attribution
router.get("/meta/campaigns", requireRole("owner", "admin", "crm", "sales"), getMetaCampaigns);
router.post("/meta/sync", requireRole("owner", "admin", "crm", "sales"), triggerMetaSync);

// WhatsApp Business Unified Inbox & Analytics
router.get("/whatsapp/stats", requireRole("owner", "admin", "crm", "sales"), getWhatsAppStats);
router.get("/whatsapp/logs", requireRole("owner", "admin", "crm", "sales"), getWhatsAppLogs);
router.get("/whatsapp/available-slots", requireRole("owner", "admin", "crm", "sales", "reception", "doctor"), getAvailableDoctorSlots);
router.post("/whatsapp/configure", requireRole("owner", "admin"), configureWhatsAppCredentials);
router.post("/whatsapp/templates/sync", requireRole("owner", "admin", "crm"), syncWhatsAppTemplates);
router.get("/whatsapp/conversations", requireRole("owner", "admin", "crm", "sales", "reception", "doctor"), listWhatsAppConversations);
router.get("/whatsapp/conversations/:id", requireRole("owner", "admin", "crm", "sales", "reception", "doctor"), getWhatsAppConversation);
router.patch("/whatsapp/conversations/:id", requireRole("owner", "admin", "crm", "sales"), updateWhatsAppConversation);
router.get("/whatsapp/conversations/:id/activity", requireRole("owner", "admin", "crm", "sales", "reception", "doctor"), getConversationActivity);
router.post("/whatsapp/conversations/:id/link-lead", requireRole("owner", "admin", "crm", "sales"), linkConversationLead);
router.post("/whatsapp/conversations/:id/link-patient", requireRole("owner", "admin", "crm", "sales", "reception"), linkConversationPatient);
router.post("/whatsapp/conversations/:id/book-appointment", requireRole("owner", "admin", "crm", "sales", "reception"), bookConversationAppointment);
router.post("/whatsapp/messages", requireRole("owner", "admin", "crm", "sales", "reception"), sendWhatsAppMessage);
router.post("/whatsapp/send", requireRole("owner", "admin", "crm", "sales", "reception"), sendWhatsAppMessage);
router.post("/whatsapp/conversations/:id/messages", requireRole("owner", "admin", "crm", "sales", "reception"), sendWhatsAppMessage);
router.post("/whatsapp/conversations/:id/notes", requireRole("owner", "admin", "crm", "sales", "reception", "doctor"), addWhatsAppInternalNote);
router.patch("/whatsapp/conversations/:id/assign", requireRole("owner", "admin", "crm", "sales"), assignWhatsAppConversation);
router.patch("/whatsapp/conversations/:id/status", requireRole("owner", "admin", "crm", "sales"), updateWhatsAppConversationStatus);
router.get("/whatsapp/templates", requireRole("owner", "admin", "crm", "sales", "reception", "doctor"), getWhatsAppTemplates);

// Consent & Opt-Out Management
router.get("/whatsapp/consent/:phone", requireRole("owner", "admin", "crm", "sales"), getContactConsent);
router.post("/whatsapp/consent/opt-out", requireRole("owner", "admin", "crm", "sales"), updateContactConsent);
router.post("/whatsapp/consent/opt-in", requireRole("owner", "admin", "crm", "sales"), updateContactConsent);

module.exports = router;
