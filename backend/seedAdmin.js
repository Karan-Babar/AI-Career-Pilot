// One-time script to create (or promote) an admin account.
//
// To PROMOTE an existing account to admin (just pass the email):
//   node seedAdmin.js admin@email.com
//
// To CREATE a brand new admin account (pass all three):
//   node seedAdmin.js "Admin Name" admin@email.com yourpassword

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function run() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Promote existing user:  node seedAdmin.js admin@email.com");
    console.log("Create new admin:       node seedAdmin.js \"Admin Name\" admin@email.com yourpassword");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let name, email, password;

  if (args.length === 1) {
    // Promote-only mode: just an email was passed
    email = args[0];
  } else {
    // Create mode: name, email, password
    [name, email, password] = args;
  }

  let user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    user.isAdmin = true;
    await user.save();
    console.log(`Existing user "${user.email}" promoted to admin.`);
  } else {
    if (!name || !password) {
      console.log(`No existing user found with email "${email}".`);
      console.log("To create a new admin account, provide all three:");
      console.log("  node seedAdmin.js \"Admin Name\" admin@email.com yourpassword");
      await mongoose.disconnect();
      process.exit(1);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isAdmin: true,
    });
    console.log(`New admin account created: ${user.email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed to seed admin:", err.message);
  process.exit(1);
});