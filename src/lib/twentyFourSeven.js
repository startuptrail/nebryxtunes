function normalize247Mode(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (["nomusic", "no-music", "no_music", "silent", "stay", "stayvc", "vc"].includes(raw)) {
    return "nomusic";
  }
  return "music";
}

function get247ModeLabel(mode) {
  return normalize247Mode(mode) === "nomusic" ? "no-music" : "music";
}

function is247Enabled(doc) {
  return !!doc?.twentyFourSeven;
}

function apply247StateToPlayer(player, doc) {
  if (!player) return;
  player.twentyFourSeven = is247Enabled(doc);
  player.twentyFourSevenMode = normalize247Mode(doc?.twentyFourSevenMode);
}

module.exports = {
  normalize247Mode,
  get247ModeLabel,
  is247Enabled,
  apply247StateToPlayer
};
