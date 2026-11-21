const { getRedisClient, isRedisConnected } = require("./redisClient");
const redisConfig = require("../../config/redis.config");

// In-process observability counters
const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
};

/**
 * Retrieve a cached value by key with safe JSON parsing.
 */
async function getCache(key) {
  if (!redisConfig.CACHE_ENABLED || !isRedisConnected() || !key) {
    return null;
  }

  try {
    const client = getRedisClient();
    const data = await client.get(key);

    if (!data) {
      metrics.misses++;
      return null;
    }

    metrics.hits++;
    try {
      return JSON.parse(data);
    } catch (parseErr) {
      console.warn(`[Redis Cache] JSON parse error for key "${key}":`, parseErr.message);
      // Evict corrupted entry
      client.del(key).catch(() => {});
      return null;
    }
  } catch (err) {
    metrics.errors++;
    console.warn(`[Redis Cache] getCache error for key "${key}":`, err.message);
    return null; // Fail-open: Return null so caller falls back to database
  }
}

/**
 * Store a value in cache with a TTL (seconds).
 */
async function setCache(key, value, ttlSeconds = redisConfig.CACHE_DEFAULT_TTL) {
  if (!redisConfig.CACHE_ENABLED || !isRedisConnected() || !key || value === undefined) {
    return false;
  }

  try {
    const client = getRedisClient();
    const serialized = JSON.stringify(value);
    const ttl = Math.max(1, parseInt(ttlSeconds, 10) || redisConfig.CACHE_DEFAULT_TTL);

    await client.set(key, serialized, "EX", ttl);
    metrics.sets++;
    return true;
  } catch (err) {
    metrics.errors++;
    console.warn(`[Redis Cache] setCache error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Delete a specific key from cache.
 */
async function deleteCache(key) {
  if (!isRedisConnected() || !key) {
    return false;
  }

  try {
    const client = getRedisClient();
    await client.del(key);
    metrics.deletes++;
    return true;
  } catch (err) {
    metrics.errors++;
    console.warn(`[Redis Cache] deleteCache error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Delete keys matching a pattern using non-blocking SCAN stream.
 * Does NOT use blocking KEYS * command.
 */
async function deleteCacheByPattern(pattern) {
  if (!isRedisConnected() || !pattern) {
    return 0;
  }

  try {
    const client = getRedisClient();
    const stream = client.scanStream({
      match: pattern,
      count: 100,
    });

    let deletedCount = 0;

    for await (const keys of stream) {
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach((k) => pipeline.del(k));
        await pipeline.exec();
        deletedCount += keys.length;
        metrics.deletes += keys.length;
      }
    }

    return deletedCount;
  } catch (err) {
    metrics.errors++;
    console.warn(`[Redis Cache] deleteCacheByPattern error for pattern "${pattern}":`, err.message);
    return 0;
  }
}

/**
 * Atomic get-or-set cache pattern.
 * If cached, returns immediately.
 * If missed or Redis unavailable, executes fetchFunction(), caches result, and returns.
 */
async function getOrSetCache(key, ttlSeconds, fetchFunction) {
  if (!redisConfig.CACHE_ENABLED || !isRedisConnected() || !key) {
    return fetchFunction();
  }

  try {
    const cached = await getCache(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetchFunction();
    if (freshData !== null && freshData !== undefined) {
      // Set cache asynchronously without awaiting to minimize latency
      setCache(key, freshData, ttlSeconds).catch(() => {});
    }
    return freshData;
  } catch (err) {
    // Fail-open fallback: execute fetchFunction directly
    console.warn(`[Redis Cache] getOrSetCache fallback for key "${key}":`, err.message);
    return fetchFunction();
  }
}

/**
 * Get internal observability metrics.
 */
function getCacheMetrics() {
  const total = metrics.hits + metrics.misses;
  const hitRatio = total > 0 ? (metrics.hits / total).toFixed(4) : "0.0000";
  return {
    ...metrics,
    totalRequests: total,
    hitRatio: parseFloat(hitRatio),
  };
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  getOrSetCache,
  getCacheMetrics,
};
