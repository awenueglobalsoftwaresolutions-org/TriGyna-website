const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const {
  getFinancialOverview,
  createPaymentLink,
  listPaymentLinks,
  getPaymentLinkById,
  sendPaymentLink,
  cancelPaymentLink,
  getOrderPaymentStatus,
  getOrderReceipt,
  getOrderInvoice,
  createCreditNote,
  listCreditNotes,
  listLedgerEntries,
  issueInvoice,
  cancelInvoice,
  getGatewaySettings,
} = require("./billing.controller");
const {
  listInvoices,
  getInvoiceById,
  createInvoice,
  recordPayment,
  createPaymentOrder,
  verifyPayment,
  processRefund,
  getFinancialReconciliation,
  reconcileDiscrepancies,
  downloadInvoicePdf,
  handlePaymentWebhook,
} = require("./invoice.controller");
const { listPayments, getPaymentById } = require("./payment.controller");
const { listReceipts, getReceiptById, downloadReceiptPdf } = require("./receipt.controller");

const router = express.Router();

// Webhook endpoints (called by payment gateway without user bearer token)
router.post(
  ["/webhook", "/payments/webhook", "/webhooks/razorpay", "/webhook/razorpay", "/webhooks"],
  handlePaymentWebhook
);

router.use(requireAuth);

// Overview & Analytics
router.get("/overview", requireRole("owner", "admin", "reception", "sales", "crm"), getFinancialOverview);
router.get("/settings", requireRole("owner", "admin"), getGatewaySettings);

// Invoices collection under /billing/invoices
router.get("/invoices", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), listInvoices);
router.post("/invoices", requireRole("owner", "admin", "reception", "sales", "crm"), createInvoice);
router.get("/invoices/:id", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), getInvoiceById);
router.get("/invoices/:id/pdf", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), downloadInvoicePdf);
router.post("/invoices/:id/issue", requireRole("owner", "admin", "reception"), issueInvoice);
router.post("/invoices/:id/cancel", requireRole("owner", "admin"), cancelInvoice);

// Payment Links
router.get("/payment-links", requireRole("owner", "admin", "reception", "sales", "crm", "doctor"), listPaymentLinks);
router.post("/payment-links", requireRole("owner", "admin", "reception", "sales", "crm", "doctor"), createPaymentLink);
router.get("/payment-links/:id", requireRole("owner", "admin", "reception", "sales", "crm", "patient", "doctor"), getPaymentLinkById);
router.post("/payment-links/:id/send", requireRole("owner", "admin", "reception", "sales", "crm", "doctor"), sendPaymentLink);
router.post("/payment-links/:id/cancel", requireRole("owner", "admin", "reception"), cancelPaymentLink);
router.patch("/payment-links/:id/cancel", requireRole("owner", "admin", "reception"), cancelPaymentLink);

// Orders Status & Documents
router.get("/orders/:id/payment-status", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), getOrderPaymentStatus);
router.get("/orders/:id/receipt", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), getOrderReceipt);
router.get("/orders/:id/invoice", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), getOrderInvoice);

// Payments & Receipts
router.get("/payments", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), listPayments);
router.get("/payments/:id", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), getPaymentById);
router.post("/payments/offline", requireRole("owner", "admin", "reception", "sales", "crm"), (req, res, next) => {
  req.params.id = req.body.invoiceId;
  return recordPayment(req, res, next);
});
router.get("/receipts", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), listReceipts);
router.get("/receipts/:id", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), getReceiptById);
router.get("/receipts/:id/pdf", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), downloadReceiptPdf);

// Razorpay Order Creation & Verification
router.post("/razorpay/orders", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), (req, res, next) => {
  req.params.id = req.body.invoiceId;
  return createPaymentOrder(req, res, next);
});
router.post("/razorpay/verify", requireRole("owner", "admin", "reception", "sales", "crm", "patient"), verifyPayment);

// Credit Notes
router.get("/credit-notes", requireRole("owner", "admin", "reception"), listCreditNotes);
router.post("/credit-notes", requireRole("owner", "admin"), createCreditNote);

// Financial Ledger
router.get("/ledger", requireRole("owner", "admin"), listLedgerEntries);

// Reconciliation
router.get("/reconciliation", requireRole("owner", "admin", "reception", "sales", "crm"), getFinancialReconciliation);
router.post("/reconciliation/repair", requireRole("owner", "admin"), reconcileDiscrepancies);
router.post("/reconciliation/run", requireRole("owner", "admin"), reconcileDiscrepancies);

// Refunds
router.post("/refunds", requireRole("owner", "admin"), (req, res, next) => {
  req.params.id = req.body.invoiceId;
  return processRefund(req, res, next);
});

module.exports = router;
