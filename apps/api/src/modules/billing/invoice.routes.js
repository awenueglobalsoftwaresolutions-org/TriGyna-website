const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const {
  listInvoices,
  getInvoiceById,
  createInvoice,
  recordPayment,
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  processRefund,
  createExpense,
  listExpenses,
  getFinancialReconciliation,
} = require("./invoice.controller");
const { getReceiptByInvoiceId, downloadReceiptPdf } = require("./receipt.controller");

const router = express.Router();

// Webhook route (can be invoked by payment providers without user session)
router.post("/payments/webhook", handlePaymentWebhook);

// Protected routes
router.use(requireAuth);

// Financial reconciliation report
router.get("/reconciliation", requireRole("owner", "admin", "reception"), getFinancialReconciliation);

// Expenses management
router.get("/expenses", requireRole("owner", "admin", "reception"), listExpenses);
router.post("/expenses", requireRole("owner", "admin", "reception"), createExpense);

// Invoices CRUD & payment flows
router.get("/", requireRole("owner", "admin", "reception", "doctor", "patient"), listInvoices);
router.post("/", requireRole("owner", "admin", "reception"), createInvoice);
router.get("/:id", requireRole("owner", "admin", "reception", "doctor", "patient"), getInvoiceById);
router.get("/:id/pdf", requireRole("owner", "admin", "reception", "doctor", "patient"), downloadReceiptPdf);
router.get("/:invoiceId/receipt", requireRole("owner", "admin", "reception", "doctor", "patient"), getReceiptByInvoiceId);

// Payment endpoints
router.post("/:id/payments", requireRole("owner", "admin", "reception"), recordPayment);
router.post("/:id/payments/offline", requireRole("owner", "admin", "reception"), recordPayment);
router.post("/:id/payments/create-order", requireRole("owner", "admin", "reception", "patient"), createPaymentOrder);
router.post("/payments/verify", requireRole("owner", "admin", "reception", "patient"), verifyPayment);

// Refund processing (Restricted to clinic administration)
router.post("/:id/refund", requireRole("owner", "admin"), processRefund);

module.exports = router;
