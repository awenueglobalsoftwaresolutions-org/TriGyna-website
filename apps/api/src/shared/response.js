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
  const message = error.message || "An unexpected error occurred";
  const details = error.details || [];

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
};
