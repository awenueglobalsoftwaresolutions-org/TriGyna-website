/**
 * Shared Regular Expression Safety & Sanitization Utilities
 * Prevents ReDoS attacks and regex syntax crashes when searching
 * user-supplied input strings with special characters (e.g. "+91", "(test)", "[service]").
 */

function escapeRegex(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeRegex(text, flags = "i") {
  if (!text || typeof text !== "string") return null;
  const sanitized = escapeRegex(text.trim());
  return new RegExp(sanitized, flags);
}

module.exports = {
  escapeRegex,
  safeRegex,
};

