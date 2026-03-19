const mongoose = require("mongoose");

const securityEventSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, default: null, index: true },
  channelId: { type: String, default: null },
  messageId: { type: String, default: null },
  eventType: { type: String, required: true, index: true },
  severity: { type: Number, default: 1 },
  blocked: { type: Boolean, default: false },
  reasons: [{ type: String }],
  content: { type: String, default: "" },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

securityEventSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.models.SecurityEvent || mongoose.model("SecurityEvent", securityEventSchema);
