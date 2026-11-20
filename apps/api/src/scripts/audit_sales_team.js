const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../modules/users/user.model");
const Employee = require("../modules/hrms/employee.model");
const Lead = require("../modules/crm/lead.model");
const Organization = require("../modules/organization/organization.model");

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB:", env.MONGODB_URI);

  const allUsers = await User.find({}).select("name email phone role status");
  console.log(`\n=== ALL USERS (${allUsers.length}) ===`);
  const roleGroups = {};
  allUsers.forEach((u) => {
    roleGroups[u.role] = (roleGroups[u.role] || 0) + 1;
    if (["sales", "crm", "admin", "owner"].includes(u.role)) {
      console.log(`- ${u._id} | ${u.name} | ${u.email} | ${u.phone} | role:${u.role} | status:${u.status}`);
    }
  });
  console.log("Role counts:", roleGroups);

  const emps = await Employee.find({}).populate("userId", "name email phone role status");
  console.log(`\n=== HRMS EMPLOYEES (${emps.length}) ===`);
  emps.forEach((e) => {
    console.log(`- EmpCode: ${e.employeeCode} | User: ${e.userId?.name} (${e.userId?.role}) | Dept: ${e.department} | Desig: ${e.designation} | Status: ${e.status}`);
  });

  const totalLeads = await Lead.countDocuments();
  const convertedLeads = await Lead.countDocuments({ status: "converted" });
  console.log(`\n=== CRM LEADS: Total ${totalLeads}, Converted ${convertedLeads} ===`);

  const leadDistribution = await Lead.aggregate([
    {
      $group: {
        _id: "$assignedTo",
        totalLeads: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } },
        newLeads: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
        inProgress: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  [
                    "contacted",
                    "interested",
                    "qualified",
                    "package_discussion",
                    "awaiting_payment",
                    "consultation_booked",
                    "consultation_completed",
                    "appointment_offered",
                    "appointment_requested",
                    "appointment_booked",
                    "appointment",
                  ],
                ],
              },
              1,
              0,
            ],
          },
        },
        lost: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
      },
    },
    { $sort: { totalLeads: -1 } },
  ]);

  console.log("\n=== LEAD DISTRIBUTION BY ASSIGNED USER ===");
  for (const item of leadDistribution) {
    if (item._id) {
      const u = await User.findById(item._id).select("name email role");
      console.log(`User ${item._id} (${u ? u.name + " - " + u.role : "Unknown"}): Total=${item.totalLeads}, Converted=${item.converted}, New=${item.newLeads}, InProg=${item.inProgress}, Lost=${item.lost}`);
    } else {
      console.log(`Unassigned (null): Total=${item.totalLeads}, Converted=${item.converted}, New=${item.newLeads}, InProg=${item.inProgress}, Lost=${item.lost}`);
    }
  }

  const org = await Organization.findOne({});
  console.log("\n=== CLINIC BRANCHES ===");
  if (org && org.branches) {
    org.branches.forEach((b) => {
      console.log(`- ${b._id} | ${b.name} (${b.branchCode}) | Status: ${b.status}`);
    });
  } else {
    console.log("No organization branches found");
  }

  // Check if any sales collections exist
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("\n=== ALL DB COLLECTIONS ===");
  console.log(collections.map((c) => c.name).sort().join(", "));

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
