const mongoose = require("mongoose");

const warningSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Warning || mongoose.model("Warning", warningSchema);
