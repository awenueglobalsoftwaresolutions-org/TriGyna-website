const AuditLog = require("./audit.model");

async function recordAudit({
  actorId = null,
  actorRole = "anonymous",
  action,
  targetEntity,
  targetId = null,
  ipAddress = "",
  userAgent = "",
  details = {},
  status = "SUCCESS",
}) {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      targetEntity,
      targetId,
      ipAddress,
      userAgent,
      details,
      status,
    });
  } catch (err) {
    console.error("[AuditService] Failed to record audit log:", err.message);
  }
}

module.exports = {
  recordAudit,
};
