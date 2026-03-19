const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const targetChannelId = context.options?.channel ?? context.member?.voice?.channel?.id;
  if (!targetChannelId) return context.reply("❌ Specify a voice channel or be in one.");
  player.setVoiceChannel(targetChannelId, { deaf: true, mute: false });
  await context.reply("Moved to your voice channel.");
}

module.exports = { run };
