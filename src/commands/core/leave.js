const { requirePlayer } = require("../../lib/playerHelpers");

async function run(client, context) {
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  player.destroy();
  await context.reply("Left the voice channel.");
}

module.exports = { run };
