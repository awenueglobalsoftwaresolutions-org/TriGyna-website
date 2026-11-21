const express = require("express");
const {
  listServices,
  getServiceStats,
  listCategories,
  createCategory,
  getServiceByIdOrCodeOrSlug,
  createService,
  updateService,
  deleteService,
  getServiceDoctors,
  assignDoctorsToService,
} = require("./service.controller");
const { optionalAuth, requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Static routes (MUST come before /:id)
router.get("/stats", optionalAuth, getServiceStats);
router.get("/categories", optionalAuth, listCategories);
router.post("/categories", requireAuth, requireRole("owner", "admin"), createCategory);

// Public / optional-auth service catalogue
router.get("/", optionalAuth, listServices);
router.get("/:idOrCodeOrSlug", optionalAuth, getServiceByIdOrCodeOrSlug);
router.get("/:idOrCode/doctors", optionalAuth, getServiceDoctors);

// Admin / Management endpoints
router.post("/", requireAuth, requireRole("owner", "admin"), createService);
router.patch("/:id", requireAuth, requireRole("owner", "admin"), updateService);
router.put("/:id", requireAuth, requireRole("owner", "admin"), updateService);
router.delete("/:id", requireAuth, requireRole("owner", "admin"), deleteService);
router.post("/:id/assign-doctors", requireAuth, requireRole("owner", "admin"), assignDoctorsToService);

module.exports = router;
