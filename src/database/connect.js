const mongoose = require('mongoose');
const config = require('../../config');

async function connect() {
  try {
    console.log("🟡 [DATABASE] MongoDB Connecting");
    await mongoose.connect(config.mongoUri);
    console.log("🟢 [DATABASE] MongoDB Connected");
  } catch (error) {
    console.error("🔴 [DATABASE] MongoDB Connection Error:", error);
    process.exit(1);
  }
}

module.exports = { connect };
