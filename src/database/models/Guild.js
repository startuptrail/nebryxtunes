const mongoose = require("mongoose");

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: null },
  djRole: { type: String, default: null },
  twentyFourSeven: { type: Boolean, default: false },
  twentyFourSevenMode: { type: String, default: "music" },
  twentyFourSevenVoiceChannelId: { type: String, default: null },
  twentyFourSevenTextChannelId: { type: String, default: null },
  personality: { type: String, default: "chill" },
  language: { type: String, default: "English" },
  aiEnabled: { type: Boolean, default: true },
  aiAutoDisabled: { type: Boolean, default: false },
  aiIdleMinutes: { type: Number, default: 60, min: 0, max: 720 },
  aiAllowedChannelIds: { type: [String], default: [] },
  autoResponses: {
    type: [
      {
        trigger: { type: String, required: true },
        reply: { type: String, required: true }
      }
    ],
    default: []
  },
  autoResponseEnabled: { type: Boolean, default: false },
  autoResponseTrigger: { type: String, default: null },
  autoResponseText: { type: String, default: null },
  dashboard: {
    nsfwMonitorEnabled: { type: Boolean, default: true },
    nsfwBlockMode: { type: Boolean, default: false },
    logChannelId: { type: String, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.models.Guild || mongoose.model("Guild", guildSchema);
