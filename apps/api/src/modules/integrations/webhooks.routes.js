const express = require("express");
const {
  verifyWebhook,
  handleMetaWebhook,
  handleWhatsAppWebhook,
} = require("./integrations.controller");
const { handlePaymentWebhook } = require("../billing/invoice.controller");

const router = express.Router();

// Razorpay Payment Gateway Webhook
router.post("/razorpay", handlePaymentWebhook);
router.post("/payments/:provider", handlePaymentWebhook);
router.post("/payments", handlePaymentWebhook);

// Meta Lead Ads Webhook
router.get("/meta", verifyWebhook);
router.post("/meta", handleMetaWebhook);

// WhatsApp Business Cloud API Webhook
router.get("/whatsapp", verifyWebhook);
router.post("/whatsapp", handleWhatsAppWebhook);

module.exports = router;
