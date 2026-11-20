const mongoose = require("mongoose");
const env = require("../config/env");
const Lead = require("../modules/crm/lead.model");

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  const monthlyLeads = await Lead.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalLeads: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  console.log("Monthly Leads & Conversions:", JSON.stringify(monthlyLeads, null, 2));

  // Check conversion dates (stageHistory or updatedAt for converted leads)
  const convertedSample = await Lead.find({ status: "converted" })
    .select("createdAt updatedAt stageHistory fullName")
    .limit(5);
  console.log("Converted sample:", JSON.stringify(convertedSample, null, 2));

  await mongoose.disconnect();
}
run();
