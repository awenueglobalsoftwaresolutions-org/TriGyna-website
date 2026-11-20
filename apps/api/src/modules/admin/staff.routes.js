/**
 * TriGyna Admin Centralized Staff Routes
 * Strictly protected for Admin and Owner roles
 */

const express = require("express");
const {
  onboardStaff,
  listStaff,
  getStaffDetail,
  resendInvitation,
  verifyDoctorCredentials,
  updateStaffStatus,
  getStaffOnboardingStatus,
} = require("./staff-onboarding.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("owner", "admin", "super_admin"));

router.post("/onboard", onboardStaff);
router.get("/", listStaff);
router.get("/:id", getStaffDetail);
router.post("/:id/resend-invitation", resendInvitation);
router.patch("/:id/status", updateStaffStatus);
router.patch("/:id/verify-credentials", verifyDoctorCredentials);
router.get("/:id/onboarding", getStaffOnboardingStatus);

module.exports = router;
