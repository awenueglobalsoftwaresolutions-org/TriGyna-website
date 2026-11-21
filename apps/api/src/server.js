const app = require("./app");
const env = require("./config/env");
const { connectDB, disconnectDB, maskUri } = require("./config/database");
const { connectRedis, disconnectRedis } = require("./infrastructure/redis/redisClient");
const redisConfig = require("./config/redis.config");

let server;

async function startServer() {
  try {
    const redisValidation = redisConfig.validateRedisConfig();
    console.log("==================================================");
    console.log("TriGyna Healthcare Management Platform — API Server");
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Configured MongoDB Target: ${maskUri(env.MONGODB_URI)} [DB: ${env.DB_NAME}]`);
    console.log(`Configured Redis Target:   ${redisValidation.target} [Type: ${redisValidation.connectionType}]`);
    console.log("==================================================");

    await connectDB();
    await connectRedis();

    const HOST = "0.0.0.0";
    server = app.listen(env.PORT, HOST, () => {
      console.log(`[Server] Express REST API is running on http://${HOST}:${env.PORT}/api/v1`);
      console.log(`[Server] Health check: http://${HOST}:${env.PORT}/health`);
    });

    // Graceful shutdown handling
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
      try {
        const emailQueueService = require("./modules/email/email.queue.service");
        emailQueueService.stop();
      } catch {
        // Safe fallback
      }
      if (server) {
        server.close(async () => {
          console.log("[Server] HTTP server closed.");
          await disconnectRedis();
          await disconnectDB();
          process.exit(0);
        });
      } else {
        await disconnectRedis();
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  } catch (err) {
    console.error("[Server] Critical startup error:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
