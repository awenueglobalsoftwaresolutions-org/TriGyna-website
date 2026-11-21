const { sendError } = require("../shared/response");

function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return sendError(res, {
      statusCode: 400,
      code: "INVALID_ID",
      message: `Invalid ID format for field '${err.path}'`,
    });
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyValue || {});
    return sendError(res, {
      statusCode: 409,
      code: "DUPLICATE_KEY",
      message: `Duplicate value for field(s): ${keys.join(", ")}`,
      details: err.keyValue,
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Database schema validation failed",
      details,
    });
  }

  // Handle JSON parse error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return sendError(res, {
      statusCode: 400,
      code: "MALFORMED_JSON",
      message: "Malformed JSON payload in request body",
    });
  }

  // Handle custom AppError
  if (err.statusCode) {
    return sendError(res, err);
  }

  // Fallback server error (do not leak stack trace in production)
  console.error("[ServerError]", err);
  return sendError(res, {
    statusCode: 500,
    code: "SERVER_ERROR",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
}

module.exports = errorHandler;
