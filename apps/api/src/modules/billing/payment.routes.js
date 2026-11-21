const express = require("express");
const { requireAuth, optionalAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const { getReceiptByPaymentId, downloadReceiptPdf } = require("./receipt.controller");
const {
  listPayments,
  getPaymentById,
  getPaymentStatus,
  resendPaymentLink,
  sendPaymentReminder,
  initializeCheckoutPayment,
  verifyPayment,
  reconcilePayment,
  reconcileAllPayments,
} = require("./payment.controller");
const { createPaymentLink } = require("./billing.controller");

const router = express.Router();

// Public / Semi-public checkout endpoints
router.post("/initialize-checkout", optionalAuth, initializeCheckoutPayment);
router.post("/verify", optionalAuth, verifyPayment);
router.get("/:id/status", optionalAuth, getPaymentStatus);

// All subsequent management routes require authenticated staff/patients
router.use(requireAuth);

// Generate Payment Link
router.post(
  "/create-link",
  requireRole("owner", "admin", "reception", "sales", "crm", "doctor"),
  createPaymentLink
);

// Payments list & details
router.get("/", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), listPayments);
router.get("/:id", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), getPaymentById);

// Payment link actions
router.post(
  "/:id/resend-link",
  requireRole("owner", "admin", "reception", "sales", "crm"),
  resendPaymentLink
);
router.post(
  "/:id/reminder",
  requireRole("owner", "admin", "reception", "sales", "crm"),
  sendPaymentReminder
);

// Reconciliation
router.post("/reconcile", requireRole("owner", "admin"), reconcileAllPayments);
router.post("/:id/reconcile", requireRole("owner", "admin"), reconcilePayment);

// Direct payment receipt endpoints
router.get("/:paymentId/receipt", getReceiptByPaymentId);
router.get("/:paymentId/receipt/pdf", downloadReceiptPdf);

module.exports = router;
