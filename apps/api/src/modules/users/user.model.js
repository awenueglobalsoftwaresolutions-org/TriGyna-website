const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Do not return in default queries
    },
    role: {
      type: String,
      enum: ["owner", "super_admin", "SUPER_ADMIN", "admin", "doctor", "reception", "patient", "crm", "sales", "hrms"],
      set: (v) => (typeof v === "string" ? v.toLowerCase() : v),
      default: "patient",
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "invited"],
      default: "active",
      index: true,
    },
    authVersion: {
      type: Number,
      default: 1,
      index: true,
    },
    customPermissions: {
      type: [String],
      default: [],
    },
    deniedPermissions: {
      type: [String],
      default: [],
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    securityHistory: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    activatedAt: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      unique: true,
      sparse: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerifiedAt: {
      type: Date,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password with legacy upgrade support and constant-time safety
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash || typeof candidatePassword !== "string") {
    return false;
  }

  // 1. Standard bcrypt hash check
  if (
    this.passwordHash.startsWith("$2a$") ||
    this.passwordHash.startsWith("$2b$") ||
    this.passwordHash.startsWith("$2y$")
  ) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  // 2. Legacy plaintext upgrade check (using constant-time comparison to prevent timing attacks)
  const candidateBuf = Buffer.from(candidatePassword, "utf8");
  const hashBuf = Buffer.from(this.passwordHash, "utf8");
  if (
    candidateBuf.length === hashBuf.length &&
    crypto.timingSafeEqual(candidateBuf, hashBuf)
  ) {
    // Automatically upgrade legacy plaintext password to secure bcrypt hash
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(candidatePassword, salt);
    await this.save();
    return true;
  }

  return false;
};

// Static method to hash password
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
