const express = require("express");
const {
  listPackages,
  getPackageByIdOrSlug,
  createPackage,
  updatePackage,
  deletePackage,
  purchasePackage,
  getMyEntitlements,
  getPatientEntitlements,
} = require("./package.controller");
const { optionalAuth, requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Session credit entitlements and ledger
router.get("/entitlements/my", requireAuth, requireRole("patient"), getMyEntitlements);
router.get("/entitlements/patient/:patientId", requireAuth, requireRole("owner", "admin", "doctor", "sales"), getPatientEntitlements);
router.post("/purchase", requireAuth, requireRole("owner", "admin", "sales", "patient"), purchasePackage);

// Public / optional-auth package listing and detail
router.get("/", optionalAuth, listPackages);
router.get("/:idOrSlug", optionalAuth, getPackageByIdOrSlug);

// Management endpoints (Admin, Owner)
router.post("/", requireAuth, requireRole("owner", "admin"), createPackage);
router.patch("/:id", requireAuth, requireRole("owner", "admin"), updatePackage);
router.delete("/:id", requireAuth, requireRole("owner", "admin"), deletePackage);

module.exports = router;

