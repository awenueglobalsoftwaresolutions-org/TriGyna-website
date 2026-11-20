"use strict";

const express = require("express");
const { optionalAuth } = require("../../middleware/auth");
const {
  getPublicCatalogItem,
  createCheckoutOrder,
  getCheckoutOrder,
  validateCheckoutOrder,
  createCheckoutPayment,
  verifyCheckoutPaymentHandler,
  getCheckoutStatus,
  retryCheckoutPayment,
  updateCheckoutPatient,
  getPaymentLinkDetails,
  downloadCheckoutInvoice,
  downloadCheckoutReceipt,
} = require("./checkout.controller");

const router = express.Router();

// Apply optional authentication across checkout routes so authenticated patients are seamlessly recognized
router.use(optionalAuth);

// 1. Catalogue item resolver for checkout preview
router.get("/catalog-item", getPublicCatalogItem);

// 2. Orders Management
router.post("/orders", createCheckoutOrder);
router.post("/verify", verifyCheckoutPaymentHandler);
router.get("/orders/:reference", getCheckoutOrder);
router.post("/orders/:reference/validate", validateCheckoutOrder);
router.post("/orders/:reference/payment", createCheckoutPayment);
router.post("/orders/:reference/verify", verifyCheckoutPaymentHandler);
router.get("/orders/:reference/status", getCheckoutStatus);
router.post("/orders/:reference/retry", retryCheckoutPayment);
router.patch("/orders/:reference/patient", updateCheckoutPatient);

// 3. Document Downloads
router.get("/orders/:reference/invoice", downloadCheckoutInvoice);
router.get("/orders/:reference/receipt", downloadCheckoutReceipt);

// 4. Payment Links
router.get("/payment-links/:reference", getPaymentLinkDetails);
router.post("/payment-links/:reference/verify", verifyCheckoutPaymentHandler);

// 5. Public Direct Secure Reference Resolvers (e.g. /api/v1/public/checkout/:secureReference)
router.get("/:reference", getCheckoutOrder);
router.post("/:reference/validate", validateCheckoutOrder);

module.exports = router;

