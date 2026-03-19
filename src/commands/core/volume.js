const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

function getVolume(player) {
  if (typeof player?.volume === "number") return player.volume;
  return 100;
}

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const raw = context.args[0] ?? context.options?.level;
  if (raw === undefined || raw === null || raw === "") {
    const current = getVolume(player);
    return context.reply(`Volume: **${current}%**`);
  }
  const level = parseInt(raw, 10);
  if (isNaN(level) || level < 1 || level > 200) return context.reply("Volume must be 1-200.");
  if (typeof player.setVolume === "function") player.setVolume(level);
  else player.volume = level;
  return context.reply(`Volume set to **${level}%**.`);
}

module.exports = { run };
