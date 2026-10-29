const express = require("express");
const {
  verifyWebhook,
  handleMetaWebhook,
  handleWhatsAppWebhook,
} = require("./integrations.controller");

const router = express.Router();

// Meta Lead Ads Webhook
router.get("/meta", verifyWebhook);
router.post("/meta", handleMetaWebhook);

// WhatsApp Business Cloud API Webhook
router.get("/whatsapp", verifyWebhook);
router.post("/whatsapp", handleWhatsAppWebhook);

module.exports = router;
