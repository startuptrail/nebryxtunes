const { REST, Routes } = require("discord.js");
const config = require("../../../config");
const Guild = require("../../database/models/Guild");
const { getOrCreatePlayer } = require("../../lib/playerHelpers");
const { apply247StateToPlayer } = require("../../lib/twentyFourSeven");

console.log("ready.js loaded");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    const start = client.startedAt ? Date.now() - client.startedAt : 0;
    process.stdout.write("READY fired\n");
    console.log(`Bot user: ${client.user.tag}`);
    console.log(`Client ID: ${client.user.id}`);
    console.log("Refreshing slash commands...");

    const token = process.env.DISCORD_TOKEN || client.botToken || config.token;
    const rest = new REST({ version: "10" }).setToken(token);

    try {
      if (client.slashDatas && client.slashDatas.length > 0) {
        const guilds = [...client.guilds.cache.values()];
        await Promise.allSettled(
          guilds.map(guild => rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: client.slashDatas }))
        );
        console.log(`Guild slash commands registered for ${guilds.length} guild(s).`);
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        console.log("Global slash commands cleared to prevent duplicates.");
      }
    } catch (error) {
      console.error("Slash command registration error:", error);
    }

    if (client.startPresenceRotation) client.startPresenceRotation();
    client.riffy.init(client.user.id);

    const aiModel = String(config.ai?.model || "qwen/qwen3-32b");
    const aiKey = String(config.ai?.apiKey || "").trim();
    const hasKey = !!aiKey && !/^(?:PASTE_|your[-_ ]?groq|your_key)/i.test(aiKey);
    console.log(`[AI] provider=groq model=${aiModel} key=${hasKey ? "set" : "missing"}`);

    const docs = await Guild.find({
      twentyFourSeven: true,
      twentyFourSevenVoiceChannelId: { $ne: null }
    }).lean().catch(() => []);
    for (const doc of docs) {
      const guild = client.guilds.cache.get(doc.guildId);
      if (!guild) continue;
      const voiceChannel = guild.channels.cache.get(doc.twentyFourSevenVoiceChannelId);
      if (!voiceChannel?.isVoiceBased?.()) continue;
      const textChannelId = doc.twentyFourSevenTextChannelId || client.lastCommandChannel?.get(doc.guildId) || null;
      const player = getOrCreatePlayer(client, doc.guildId, doc.twentyFourSevenVoiceChannelId, textChannelId, true);
      apply247StateToPlayer(player, doc);
    }

    console.log(`Bot initialization completed in ${start}ms`);
  }
};
