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
      enum: ["Online Video Consultation"],
      default: "Online Video Consultation",
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

packageSchema.set("toJSON", { virtuals: true });
packageSchema.set("toObject", { virtuals: true });

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;
