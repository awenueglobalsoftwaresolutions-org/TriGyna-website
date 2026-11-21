const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../modules/users/user.model");
const { UnauthorizedError, ForbiddenError } = require("../shared/errors");

async function requireAuth(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new UnauthorizedError("Access token is missing or malformed"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return next(new UnauthorizedError("Token is invalid or expired"));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new UnauthorizedError("User account no longer exists"));
    }

    if (user.status !== "active") {
      return next(new ForbiddenError(`Your account is ${user.status}. Please contact an administrator.`));
    }

    // Immediate session invalidation via authVersion
    if (
      decoded.authVersion !== undefined &&
      user.authVersion !== undefined &&
      decoded.authVersion !== user.authVersion
    ) {
      return next(new UnauthorizedError("Session has been invalidated due to a security update or session revocation. Please log in again."));
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function optionalAuth(req, res, next) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.status === "active") {
          if (
            decoded.authVersion === undefined ||
            user.authVersion === undefined ||
            decoded.authVersion === user.authVersion
          ) {
            req.user = user;
          }
        }
      } catch {
        // Silently ignore invalid optional tokens
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
};
