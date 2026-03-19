const { requirePlayer } = require("../../lib/playerHelpers");

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "0:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

async function run(client, context) {
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const track = player.current;
  if (!track) return context.reply("Nothing playing.");
  const info = track.info || track;
  const title = info.title || "Unknown";
  const author = info.author || "";
  const length = formatDuration(info.length);
  const msg = "**" + title + "**\nAuthor: " + author + "\nDuration: " + length;
  await context.reply(msg);
}

module.exports = { run };
