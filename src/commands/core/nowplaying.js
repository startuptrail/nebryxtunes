const { requirePlayer } = require("../../lib/playerHelpers");

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "0:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function run(client, context) {
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  if (!player.playing && !player.paused) return context.reply("Nothing playing.");
  const track = player.current;
  if (!track) return context.reply("Nothing playing.");
  const title = track.info?.title || "Unknown";
  const author = track.info?.author || "";
  const duration = track.info?.length ? formatDuration(track.info.length) : "?";
  const pos = player.position ?? 0;
  const posStr = formatDuration(pos);
  const progress = duration !== "?" && track.info.length
    ? Math.min(1, pos / track.info.length)
    : 0;
  const barLen = 12;
  const filled = Math.round(barLen * progress);
  const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
  const msg = `**Now playing:** ${title}\n**Artist:** ${author}\n\`${posStr}\` [${bar}] \`${duration}\``;
  await context.reply(msg);
}

module.exports = { run };
