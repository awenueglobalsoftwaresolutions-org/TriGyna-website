const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
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
      trim: true,
      default: "Wellness Programmes",
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPricePaise: {
      type: Number,
      min: 0,
      default: function () {
        return this.pricePaise;
      },
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    totalSessions: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    sessionDurationMinutes: {
      type: Number,
      default: 30,
      min: 15,
    },
    validityDays: {
      type: Number,
      default: 90,
      min: 1,
    },
    consultationMode: {
      type: String,
      enum: ["Online Video Consultation", "In-Clinic Consultation", "Both (In-Person & Online)", "ONLINE_VIDEO"],
      default: "Online Video Consultation",
    },
    onlineAvailable: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "draft", "inactive"],
      default: "active",
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

packageSchema.virtual("priceRupees").get(function () {
  return (this.pricePaise / 100).toFixed(2);
});

packageSchema.virtual("originalPriceRupees").get(function () {
  return ((this.originalPricePaise || this.pricePaise) / 100).toFixed(2);
});

packageSchema.set("toJSON", { virtuals: true });
packageSchema.set("toObject", { virtuals: true });

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;
