const { ForbiddenError } = require("../shared/errors");

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError("Authentication is required prior to role verification"));
    }

    const userRole = req.user.role;

    // Owner (Super Admin) always has complete authorized system access
    if (userRole === "owner") {
      return next();
    }

    // Admin has unified complete administrative access (including CRM, HRMS, and any administrative route)
    if (
      userRole === "admin" &&
      (allowedRoles.includes("admin") ||
        allowedRoles.includes("owner") ||
        allowedRoles.includes("crm") ||
        allowedRoles.includes("hrms"))
    ) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return next(
        new ForbiddenError(`Access denied. Allowed role(s): [${allowedRoles.join(", ")}], your role: '${userRole}'`)
      );
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
