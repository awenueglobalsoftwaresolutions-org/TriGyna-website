/**
 * TriGyna Centralized Staff Onboarding Controller
 */

const staffOnboardingService = require("./staff-onboarding.service");
const { sendSuccess } = require("../../shared/response");
const StaffOnboarding = require("./staff-onboarding.model");
const User = require("../users/user.model");
const Doctor = require("../doctors/doctor.model");
const { NotFoundError } = require("../../shared/errors");

async function onboardStaff(req, res, next) {
  try {
    const result = await staffOnboardingService.onboardStaff({
      adminUser: req.user,
      staffData: req.body,
    });
    return sendSuccess(res, result, "Staff member onboarded successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function listStaff(req, res, next) {
  try {
    const { role, status, page = 1, limit = 50 } = req.query;
    const result = await staffOnboardingService.listStaff({
      role,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    return sendSuccess(res, result, "Staff directory retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getStaffDetail(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .select("-passwordHash")
      .populate("employeeId")
      .populate("doctorId");

    if (!user) {
      throw new NotFoundError("Staff user not found");
    }

    const onboarding = await StaffOnboarding.findOne({ userId: user._id });

    return sendSuccess(
      res,
      {
        user,
        onboarding,
      },
      "Staff details retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

async function resendInvitation(req, res, next) {
  try {
    const result = await staffOnboardingService.resendInvitation({
      adminUser: req.user,
      userId: req.params.id,
    });
    return sendSuccess(res, result, "Account activation invitation resent successfully");
  } catch (err) {
    return next(err);
  }
}

async function verifyDoctorCredentials(req, res, next) {
  try {
    const { registrationNumber, registrationCouncil, notes } = req.body;
    const result = await staffOnboardingService.verifyDoctorCredentials({
      adminUser: req.user,
      doctorId: req.params.id,
      registrationNumber,
      registrationCouncil,
      notes,
    });
    return sendSuccess(res, result, "Doctor medical council credentials verified successfully. Clinical booking enabled.");
  } catch (err) {
    return next(err);
  }
}

async function updateStaffStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    const result = await staffOnboardingService.updateStaffStatus({
      adminUser: req.user,
      userId: req.params.id,
      status,
      reason,
    });
    return sendSuccess(res, result, `Staff account status updated to '${status}' successfully`);
  } catch (err) {
    return next(err);
  }
}

async function getStaffOnboardingStatus(req, res, next) {
  try {
    const onboarding = await StaffOnboarding.findOne({
      $or: [{ userId: req.params.id }, { _id: req.params.id }],
    });
    if (!onboarding) {
      throw new NotFoundError("Onboarding tracking record not found");
    }
    return sendSuccess(res, { onboarding }, "Onboarding tracking status retrieved");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  onboardStaff,
  listStaff,
  getStaffDetail,
  resendInvitation,
  verifyDoctorCredentials,
  updateStaffStatus,
  getStaffOnboardingStatus,
};
