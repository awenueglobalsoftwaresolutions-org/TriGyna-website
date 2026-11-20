const express = require("express");
const { getPendingApprovals } = require("./approvals.controller");
const { reviewLeaveRequest, reviewAttendanceCorrection } = require("../hrms/hrms.controller");
const {
  listRefundRequests,
  approveRefundRequest,
  rejectRefundRequest,
} = require("../billing/order.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("owner", "admin", "hrms", "hr"));

router.get("/", getPendingApprovals);

// HRMS operational approvals
router.patch("/leaves/:id/review", reviewLeaveRequest);
router.patch("/corrections/:id/review", reviewAttendanceCorrection);

// Financial refund approvals
router.get(["/refunds", "/billing/refunds"], listRefundRequests);
router.post(["/refunds/:id/approve", "/billing/refunds/:id/approve"], approveRefundRequest);
router.post(["/refunds/:id/reject", "/billing/refunds/:id/reject"], rejectRefundRequest);

module.exports = router;
