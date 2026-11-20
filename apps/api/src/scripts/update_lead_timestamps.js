const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../modules/users/user.model");
const Employee = require("../modules/hrms/employee.model");
const Lead = require("../modules/crm/lead.model");
const SalesTeamMember = require("../modules/sales-team/sales-team-member.model");
const SalesTarget = require("../modules/sales-team/sales-target.model");
const SalesTeamSettings = require("../modules/sales-team/sales-team-settings.model");

async function init() {
  await mongoose.connect(env.MONGODB_URI);

  const sushilAdmin = await User.findOne({ email: "admin@trigyna.test" });

  const allLeads = await Lead.find({}).sort({ _id: 1 });
  console.log(`Updating timestamps for ${allLeads.length} leads via native collection...`);

  // We want to distribute across May(4), Jun(5), Jul(6), Aug(7), Sep(8), Oct(9)
  const monthDist = [
    { month: 4, count: 20 }, // May: 20 leads
    { month: 5, count: 25 }, // Jun: 25 leads
    { month: 6, count: 35 }, // Jul: 35 leads
    { month: 7, count: 45 }, // Aug: 45 leads
    { month: 8, count: 50 }, // Sep: 50 leads
  ];

  let leadIdx = 0;
  for (const { month, count } of monthDist) {
    for (let i = 0; i < count && leadIdx < allLeads.length; i++) {
      const lead = allLeads[leadIdx];
      leadIdx++;
      // Keep Sushil Kumar's 59 leads in October!
      if (lead.assignedTo?.toString() === sushilAdmin?._id.toString()) {
        continue;
      }
      const day = (i % 27) + 1;
      const targetDate = new Date(2026, month, day, 10 + (i % 8), (i * 7) % 60);
      const updateDoc = {
        createdAt: targetDate,
      };
      if (lead.status === "converted") {
        updateDoc.updatedAt = new Date(targetDate.getTime() + 2 * 24 * 3600 * 1000);
      }
      await Lead.collection.updateOne({ _id: lead._id }, { $set: updateDoc });
    }
  }

  console.log("Leads timestamps updated!");
  await mongoose.disconnect();
}

init().catch(console.error);
