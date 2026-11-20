const mongoose = require("mongoose");
const crypto = require("crypto");

const staffInvitationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["doctor", "sales"],
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    invitationStatus: {
      type: String,
      enum: ["pending", "used", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Generate a cryptographically secure random 256-bit activation token
 * Returns { rawToken, tokenHash, expiresAt }
 */
staffInvitationSchema.statics.generateSecureToken = function (expirationHours = 48) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
};

/**
 * Hash a candidate raw token to compare against stored tokenHash
 */
staffInvitationSchema.statics.hashToken = function (rawToken) {
  if (!rawToken || typeof rawToken !== "string") return "";
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
};

const StaffInvitation = mongoose.model("StaffInvitation", staffInvitationSchema);

module.exports = StaffInvitation;
