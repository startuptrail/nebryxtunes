const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  tracks: { type: Array, default: [] }
}, { timestamps: true });

// Compound index for unique playlist names per user
playlistSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Playlist || mongoose.model("Playlist", playlistSchema);
