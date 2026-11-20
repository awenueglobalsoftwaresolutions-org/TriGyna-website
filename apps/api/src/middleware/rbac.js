const { ForbiddenError } = require("../shared/errors");

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError("Authentication is required prior to role verification"));
    }

    const userRole = req.user.role;

    // Super Admin / Owner always has authorized administrative system oversight
    if (userRole === "owner" || userRole === "super_admin") {
      return next();
    }

    // Admin has unified administrative access across management domains
    if (
      userRole === "admin" &&
      (allowedRoles.includes("admin") ||
        allowedRoles.includes("owner") ||
        allowedRoles.includes("super_admin") ||
        allowedRoles.includes("crm") ||
        allowedRoles.includes("sales") ||
        allowedRoles.includes("hrms"))
    ) {
      return next();
    }

    // Sales and CRM roles are interchangeable synonyms for Sales Team CRM portal
    const normalizedRole = userRole === "crm" ? "sales" : userRole;
    const normalizedAllowed = allowedRoles.map((r) => (r === "crm" ? "sales" : r));

    if (!normalizedAllowed.includes(normalizedRole)) {
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
