const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../modules/users/user.model");
const Lead = require("../modules/crm/lead.model");
const Organization = require("../modules/organization/organization.model");

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  const leadDistribution = await Lead.aggregate([
    {
      $group: {
        _id: "$assignedTo",
        totalLeads: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } }
      }
    },
    { $sort: { totalLeads: -1 } }
  ]);

  console.log("=== LEADS DISTRIBUTION ===");
  for (const item of leadDistribution) {
    if (item._id) {
      const u = await User.findById(item._id).select("name email role phone");
      console.log(`User ID: ${item._id} | Name: ${u?.name} | Email: ${u?.email} | Role: ${u?.role} | TotalLeads: ${item.totalLeads} | Converted: ${item.converted}`);
    } else {
      console.log(`Unassigned (null) | TotalLeads: ${item.totalLeads} | Converted: ${item.converted}`);
    }
  }

  const org = await Organization.findOne({});
  console.log("=== MAIN BRANCHES ===");
  const mainBranches = org?.branches?.slice(0, 5);
  mainBranches?.forEach(b => console.log(`Branch: ${b._id} - ${b.name} (${b.branchCode})`));

  await mongoose.disconnect();
}
run();
