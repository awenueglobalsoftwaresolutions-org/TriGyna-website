const express = require("express");
const {
  suggestReply,
  summarizeConversation,
  classifyIntent,
  escalateConversation,
  getAIStatus,
  getAdminMonitorReport,
} = require("./ai.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

router.get("/whatsapp/status", requireRole("owner", "admin", "crm", "sales"), getAIStatus);
router.get("/whatsapp/monitor", requireRole("owner", "admin"), getAdminMonitorReport);
router.post("/whatsapp/suggest-reply", requireRole("owner", "admin", "crm", "sales"), suggestReply);
router.post("/whatsapp/summarize", requireRole("owner", "admin", "crm", "sales", "doctor"), summarizeConversation);
router.post("/whatsapp/classify-intent", requireRole("owner", "admin", "crm", "sales"), classifyIntent);
router.post("/whatsapp/escalate", requireRole("owner", "admin", "crm", "sales", "doctor"), escalateConversation);

module.exports = router;

