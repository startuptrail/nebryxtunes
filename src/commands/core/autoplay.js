const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const enabled = !player.autoplay;
  player.autoplay = enabled;
  await context.reply(enabled ? "Autoplay on." : "Autoplay off.");
}

module.exports = { run };
