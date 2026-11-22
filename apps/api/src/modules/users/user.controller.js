const User = require("./user.model");
const AuditLog = require("../audit/audit.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { safeRegex } = require("../../shared/regex.utils");
const { PERMISSIONS, ROLE_PERMISSIONS, getEffectivePermissions } = require("../../config/permissions");
const emailService = require("../email/email.service");

async function listUsers(req, res, next) {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
      }
    }

    const rawUsers = await User.find(query).sort({ createdAt: -1 }).select("-passwordHash");
    const users = rawUsers.map((u) => {
      const plain = u.toObject();
      plain.effectivePermissions = getEffectivePermissions(u);
      return plain;
    });

    return sendSuccess(res, { users, count: users.length }, "Users retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, phone, password, role = "patient", status = "active" } = req.body;

    if (!name || !phone || !password) {
      return next(new ValidationError("Name, phone, and password are required"));
    }

    // Check if phone or email is already taken
    const existing = await User.findOne({
      $or: [{ phone: phone.trim() }, ...(email ? [{ email: email.trim().toLowerCase() }] : [])],
    });

    if (existing) {
      return next(new ValidationError("A user with this phone or email already exists"));
    }

    // Non-owner cannot create an owner
    if (role === "owner" && req.user.role !== "owner") {
      return next(new ForbiddenError("Only an existing Owner can provision another Owner"));
    }

    const passwordHash = await User.hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone.trim(),
      passwordHash,
      role,
      status,
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "USER_CREATED",
      targetEntity: "User",
      targetId: newUser._id.toString(),
      details: { name: newUser.name, role: newUser.role, phone: newUser.phone },
      ipAddress: req.ip,
    });

    // Automated Registration Email Dispatch
    if (newUser.email) {
      try {
        let templateId = "staff_onboarding_invitation";
        if (["owner", "admin", "super_admin"].includes(newUser.role)) {
          templateId = "admin_registration";
        } else if (newUser.role === "patient") {
          templateId = "patient_welcome_registration";
        }

        await emailService.sendTemplateEmail({
          to: newUser.email,
          templateId,
          data: {
            name: newUser.name,
            role: newUser.role,
            email: newUser.email,
            phone: newUser.phone,
            permissions: getEffectivePermissions(newUser),
          },
          recipientId: newUser._id,
        });

        // Notify creating admin
        if (req.user?.email && req.user.email.toLowerCase() !== newUser.email.toLowerCase()) {
          emailService.sendTemplateEmail({
            to: req.user.email,
            templateId: "admin_new_user_registered",
            data: {
              name: newUser.name,
              role: newUser.role,
              email: newUser.email,
              phone: newUser.phone,
            },
          }).catch(() => {});
        }
      } catch (emailErr) {
        console.warn("[User Registration] Email dispatch notice:", emailErr.message);
      }
    }

    return sendSuccess(
      res,
      {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
          createdAt: newUser.createdAt,
        },
      },
      "User created successfully",
      201
    );
  } catch (err) {
    return next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return next(new NotFoundError("User not found"));
    }
    const plain = user.toObject();
    plain.effectivePermissions = getEffectivePermissions(user);
    return sendSuccess(res, { user: plain }, "User retrieved");
  } catch (err) {
    return next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { name, role, status, phone, email } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return next(new NotFoundError("User not found"));
    }

    // Role escalation protection
    if (role && role !== targetUser.role) {
      if (req.user.role !== "owner") {
        return next(new ForbiddenError("Only the Owner can change user roles"));
      }
    }

    // Cannot demote owner unless you are owner
    if (targetUser.role === "owner" && role && role !== "owner" && req.user.role !== "owner") {
      return next(new ForbiddenError("Cannot demote an Owner account"));
    }

    // Protect sole active Super Admin from accidental demotion or deactivation
    if (targetUser.role === "owner" && ((role && role !== "owner") || (status && status !== "active"))) {
      const otherActiveOwners = await User.countDocuments({
        role: "owner",
        status: "active",
        _id: { $ne: targetUser._id },
      });
      if (otherActiveOwners === 0) {
        return next(
          new ValidationError(
            "Action rejected: Cannot demote or deactivate the organization's sole active Super Admin account"
          )
        );
      }
    }

    const roleOrStatusChanged = (role && role !== targetUser.role) || (status && status !== targetUser.status);
    if (roleOrStatusChanged) {
      targetUser.authVersion = (targetUser.authVersion || 1) + 1;
      if (!targetUser.securityHistory) targetUser.securityHistory = [];
      targetUser.securityHistory.push({
        action: "ROLE_OR_STATUS_CHANGED",
        performedBy: req.user._id,
        details: {
          previousRole: targetUser.role,
          newRole: role,
          previousStatus: targetUser.status,
          newStatus: status,
        },
        timestamp: new Date(),
      });
    }

    if (name) targetUser.name = name.trim();
    if (role) targetUser.role = role;
    if (status) targetUser.status = status;
    if (phone) targetUser.phone = phone.trim();
    if (email !== undefined) targetUser.email = email ? email.trim().toLowerCase() : undefined;

    await targetUser.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "USER_UPDATED",
      targetEntity: "User",
      targetId: targetUser._id.toString(),
      details: { role: targetUser.role, status: targetUser.status, authVersion: targetUser.authVersion },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          phone: targetUser.phone,
          role: targetUser.role,
          status: targetUser.status,
          authVersion: targetUser.authVersion,
        },
      },
      "User updated successfully"
    );
  } catch (err) {
    return next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return next(new ValidationError("New password must be at least 6 characters long"));
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return next(new NotFoundError("User not found"));
    }

    // Only owner can reset another owner's password
    if (targetUser.role === "owner" && req.user.role !== "owner") {
      return next(new ForbiddenError("Only an Owner can reset an Owner's password"));
    }

    const passwordHash = await User.hashPassword(newPassword);
    targetUser.passwordHash = passwordHash;
    targetUser.authVersion = (targetUser.authVersion || 1) + 1;

    if (!targetUser.securityHistory) targetUser.securityHistory = [];
    targetUser.securityHistory.push({
      action: "PASSWORD_RESET",
      performedBy: req.user._id,
      timestamp: new Date(),
    });

    await targetUser.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "USER_PASSWORD_RESET",
      targetEntity: "User",
      targetId: targetUser._id.toString(),
      details: { role: targetUser.role, authVersion: targetUser.authVersion },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {}, "User password reset successfully and active sessions invalidated");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/users/:id/status
 * Administrative status update (active, suspended, inactive) with instant token invalidation
 */
async function updateUserStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    const validStatuses = ["active", "inactive", "suspended", "invited"];
    if (!status || !validStatuses.includes(status)) {
      return next(new ValidationError(`Status must be one of: ${validStatuses.join(", ")}`));
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return next(new NotFoundError("User not found"));
    }

    if (targetUser.role === "owner" && status !== "active" && req.user.role !== "owner") {
      return next(new ForbiddenError("Only an Owner can modify an Owner's status"));
    }

    const prevStatus = targetUser.status;
    targetUser.status = status;
    targetUser.authVersion = (targetUser.authVersion || 1) + 1; // Instant revocation of all bearer tokens

    if (!targetUser.securityHistory) targetUser.securityHistory = [];
    targetUser.securityHistory.push({
      action: status === "suspended" ? "ACCOUNT_SUSPENDED" : "STATUS_UPDATED",
      performedBy: req.user._id,
      details: { previousStatus: prevStatus, newStatus: status, reason: reason || "Administrative update" },
      timestamp: new Date(),
    });

    await targetUser.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: status === "suspended" ? "USER_SUSPENDED" : "USER_STATUS_UPDATED",
      targetEntity: "User",
      targetId: targetUser._id.toString(),
      details: { previousStatus: prevStatus, newStatus: status, authVersion: targetUser.authVersion },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          status: targetUser.status,
          authVersion: targetUser.authVersion,
        },
      },
      `User account status updated to '${status}'. All existing sessions invalidated.`
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/users/:id/revoke-sessions
 * Manually revokes all active session tokens for a user
 */
async function revokeUserSessions(req, res, next) {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return next(new NotFoundError("User not found"));
    }

    targetUser.authVersion = (targetUser.authVersion || 1) + 1;

    if (!targetUser.securityHistory) targetUser.securityHistory = [];
    targetUser.securityHistory.push({
      action: "SESSIONS_REVOKED",
      performedBy: req.user._id,
      details: { newAuthVersion: targetUser.authVersion },
      timestamp: new Date(),
    });

    await targetUser.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "USER_SESSIONS_REVOKED",
      targetEntity: "User",
      targetId: targetUser._id.toString(),
      details: { newAuthVersion: targetUser.authVersion },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { authVersion: targetUser.authVersion },
      "All active sessions for this user have been successfully revoked."
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/users/:id/permissions
 * Administrative assignment of custom and denied permissions
 */
async function updateUserPermissions(req, res, next) {
  try {
    const { customPermissions = [], deniedPermissions = [] } = req.body;

    if (!Array.isArray(customPermissions) || !Array.isArray(deniedPermissions)) {
      return next(new ValidationError("customPermissions and deniedPermissions must be arrays of strings"));
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return next(new NotFoundError("User not found"));
    }

    if (targetUser.role === "owner" && req.user.role !== "owner") {
      return next(new ForbiddenError("Only an Owner can modify permissions on an Owner account"));
    }

    targetUser.customPermissions = customPermissions.map((p) => String(p).trim());
    targetUser.deniedPermissions = deniedPermissions.map((p) => String(p).trim());
    targetUser.authVersion = (targetUser.authVersion || 1) + 1; // Instant re-evaluation for next requests

    if (!targetUser.securityHistory) targetUser.securityHistory = [];
    targetUser.securityHistory.push({
      action: "PERMISSIONS_UPDATED",
      performedBy: req.user._id,
      details: {
        customPermissions: targetUser.customPermissions,
        deniedPermissions: targetUser.deniedPermissions,
      },
      timestamp: new Date(),
    });

    await targetUser.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "USER_PERMISSIONS_UPDATED",
      targetEntity: "User",
      targetId: targetUser._id.toString(),
      details: {
        customPermissions: targetUser.customPermissions,
        deniedPermissions: targetUser.deniedPermissions,
        authVersion: targetUser.authVersion,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          role: targetUser.role,
          customPermissions: targetUser.customPermissions,
          deniedPermissions: targetUser.deniedPermissions,
          effectivePermissions: getEffectivePermissions(targetUser),
          authVersion: targetUser.authVersion,
        },
      },
      "User granular permissions successfully updated."
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/users/permissions/catalog
 * Returns the complete permission catalogue and role defaults
 */
async function getPermissionsCatalog(req, res) {
  return sendSuccess(
    res,
    {
      permissions: PERMISSIONS,
      rolePermissions: ROLE_PERMISSIONS,
    },
    "Permissions catalogue retrieved"
  );
}

/**
 * GET /api/v1/users/:id/security-history
 * Returns user security history events and associated audit records
 */
async function getUserSecurityHistory(req, res, next) {
  try {
    const targetUser = await User.findById(req.params.id).select("name email role status securityHistory");
    if (!targetUser) {
      return next(new NotFoundError("User not found"));
    }

    const auditLogs = await AuditLog.find({ targetId: targetUser._id.toString() })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate("actorId", "name email role");

    return sendSuccess(
      res,
      {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          role: targetUser.role,
          status: targetUser.status,
        },
        securityHistory: targetUser.securityHistory || [],
        auditLogs,
      },
      "User security history retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const { action, targetEntity, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (targetEntity) filter.targetEntity = targetEntity;
    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        filter.$or = [
          { action: regex },
          { targetEntity: regex },
        ];
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("actorId", "name email role"),
      AuditLog.countDocuments(filter),
    ]);

    return sendSuccess(res, { logs, total, count: logs.length }, "Audit logs retrieved");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  resetUserPassword,
  updateUserStatus,
  revokeUserSessions,
  updateUserPermissions,
  getPermissionsCatalog,
  getUserSecurityHistory,
  getAuditLogs,
};
