const { getRedisClient, isRedisConnected } = require("./redisClient");

/**
 * Perform active health check on Redis connection without leaking credentials.
 */
async function checkRedisHealth() {
  const client = getRedisClient();

  if (!client) {
    return {
      healthy: false,
      status: "uninitialized",
      latencyMs: null,
    };
  }

  const clientStatus = client.status;

  if (clientStatus !== "ready") {
    return {
      healthy: false,
      status: clientStatus,
      latencyMs: null,
    };
  }

  try {
    const start = Date.now();
    const pingResponse = await client.ping();
    const latencyMs = Date.now() - start;

    return {
      healthy: pingResponse === "PONG",
      status: "ready",
      latencyMs,
    };
  } catch (err) {
    return {
      healthy: false,
      status: "error",
      error: err.message,
      latencyMs: null,
    };
  }
}

module.exports = {
  checkRedisHealth,
};
