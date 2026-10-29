const Organization = require("./organization.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

// Get or initialize singleton organization
async function getOrganization(req, res, next) {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: "TriGyna Healthcare & Wellness",
        tagline: "Women | Health | Wellness",
        email: "trigyna.health@gmail.com",
        phone: "+919172772326",
        branches: [
          {
            branchCode: "BR-01",
            name: "Flagship Indiranagar Centre",
            phone: "+919172772326",
            email: "indiranagar@trigyna.com",
            address: "100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038",
            operatingHours: "08:00 - 20:00",
            status: "active",
          },
          {
            branchCode: "BR-02",
            name: "Koramangala Specialty Clinic",
            phone: "+918012345678",
            email: "koramangala@trigyna.com",
            address: "80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034",
            operatingHours: "09:00 - 19:00",
            status: "active",
          },
        ],
        departments: [
          { code: "GYN", name: "Gynecology & Obstetrics", description: "Comprehensive female reproductive healthcare", headOfDepartment: "Dr. Aarav Sharma", status: "active" },
          { code: "DERM", name: "Dermatology & Cosmetology", description: "Skin, hair and aesthetic health", headOfDepartment: "Dr. Harshali Sutar", status: "active" },
          { code: "WELL", name: "Reproductive & Hormonal Wellness", description: "PCOS, fertility and holistic endocrine health", headOfDepartment: "Dr. Rajesh Mehta", status: "active" },
        ],
        services: [
          { code: "SRV-GYN-01", name: "Comprehensive Gynecological Consultation", department: "Gynecology & Obstetrics", durationMinutes: 30, baseFee: 1200, consultationType: "both", status: "active" },
          { code: "SRV-PCOS-01", name: "PCOS & Metabolic Health Evaluation", department: "Reproductive & Hormonal Wellness", durationMinutes: 45, baseFee: 1500, consultationType: "both", status: "active" },
          { code: "SRV-DERM-01", name: "Clinical Dermatology & Hair Analysis", department: "Dermatology & Cosmetology", durationMinutes: 30, baseFee: 1000, consultationType: "both", status: "active" },
          { code: "SRV-ANTE-01", name: "Antenatal Trimester Checkup", department: "Gynecology & Obstetrics", durationMinutes: 30, baseFee: 1400, consultationType: "in_person", status: "active" },
        ],
      });
    }
    return sendSuccess(res, { organization: org }, "Organization profile retrieved");
  } catch (err) {
    return next(err);
  }
}

// Update core organization profile and booking rules
async function updateOrganization(req, res, next) {
  try {
    const { name, tagline, email, phone, website, timezone, currency, workingDays, bookingRules } = req.body;
    let org = await Organization.findOne();
    if (!org) {
      org = new Organization();
    }

    if (name) org.name = name.trim();
    if (tagline !== undefined) org.tagline = tagline.trim();
    if (email) org.email = email.trim();
    if (phone) org.phone = phone.trim();
    if (website) org.website = website.trim();
    if (timezone) org.timezone = timezone.trim();
    if (currency) org.currency = currency.trim();
    if (Array.isArray(workingDays)) org.workingDays = workingDays;
    if (bookingRules && typeof bookingRules === "object") {
      org.bookingRules = {
        ...org.bookingRules,
        ...bookingRules,
      };
    }

    await org.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "ORGANIZATION_SETTINGS_UPDATED",
      targetEntity: "Organization",
      targetId: org._id.toString(),
      details: { name: org.name, currency: org.currency },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { organization: org }, "Organization settings updated successfully");
  } catch (err) {
    return next(err);
  }
}

// Add a Branch
async function addBranch(req, res, next) {
  try {
    const { branchCode, name, phone, email, address, operatingHours, status } = req.body;
    if (!branchCode || !name || !phone || !address) {
      return next(new ValidationError("Branch code, name, phone, and address are required"));
    }

    let org = await Organization.findOne();
    if (!org) org = await Organization.create({});

    const codeExists = org.branches.some((b) => b.branchCode.toUpperCase() === branchCode.trim().toUpperCase());
    if (codeExists) {
      return next(new ValidationError(`Branch with code '${branchCode}' already exists`));
    }

    org.branches.push({
      branchCode: branchCode.trim().toUpperCase(),
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      address: address.trim(),
      operatingHours: operatingHours || "08:00 - 20:00",
      status: status || "active",
    });

    await org.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "BRANCH_CREATED",
      targetEntity: "Branch",
      details: { branchCode, name },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { branches: org.branches }, "Branch added successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// Add a Department
async function addDepartment(req, res, next) {
  try {
    const { code, name, description, headOfDepartment } = req.body;
    if (!code || !name) {
      return next(new ValidationError("Department code and name are required"));
    }

    let org = await Organization.findOne();
    if (!org) org = await Organization.create({});

    const codeExists = org.departments.some((d) => d.code.toUpperCase() === code.trim().toUpperCase());
    if (codeExists) {
      return next(new ValidationError(`Department with code '${code}' already exists`));
    }

    org.departments.push({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description ? description.trim() : "",
      headOfDepartment: headOfDepartment ? headOfDepartment.trim() : "",
      status: "active",
    });

    await org.save();

    return sendSuccess(res, { departments: org.departments }, "Department added successfully", 201);
  } catch (err) {
    return next(err);
  }
}

// Add a Service
async function addService(req, res, next) {
  try {
    const { code, name, department, durationMinutes, baseFee, consultationType } = req.body;
    if (!code || !name || !department || baseFee === undefined) {
      return next(new ValidationError("Service code, name, department, and base fee are required"));
    }

    let org = await Organization.findOne();
    if (!org) org = await Organization.create({});

    const codeExists = org.services.some((s) => s.code.toUpperCase() === code.trim().toUpperCase());
    if (codeExists) {
      return next(new ValidationError(`Service with code '${code}' already exists`));
    }

    org.services.push({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      department: department.trim(),
      durationMinutes: Number(durationMinutes) || 30,
      baseFee: Number(baseFee),
      consultationType: consultationType || "both",
      status: "active",
    });

    await org.save();

    return sendSuccess(res, { services: org.services }, "Service added successfully", 201);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOrganization,
  updateOrganization,
  addBranch,
  addDepartment,
  addService,
};
