const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../users/user.model");
const env = require("../../config/env");
const { sendSuccess } = require("../../shared/response");
const { UnauthorizedError, ValidationError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { getEffectivePermissions } = require("../../config/permissions");

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      authVersion: user.authVersion || 1,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return next(new ValidationError("Both identifier (email or phone) and password are required"));
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Query user by email or phone, including passwordHash
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { phone: identifier.trim() }],
    }).select("+passwordHash");

    if (!user) {
      await recordAudit({
        action: "AUTH_LOGIN_FAILED",
        targetEntity: "User",
        details: { identifier: cleanIdentifier, reason: "User not found" },
        status: "FAILURE",
        ipAddress: req.ip,
      });
      return next(new UnauthorizedError("Invalid credentials"));
    }

    if (user.status !== "active") {
      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "AUTH_LOGIN_BLOCKED",
        targetEntity: "User",
        targetId: user._id.toString(),
        details: { status: user.status },
        status: "FAILURE",
        ipAddress: req.ip,
      });
      return next(new UnauthorizedError(`Account is ${user.status}. Please contact an administrator.`));
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return next(new ForbiddenError(`Account temporarily locked due to excessive failed attempts. Try again in ${waitMinutes} minute(s).`));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "AUTH_LOGIN_FAILED",
        targetEntity: "User",
        targetId: user._id.toString(),
        details: { reason: "Password mismatch" },
        status: "FAILURE",
        ipAddress: req.ip,
      });
      return next(new UnauthorizedError("Invalid credentials"));
    }

    // Reset failed attempts & update lastLogin
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "AUTH_LOGIN_SUCCESS",
      targetEntity: "User",
      targetId: user._id.toString(),
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          authVersion: user.authVersion || 1,
          permissions: getEffectivePermissions(user),
          lastLogin: user.lastLogin,
          mustChangePassword: user.mustChangePassword || false,
        },
      },
      "Authentication successful"
    );
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await recordAudit({
        actorId: req.user._id,
        actorRole: req.user.role,
        action: "AUTH_LOGOUT",
        targetEntity: "User",
        targetId: req.user._id.toString(),
        ipAddress: req.ip,
      });
    }

    return sendSuccess(res, {}, "Logged out successfully");
  } catch (err) {
    return next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return sendSuccess(
      res,
      {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          status: req.user.status,
          authVersion: req.user.authVersion || 1,
          permissions: getEffectivePermissions(req.user),
          lastLogin: req.user.lastLogin,
          mustChangePassword: req.user.mustChangePassword || false,
          preferences: req.user.preferences || {},
        },
      },
      "Current user context retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone, email, preferences, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+passwordHash");

    if (!user) {
      return next(new UnauthorizedError("User session not found"));
    }

    if (name && name.trim()) user.name = name.trim();
    if (phone && phone.trim()) user.phone = phone.trim();
    if (email && email.trim()) user.email = email.trim().toLowerCase();
    if (preferences && typeof preferences === "object") {
      user.preferences = { ...(user.preferences || {}), ...preferences };
    }

    if (newPassword) {
      if (!currentPassword) {
        return next(new ValidationError("Current password is required to set a new password"));
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return next(new ValidationError("Current password does not match"));
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      user.mustChangePassword = false;
    }

    await user.save();

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "USER_PROFILE_UPDATED",
      targetEntity: "User",
      targetId: user._id.toString(),
      details: { name: user.name, phone: user.phone },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          lastLogin: user.lastLogin,
          preferences: user.preferences,
        },
      },
      "Profile updated successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/auth/verify-activation-token?token=...
 * Validates whether an activation token is valid, unexpired, and unused
 */
async function verifyActivationToken(req, res, next) {
  try {
    const rawToken = req.query.token;
    if (!rawToken || typeof rawToken !== "string") {
      return next(new ValidationError("Activation token is required"));
    }

    const StaffInvitation = require("../admin/staff-invitation.model");
    const tokenHash = StaffInvitation.hashToken(rawToken);
    const invitation = await StaffInvitation.findOne({ tokenHash });

    if (!invitation) {
      return next(new ValidationError("Invalid or unrecognized activation token"));
    }

    if (invitation.invitationStatus === "used" || invitation.usedAt) {
      return next(new ValidationError("This activation token has already been used. Please log in."));
    }

    if (invitation.invitationStatus === "revoked") {
      return next(new ValidationError("This activation link has been revoked by administration."));
    }

    if (new Date() > invitation.expiresAt) {
      return next(new ValidationError("This activation link has expired. Please contact administration."));
    }

    const user = await User.findById(invitation.userId).select("name email phone role");
    if (!user) {
      return next(new ValidationError("Associated staff account not found"));
    }

    return sendSuccess(
      res,
      {
        valid: true,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      "Activation token is valid"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/activate-account
 * Consumes activation token and securely establishes password
 */
async function activateAccount(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;
    const staffOnboardingService = require("../admin/staff-onboarding.service");
    const result = await staffOnboardingService.activateAccount({
      rawToken: token,
      password,
      confirmPassword,
    });
    return sendSuccess(res, result, "Account activated successfully. You can now log in.");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  updateProfile,
  verifyActivationToken,
  activateAccount,
};
