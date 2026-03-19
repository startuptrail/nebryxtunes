const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

function parseTime(str) {
  const parts = String(str).trim().split(":").map(Number);
  if (parts.length === 1 && !isNaN(parts[0])) return parts[0] * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  return NaN;
}

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const raw = context.args.join(" ").trim() || context.options?.position;
  const ms = parseTime(raw);
  if (isNaN(ms) || ms < 0) return context.reply("Provide a valid time (e.g. 1:30 or 90).");
  player.seek(ms);
  await context.reply(`Seeked to ${Math.floor(ms / 1000)}s.`);
}

module.exports = { run };
