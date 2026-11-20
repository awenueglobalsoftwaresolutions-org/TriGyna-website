const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../modules/users/user.model");

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  const users = await User.find({
    role: { $in: ["sales", "crm", "admin", "owner"] }
  });
  console.log("Count:", users.length);
  users.forEach((u, idx) => {
    console.log(`${idx + 1}. ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Phone: ${u.phone} | Role: ${u.role} | Status: ${u.status}`);
  });
  await mongoose.disconnect();
}
run();
