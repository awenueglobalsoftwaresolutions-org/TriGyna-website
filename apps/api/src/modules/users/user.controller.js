const User = require("./user.model");
const AuditLog = require("../audit/audit.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

async function listUsers(req, res, next) {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(query).sort({ createdAt: -1 }).select("-passwordHash");
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
    return sendSuccess(res, { user }, "User retrieved");
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
      details: { role: targetUser.role, status: targetUser.status },
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
    await targetUser.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "USER_PASSWORD_RESET",
      targetEntity: "User",
      targetId: targetUser._id.toString(),
      details: { role: targetUser.role },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {}, "User password reset successfully");
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
    if (search) {
      filter.$or = [
        { action: new RegExp(search.trim(), "i") },
        { targetEntity: new RegExp(search.trim(), "i") },
      ];
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
  getAuditLogs,
};
