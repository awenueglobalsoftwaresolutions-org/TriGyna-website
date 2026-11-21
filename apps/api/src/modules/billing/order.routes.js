const express = require("express");
const {
  createOrder,
  listOrders,
  getOrderById,
  getPublicCheckoutOrder,
  createOrderPaymentAttempt,
  createCheckoutPaymentAttempt,
  verifyOrderPayment,
  verifyCheckoutPayment,
  getOrderPaymentStatus,
  createOrderRefundRequest,
} = require("./order.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Public checkout endpoints (token-authenticated via checkoutToken)
router.get("/checkout/:token", getPublicCheckoutOrder);
router.post("/checkout/:token/payment-attempts", createCheckoutPaymentAttempt);
router.post("/checkout/:token/verify-payment", verifyCheckoutPayment);

// Protected routes
router.use(requireAuth);

router.get("/", requireRole("owner", "admin", "sales", "crm", "patient"), listOrders);
router.post("/", requireRole("owner", "admin", "sales", "crm", "patient"), createOrder);

router.get("/:id", requireRole("owner", "admin", "sales", "crm", "patient"), getOrderById);
router.post("/:id/payment-attempts", requireRole("owner", "admin", "sales", "crm", "patient"), createOrderPaymentAttempt);
router.post("/:id/verify-payment", requireRole("owner", "admin", "sales", "crm", "patient"), verifyOrderPayment);
router.post("/:id/payments/verify", requireRole("owner", "admin", "sales", "crm", "patient"), verifyOrderPayment);
router.get("/:id/payment-status", requireRole("owner", "admin", "sales", "crm", "patient"), getOrderPaymentStatus);

// Patient Refund Request
router.post("/:id/refund-requests", requireRole("owner", "admin", "patient"), createOrderRefundRequest);

module.exports = router;

