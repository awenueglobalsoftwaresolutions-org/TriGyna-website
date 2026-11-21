const Redis = require("ioredis");
const redisConfig = require("../../config/redis.config");

let client = null;

/**
 * Configure and initialize the singleton Redis client.
 */
function createClient() {
  const options = {
    connectTimeout: redisConfig.connectTimeout,
    maxRetriesPerRequest: null, // Required for rate-limit-redis and reliable script execution
    enableOfflineQueue: true,
    retryStrategy(times) {
      if (times > redisConfig.maxRetries) {
        console.warn(`[Redis] Reconnect retry limit (${redisConfig.maxRetries}) reached. Backing off...`);
        return 3000; // Continue retrying every 3s in background
      }
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true; // Reconnect on replica read-only errors
      }
      return false;
    },
  };

  let instance;

  if (redisConfig.url) {
    instance = new Redis(redisConfig.url, options);
  } else {
    instance = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      username: redisConfig.username,
      password: redisConfig.password,
      tls: redisConfig.tls,
      ...options,
    });
  }

  // Connection Event Handlers
  instance.on("connect", () => {
    const target = redisConfig.url
      ? redisConfig.maskRedisUrl(redisConfig.url)
      : `${redisConfig.host}:${redisConfig.port}`;
    console.log(`[Redis] Socket connected successfully to: ${target}`);
  });

  instance.on("ready", () => {
    console.log("[Redis] Client ready to receive and execute commands.");
  });

  instance.on("error", (err) => {
    // Safe logging without credentials
    const safeMsg = err && err.message ? err.message : "Unknown error";
    console.error("[Redis] Operational connection error:", safeMsg);
  });

  instance.on("close", () => {
    console.warn("[Redis] Connection closed.");
  });

  instance.on("reconnecting", (delay) => {
    console.log(`[Redis] Attempting reconnection in ${delay}ms...`);
  });

  instance.on("end", () => {
    console.warn("[Redis] Connection ended permanently.");
  });

  return instance;
}

/**
 * Get or initialize the shared Redis client.
 */
function getRedisClient() {
  if (!client) {
    client = createClient();
  }
  return client;
}

/**
 * Explicitly await Redis readiness during server startup.
 * Fail-safe: Does not crash the application if Redis connection fails;
 * instead logs a warning and allows caching / rate-limiting to degrade gracefully.
 */
async function connectRedis() {
  const instance = getRedisClient();
  if (instance.status === "ready") {
    return instance;
  }

  try {
    await Promise.race([
      new Promise((resolve) => {
        if (instance.status === "ready") return resolve();
        instance.once("ready", resolve);
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout waiting for ready state")), 15000)
      ),
    ]);
    return instance;
  } catch (err) {
    console.warn(`[Redis] Startup connection attempt notice: ${err.message}. Backend will operate in fallback mode.`);
    return instance;
  }
}

/**
 * Check if Redis is currently ready.
 */
function isRedisConnected() {
  return Boolean(client && client.status === "ready");
}

/**
 * Graceful disconnect on application shutdown.
 */
async function disconnectRedis() {
  if (!client) return;

  try {
    console.log("[Redis] Closing Redis client connection gracefully...");
    // Give 2 seconds for in-flight commands before force quit
    await Promise.race([
      client.quit(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000)),
    ]);
    console.log("[Redis] Redis client closed successfully.");
  } catch (err) {
    console.warn("[Redis] Graceful quit timed out or failed. Disconnecting forcibly:", err.message);
    try {
      client.disconnect();
    } catch {
      // Ignore force-disconnect error
    }
  } finally {
    client = null;
  }
}

module.exports = {
  getRedisClient,
  connectRedis,
  isRedisConnected,
  disconnectRedis,
};
