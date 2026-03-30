const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");
const { addTrackHype } = require("../../lib/hypeService");

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);

  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;

  if (player.voiceChannel && voice.voiceChannelId && player.voiceChannel !== voice.voiceChannelId) {
    return context.reply("❌ You must be in my voice channel.");
  }
  if (!player.current || !player.playing) {
    return context.reply("❌ A song must be currently playing to use hype.");
  }

  const userId = String(context.userId || context.user?.id || context.author?.id || "");
  if (!userId) return context.reply("❌ Unable to identify user.");

  const result = await addTrackHype({
    guildId: String(context.guildId),
    userId,
    track: player.current
  });

  if (!result.ok) return context.reply("⚠️ Could not save hype right now. Try again.");
  const title = player.current?.info?.title || "this track";
  if (result.added) {
    return context.reply(`🌟 Hype added for **${title}**. Total hype: **${result.score}**.`);
  }
  return context.reply(`⭐ You already hyped **${title}**. Total hype: **${result.score}**.`);
}

module.exports = { run };

