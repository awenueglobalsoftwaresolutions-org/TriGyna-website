const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const { sendSuccess } = require("../../shared/response");
const AuditLog = require("./audit.model");

const router = express.Router();

router.use(requireAuth);

router.get("/recent", requireRole("owner", "admin", "reception"), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 25);
    const logs = await AuditLog.find({
      $or: [
        { targetEntity: { $in: ["Patient", "Appointment", "Invoice", "Payment", "Lead"] } },
        { action: { $in: ["CHECK_IN", "APPOINTMENT_BOOKED", "PATIENT_REGISTERED", "INVOICE_CREATED", "PAYMENT_RECORDED", "PAYMENT_RECEIVED", "LEAD_CONVERTED"] } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actorId", "fullName name role");

    const sanitized = logs.map((l) => {
      const o = l.toObject();
      if (o.details) {
        delete o.details.password;
        delete o.details.passwordHash;
        delete o.details.token;
        delete o.details.secret;
      }
      return o;
    });

    return sendSuccess(res, { activities: sanitized, count: sanitized.length }, "Recent operational activities retrieved");
  } catch (err) {
    return next(err);
  }
});

router.use(requireRole("admin")); // Unified: allows both owner and admin

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actorId", "fullName email role");

    return sendSuccess(res, { logs, count: logs.length }, "Audit logs retrieved successfully");
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
