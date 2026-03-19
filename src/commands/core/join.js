const { getOrCreatePlayer, requireVoice } = require("../../lib/playerHelpers");

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  getOrCreatePlayer(client, context.guildId, voice.voiceChannelId, context.channelId, true);
  await context.reply("Joined your voice channel.");
}

module.exports = { run };
