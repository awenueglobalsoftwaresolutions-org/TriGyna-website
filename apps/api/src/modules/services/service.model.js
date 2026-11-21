const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: function () {
        return this.category;
      },
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: 10,
    },
    baseFee: {
      type: Number,
      required: true,
      min: 0,
    },
    discountFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0, // 0 for healthcare exempt, or 5/12/18%
      min: 0,
    },
    consultationType: {
      type: String,
      enum: ["online", "in_person", "both"],
      default: "online",
    },
    onlineAvailable: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "draft", "inactive"],
      default: "active",
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    imageUrl: {
      type: String,
      default: "/images/about/doctor-consultation.jpg",
      trim: true,
    },
    assignedDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],
    features: {
      type: [String],
      default: [],
    },
    preparationInstructions: {
      type: String,
      trim: true,
      default: "",
    },
    bookingCount: {
      type: Number,
      default: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ status: 1, isPublished: 1 });

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;

