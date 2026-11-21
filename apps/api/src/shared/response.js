function sanitizeErrorDetail(detail) {
  if (!detail) return detail;
  if (typeof detail === "string") {
    return detail
      .replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://[REDACTED_AUTH]@")
      .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]+/gi, "$1[REDACTED_TOKEN]")
      .replace(/(key[_-]?secret|password|token)[:=]\s*["']?[^"'\s]+["']?/gi, "$1=[REDACTED]");
  }
  if (typeof detail === "object") {
    if (Array.isArray(detail)) {
      return detail.map(sanitizeErrorDetail);
    }
    const sanitized = {};
    for (const [k, v] of Object.entries(detail)) {
      if (/password|secret|token|authorization|uri|conn/i.test(k)) {
        sanitized[k] = "[REDACTED]";
      } else {
        sanitized[k] = sanitizeErrorDetail(v);
      }
    }
    return sanitized;
  }
  return detail;
}

function sendSuccess(res, data = {}, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, error) {
  const statusCode = error.statusCode || 500;
  const code = error.code || "SERVER_ERROR";
  const rawMessage = error.message || "An unexpected error occurred";
  const message =
    typeof rawMessage === "string"
      ? rawMessage.replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://[REDACTED_AUTH]@")
      : rawMessage;

  const rawDetails = error.details || [];
  const details = sanitizeErrorDetail(rawDetails);

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

module.exports = {
  sendSuccess,
  sendError,
  sanitizeErrorDetail,
};
