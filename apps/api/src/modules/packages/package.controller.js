const Package = require("./package.model");
const Patient = require("../patients/patient.model");
const { sendSuccess, sendError } = require("../../shared/response");
const { NotFoundError, BadRequestError, ForbiddenError } = require("../../shared/errors");
const {
  grantPackageEntitlement,
  getPatientSessionSummary,
} = require("./session-ledger.service");

// GET /api/v1/packages - List published packages (or all if admin/owner/sales)
async function listPackages(req, res, next) {
  try {
    const isInternal = req.user && ["owner", "admin", "sales", "crm"].includes(req.user.role);
    const filter = isInternal ? {} : { isPublished: true };

    const packages = await Package.find(filter).sort({ pricePaise: 1 });
    return sendSuccess(res, { packages, total: packages.length }, "Packages retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/packages/:idOrSlug
async function getPackageByIdOrSlug(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    let pkg = null;
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      pkg = await Package.findById(idOrSlug);
    }
    if (!pkg) {
      pkg = await Package.findOne({ slug: idOrSlug.toLowerCase() });
    }

    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    return sendSuccess(res, { package: pkg }, "Package details retrieved");
  } catch (err) {
    return next(err);
  }
}

// POST /api/v1/packages - Create Package (Admin / Owner)
async function createPackage(req, res, next) {
  try {
    const {
      name,
      slug,
      description,
      pricePaise,
      totalSessions,
      sessionDurationMinutes,
      validityDays,
      features,
      isPublished,
    } = req.body;

    if (!name || pricePaise === undefined || !totalSessions) {
      throw new BadRequestError("Name, price in paise, and total sessions are required");
    }

    const generatedSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const newPackage = await Package.create({
      name,
      slug: generatedSlug,
      description: description || name,
      pricePaise: Number(pricePaise),
      totalSessions: Number(totalSessions),
      sessionDurationMinutes: Number(sessionDurationMinutes) || 30,
      validityDays: Number(validityDays) || 90,
      features: Array.isArray(features) ? features : [],
      isPublished: isPublished !== false,
    });

    return sendSuccess(res, { package: newPackage }, "Package created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/v1/packages/:id - Update Package (Admin / Owner)
async function updatePackage(req, res, next) {
  try {
    const { id } = req.params;
    const pkg = await Package.findById(id);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    const updates = req.body;
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "createdAt" && key !== "updatedAt") {
        pkg[key] = updates[key];
      }
    });

    await pkg.save();
    return sendSuccess(res, { package: pkg }, "Package updated successfully");
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/v1/packages/:id - Delete Package (Admin / Owner)
async function deletePackage(req, res, next) {
  try {
    const { id } = req.params;
    const pkg = await Package.findByIdAndDelete(id);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }
    return sendSuccess(res, { deleted: true }, "Package deleted successfully");
  } catch (err) {
    return next(err);
  }
}

// Helper to resolve patient record for user
async function resolvePatientForUser(user) {
  let patient = await Patient.findOne({ userId: user._id });
  if (!patient && (user.email || user.phone)) {
    patient = await Patient.findOne({
      $or: [
        ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
        ...(user.phone ? [{ phone: user.phone }] : []),
      ],
    });
    if (patient && !patient.userId) {
      patient.userId = user._id;
      await patient.save();
    }
  }
  return patient;
}

// POST /api/v1/packages/purchase
async function purchasePackage(req, res, next) {
  try {
    const { packageId, patientId, orderId, paymentId } = req.body;
    let targetPatientId = patientId;

    if (req.user.role === "patient") {
      const myPatient = await resolvePatientForUser(req.user);
      if (!myPatient) {
        throw new ForbiddenError("No linked patient chart found for this account");
      }
      targetPatientId = myPatient._id;
    }

    if (!targetPatientId || !packageId) {
      throw new BadRequestError("Both packageId and target patientId are required");
    }

    const entitlement = await grantPackageEntitlement({
      patientId: targetPatientId,
      packageId,
      orderId: orderId || `ORD-${Date.now()}`,
      paymentId: paymentId || `PAY-${Date.now()}`,
      actor: req.user,
    });

    return sendSuccess(res, { entitlement }, "Healthcare package activated successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/packages/entitlements/my
async function getMyEntitlements(req, res, next) {
  try {
    const myPatient = await resolvePatientForUser(req.user);
    if (!myPatient) {
      return sendSuccess(
        res,
        {
          entitlements: [],
          ledger: [],
          aggregate: { totalPurchased: 0, totalAvailable: 0, totalReserved: 0, totalConsumed: 0 },
        },
        "No linked patient chart found"
      );
    }

    const summary = await getPatientSessionSummary(myPatient._id);
    return sendSuccess(res, summary, "Patient session credits and package entitlements loaded");
  } catch (err) {
    return next(err);
  }
}

// GET /api/v1/packages/entitlements/patient/:patientId
async function getPatientEntitlements(req, res, next) {
  try {
    const { patientId } = req.params;
    const summary = await getPatientSessionSummary(patientId);
    return sendSuccess(res, summary, "Patient session credits and package entitlements loaded");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPackages,
  getPackageByIdOrSlug,
  createPackage,
  updatePackage,
  deletePackage,
  purchasePackage,
  getMyEntitlements,
  getPatientEntitlements,
};

