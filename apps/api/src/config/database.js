const mongoose = require("mongoose");
const env = require("./env");

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    };

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
    console.error("[Database] Initial MongoDB connection failed:", error.message);
    console.error("[Database] Ensure local MongoDB is running at: " + env.MONGODB_URI);
    throw error;
  }
}

async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("[Database] MongoDB connection closed.");
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
};
