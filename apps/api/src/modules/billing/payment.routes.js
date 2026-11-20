const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const { getReceiptByPaymentId, downloadReceiptPdf } = require("./receipt.controller");
const { listPayments, getPaymentById, reconcilePayment } = require("./payment.controller");

const router = express.Router();

router.use(requireAuth);

// Payments list & details
router.get("/", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), listPayments);
router.get("/:id", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), getPaymentById);

// Reconcile individual payment (Restricted to owner/admin)
router.post("/:id/reconcile", requireRole("owner", "admin"), reconcilePayment);

// Direct payment receipt endpoints
router.get("/:paymentId/receipt", getReceiptByPaymentId);
router.get("/:paymentId/receipt/pdf", downloadReceiptPdf);

module.exports = router;
