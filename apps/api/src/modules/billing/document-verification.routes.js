const express = require("express");
const { verifyDocument } = require("./document-verification.controller");
const { documentVerificationLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

// Apply rate limiting specifically designed for public document verification
router.use(documentVerificationLimiter);

// Public routes for document verification by reference (token, invoice number, or receipt number)
router.get("/:reference", verifyDocument);
router.get("/", verifyDocument);

module.exports = router;

