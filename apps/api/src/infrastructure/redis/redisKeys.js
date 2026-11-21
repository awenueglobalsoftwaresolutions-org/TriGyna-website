const redisConfig = require("../../config/redis.config");

const PREFIX = redisConfig.CACHE_KEY_PREFIX || "trigyna";
const ENV = (process.env.NODE_ENV || "development").toLowerCase();

/**
 * Build a namespaced Redis key to avoid collisions across environments
 * Format: trigyna:<env>:<entity>:<identifier>
 */
function buildKey(entity, identifier) {
  const cleanId = String(identifier || "").trim().replace(/\s+/g, "_");
  return `${PREFIX}:${ENV}:${entity}:${cleanId}`;
}

const redisKeys = {
  // Key building primitives
  buildKey,
  getPrefix: () => `${PREFIX}:${ENV}:`,

  // Entity keys
  userKey: (id) => buildKey("users", id),
  doctorKey: (id) => buildKey("doctors", id),
  doctorListKey: (query = "") => buildKey("doctors", `list:${query ? Buffer.from(query).toString("base64url") : "all"}`),
  doctorStatsKey: () => buildKey("doctors", "stats"),
  
  organizationKey: () => buildKey("organization", "singleton"),
  departmentListKey: () => buildKey("departments", "list"),
  
  serviceKey: (id) => buildKey("services", id),
  serviceListKey: (query = "") => buildKey("services", `list:${query ? Buffer.from(query).toString("base64url") : "all"}`),
  
  packageKey: (id) => buildKey("packages", id),
  packageListKey: (query = "") => buildKey("packages", `list:${query ? Buffer.from(query).toString("base64url") : "all"}`),
  
  appointmentAvailabilityKey: (doctorId, date) => buildKey("appointments", `avail:${doctorId}:${date}`),
  appointmentKey: (id) => buildKey("appointments", id),
  
  reportsSummaryKey: (range = "all") => buildKey("reports", `summary:${range}`),
  
  // Rate limiting prefix for distributed rate limits
  rateLimitPrefix: (name = "general") => `${PREFIX}:${ENV}:ratelimit:${name}:`,

  // Invalidation pattern matching helpers (used with SCAN)
  patterns: {
    all: () => `${PREFIX}:${ENV}:*`,
    doctors: () => `${PREFIX}:${ENV}:doctors:*`,
    organization: () => `${PREFIX}:${ENV}:organization:*`,
    services: () => `${PREFIX}:${ENV}:services:*`,
    packages: () => `${PREFIX}:${ENV}:packages:*`,
    appointmentAvail: (doctorId) =>
      doctorId
        ? `${PREFIX}:${ENV}:appointments:avail:${doctorId}:*`
        : `${PREFIX}:${ENV}:appointments:avail:*`,
    reports: () => `${PREFIX}:${ENV}:reports:*`,
  },
};

module.exports = redisKeys;
