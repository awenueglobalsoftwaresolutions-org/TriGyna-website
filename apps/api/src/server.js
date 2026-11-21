const app = require("./app");
const env = require("./config/env");
const { connectDB, disconnectDB, maskUri } = require("./config/database");

let server;

async function startServer() {
  try {
    console.log("==================================================");
    console.log("TriGyna Healthcare Management Platform — API Server");
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Configured MongoDB Target: ${maskUri(env.MONGODB_URI)} [DB: ${env.DB_NAME}]`);
    console.log("==================================================");

    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log(`[Server] Express REST API is running on http://127.0.0.1:${env.PORT}/api/v1`);
      console.log(`[Server] Health check: http://127.0.0.1:${env.PORT}/api/v1/health`);
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
          await disconnectDB();
          process.exit(0);
        });
      } else {
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
