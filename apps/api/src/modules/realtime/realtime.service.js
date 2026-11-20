const EventEmitter = require("events");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const User = require("../users/user.model");
const Doctor = require("../doctors/doctor.model");

class RealtimeBroadcaster extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
    // Map of doctorId -> Set of response objects
    this.doctorConnections = new Map();
  }

  /**
   * Register a new SSE client for a doctor
   */
  registerDoctorConnection(doctorIdStr, res) {
    if (!this.doctorConnections.has(doctorIdStr)) {
      this.doctorConnections.set(doctorIdStr, new Set());
    }
    const set = this.doctorConnections.get(doctorIdStr);
    set.add(res);

    // Initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", doctorId: doctorIdStr, timestamp: new Date().toISOString() })}\n\n`);

    res.on("close", () => {
      set.delete(res);
      if (set.size === 0) {
        this.doctorConnections.delete(doctorIdStr);
      }
    });
  }

  /**
   * Broadcast typed event to connected clients of a specific doctor
   */
  broadcastDoctorEvent(doctorId, event, payload = {}) {
    const doctorIdStr = doctorId ? doctorId.toString() : null;
    if (!doctorIdStr) return;

    this.emit(`doctor:${doctorIdStr}`, { event, payload });

    const connections = this.doctorConnections.get(doctorIdStr);
    if (!connections || connections.size === 0) return;

    const message = `event: ${event}\ndata: ${JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })}\n\n`;
    for (const res of connections) {
      try {
        res.write(message);
      } catch (err) {
        connections.delete(res);
      }
    }
  }

  /**
   * Send heartbeat to prevent connection timeout
   */
  heartbeat() {
    for (const [doctorIdStr, set] of this.doctorConnections.entries()) {
      for (const res of set) {
        try {
          res.write(": heartbeat\n\n");
        } catch {
          set.delete(res);
        }
      }
      if (set.size === 0) {
        this.doctorConnections.delete(doctorIdStr);
      }
    }
  }
}

const realtimeBroadcaster = new RealtimeBroadcaster();

// Run heartbeat every 20 seconds
setInterval(() => {
  realtimeBroadcaster.heartbeat();
}, 20000).unref();

/**
 * Express handler for GET /api/v1/doctor/realtime/stream
 */
async function streamDoctorRealtime(req, res) {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing authentication token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== "active") {
      return res.status(401).json({ success: false, message: "Unauthorized: Inactive user account" });
    }

    let doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor && (user.role === "owner" || user.role === "admin")) {
      doctor = await Doctor.findOne({ status: "active" });
    }

    if (!doctor) {
      return res.status(403).json({ success: false, message: "Forbidden: No clinical doctor profile attached" });
    }

    // Prepare SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });

    realtimeBroadcaster.registerDoctorConnection(doctor._id.toString(), res);
  } catch (err) {
    console.error("[Realtime Stream Error]:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Internal server error establishing realtime channel" });
    }
  }
}

module.exports = {
  realtimeBroadcaster,
  streamDoctorRealtime,
  broadcastDoctorEvent: (doctorId, event, payload) => realtimeBroadcaster.broadcastDoctorEvent(doctorId, event, payload),
};

