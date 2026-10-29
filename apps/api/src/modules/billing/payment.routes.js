const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { getReceiptByPaymentId, downloadReceiptPdf } = require("./receipt.controller");

const router = express.Router();

router.use(requireAuth);

// Direct payment receipt endpoints
router.get("/:paymentId/receipt", getReceiptByPaymentId);
router.get("/:paymentId/receipt/pdf", downloadReceiptPdf);

module.exports = router;
