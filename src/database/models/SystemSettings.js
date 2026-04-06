const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "global" },
  globalAutoResponses: {
    type: [
      {
        trigger: { type: String, required: true },
        reply: { type: String, required: true }
      }
    ],
    default: []
  },
  maintenance: {
    enabled: { type: Boolean, default: false },
    downtime: { type: String, default: "Unknown" },
    affectedCommands: { type: [String], default: [] },
    notAffectedCommands: { type: [String], default: [] },
    startedBy: { type: String, default: null },
    startedAt: { type: Date, default: null },
    endedBy: { type: String, default: null },
    endedAt: { type: Date, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.models.SystemSettings || mongoose.model("SystemSettings", systemSettingsSchema);
