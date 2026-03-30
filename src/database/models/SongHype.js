const mongoose = require("mongoose");

const songHypeSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    trackId: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    author: { type: String, default: "" },
    uri: { type: String, default: "" },
    score: { type: Number, default: 0, min: 0 },
    voters: { type: [String], default: [] },
    lastHypedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

songHypeSchema.index({ guildId: 1, trackId: 1 }, { unique: true });

module.exports = mongoose.models.SongHype || mongoose.model("SongHype", songHypeSchema);

