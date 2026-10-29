const jwt = require("jsonwebtoken");
const User = require("../users/user.model");
const env = require("../../config/env");
const { sendSuccess } = require("../../shared/response");
const { UnauthorizedError, ValidationError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
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

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
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

    // Update lastLogin
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
          lastLogin: user.lastLogin,
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
          lastLogin: req.user.lastLogin,
        },
      },
      "Current user context retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  logout,
  getMe,
};
