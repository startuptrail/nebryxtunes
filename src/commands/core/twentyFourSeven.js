const getGuildSettings = require("../../lib/getGuildSettings");
const Guild = require("../../database/models/Guild");
const { getOrCreatePlayer, requireVoice, requirePlayer } = require("../../lib/playerHelpers");
const { apply247StateToPlayer, get247ModeLabel, normalize247Mode } = require("../../lib/twentyFourSeven");

async function run(client, context) {
  if (!context.guildId) return context.reply("Use this in a server.");
  const doc = await getGuildSettings(context.guildId);
  const raw = String(context.args?.[0] ?? context.options?.mode ?? "").toLowerCase();
  if (raw === "status") {
    const mode = get247ModeLabel(doc.twentyFourSevenMode);
    return context.reply(`24/7 is **${doc.twentyFourSeven ? "on" : "off"}** (${mode}).`);
  }

  let enabled;
  let mode = normalize247Mode(doc.twentyFourSevenMode);
  if (["off", "disable"].includes(raw)) {
    enabled = false;
  } else if (["nomusic", "no-music", "silent", "stay", "stayvc", "vc"].includes(raw)) {
    enabled = true;
    mode = "nomusic";
  } else if (["music", "on", "enable"].includes(raw)) {
    enabled = true;
    mode = "music";
  } else if (!raw) {
    enabled = !doc.twentyFourSeven;
  } else {
    return context.reply("Use: `247 on`, `247 off`, `247 music`, `247 nomusic`, or `247 status`.");
  }

  let voiceChannelId = doc.twentyFourSevenVoiceChannelId || null;
  let textChannelId = doc.twentyFourSevenTextChannelId || context.channelId || null;

  if (enabled) {
    const voice = requireVoice(context);
    if (!voice.ok) return context.reply(voice.message);
    voiceChannelId = voice.voiceChannelId;
    textChannelId = context.channelId || textChannelId;
    const player = getOrCreatePlayer(client, context.guildId, voiceChannelId, textChannelId, true);
    apply247StateToPlayer(player, { twentyFourSeven: true, twentyFourSevenMode: mode });
  } else {
    const playerCheck = requirePlayer(client, context.guildId);
    if (playerCheck.ok) {
      apply247StateToPlayer(playerCheck.player, { twentyFourSeven: false, twentyFourSevenMode: mode });
    }
  }

  await Guild.updateOne(
    { guildId: context.guildId },
    {
      $set: {
        twentyFourSeven: enabled,
        twentyFourSevenMode: mode,
        twentyFourSevenVoiceChannelId: enabled ? voiceChannelId : null,
        twentyFourSevenTextChannelId: enabled ? textChannelId : null
      }
    },
    { upsert: true }
  );
  await context.reply(`24/7 is now **${enabled ? "on" : "off"}** (${get247ModeLabel(mode)}).`);
}

module.exports = { run };
