const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const {
  listReceipts,
  getReceiptById,
  getReceiptByInvoiceId,
  getReceiptByPaymentId,
  downloadReceiptPdf,
} = require("./receipt.controller");
const { verifyDocument } = require("./document-verification.controller");

const router = express.Router();

// 1. Public Verification Route (Open for QR Code Scanner)
router.get("/verify/:token", verifyDocument);
router.get("/verify", verifyDocument);

// 2. Protected Routes (Require User Authentication & Role Authorization)
router.use(requireAuth);

const allowedBillingRoles = requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient");

router.get("/", allowedBillingRoles, listReceipts);
router.get("/by-invoice/:invoiceId", allowedBillingRoles, getReceiptByInvoiceId);
router.get("/by-invoice/:invoiceId/pdf", allowedBillingRoles, downloadReceiptPdf);
router.get("/by-payment/:paymentId", allowedBillingRoles, getReceiptByPaymentId);
router.get("/by-payment/:paymentId/pdf", allowedBillingRoles, downloadReceiptPdf);
router.get("/:id", allowedBillingRoles, getReceiptById);
router.get("/:id/pdf", allowedBillingRoles, downloadReceiptPdf);

module.exports = router;
