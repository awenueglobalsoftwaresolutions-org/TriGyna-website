const mongoose = require("mongoose");
const env = require("./env");

let isConnected = false;
let connectionPromise = null;

/**
 * Mask sensitive credentials from MongoDB URI for safe logging.
 * Replaces :password@ with :****@
 */
function maskUri(uri) {
  if (!uri || typeof uri !== "string") return "[URI_NOT_CONFIGURED]";
  return uri.replace(/:([^:@]+)@/, ":****@");
}

/**
 * Establish resilient, pooled MongoDB connection.
 * Idempotent: returns existing connection if already established or in-flight.
 */
async function connectDB(retries = 3, retryDelayMs = 2000) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const dbName = env.DB_NAME || env.MONGODB_DB_NAME || "trigyna";
  const maskedTarget = maskUri(env.MONGODB_URI);

  const opts = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 20,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 5,
    retryWrites: true,
    autoIndex: env.NODE_ENV !== "production",
    dbName,
  };

  connectionPromise = (async () => {
    let attempt = 0;
    while (attempt < retries) {
      attempt++;
      try {
        const conn = await mongoose.connect(env.MONGODB_URI, opts);
        isConnected = true;
        console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);

        mongoose.connection.on("error", (err) => {
          console.error("[Database] Runtime MongoDB connection error:", err.message);
        });

        mongoose.connection.on("disconnected", () => {
          console.warn("[Database] MongoDB disconnected.");
          isConnected = false;
        });

        return conn.connection;
      } catch (error) {
        console.error(`[Database] Connection attempt ${attempt}/${retries} failed: ${error.message}`);
        if (attempt >= retries) {
          console.error(`[Database] All connection attempts failed targeting: ${maskedTarget} [dbName: ${dbName}]`);
          connectionPromise = null;
          throw error;
        }
        console.log(`[Database] Retrying connection in ${retryDelayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  })();

  return connectionPromise;
}

/**
 * Perform active health check on database connection without leaking secrets.
 */
async function checkDBHealth() {
  const readyState = mongoose.connection.readyState;
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  const status = states[readyState] || "unknown";

  if (readyState !== 1) {
    return {
      healthy: false,
      status,
      database: null,
      host: null,
    };
  }

  try {
    const adminDb = mongoose.connection.db.admin();
    const pingResult = await adminDb.ping();
    return {
      healthy: pingResult && pingResult.ok === 1,
      status: "connected",
      database: mongoose.connection.name,
      host: mongoose.connection.host,
    };
  } catch (err) {
    return {
      healthy: false,
      status: "error",
      database: mongoose.connection.name,
      error: err.message,
    };
  }
}

async function disconnectDB() {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    connectionPromise = null;
    console.log("[Database] MongoDB connection closed.");
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  checkDBHealth,
  maskUri,
  mongoose,
};
