const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    branchCode: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    operatingHours: {
      type: String,
      default: "08:00 - 20:00",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { _id: true, timestamps: true }
);

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    headOfDepartment: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { _id: true, timestamps: true }
);

const serviceSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    baseFee: {
      type: Number,
      required: true,
    },
    consultationType: {
      type: String,
      enum: ["in_person", "online", "both"],
      default: "both",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { _id: true, timestamps: true }
);

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "TriGyna Healthcare & Wellness",
    },
    tagline: {
      type: String,
      default: "Women | Health | Wellness",
    },
    logoUrl: {
      type: String,
      default: "/images/brand/logo.png",
    },
    email: {
      type: String,
      default: "trigyna.health@gmail.com",
    },
    phone: {
      type: String,
      default: "+919172772326",
    },
    website: {
      type: String,
      default: "https://trigyna.com",
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    currency: {
      type: String,
      default: "INR",
    },
    workingDays: {
      type: [String],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    bookingRules: {
      cancellationWindowHours: { type: Number, default: 24 },
      bufferMinutes: { type: Number, default: 15 },
      slotDurationMinutes: { type: Number, default: 30 },
      maxAdvanceBookingDays: { type: Number, default: 30 },
    },
    branches: [branchSchema],
    departments: [departmentSchema],
    services: [serviceSchema],
  },
  {
    timestamps: true,
  }
);

const Organization = mongoose.model("Organization", organizationSchema);

module.exports = Organization;
