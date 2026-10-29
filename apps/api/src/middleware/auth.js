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

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireAuth,
};
