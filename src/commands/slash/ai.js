const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/ai");

const data = new SlashCommandBuilder()
  .setName("ai")
  .setDescription("AI control and chat")
  .addStringOption(o => o.setName("message").setDescription("Message for AI").setRequired(false))
  .addStringOption(o => o.setName("personality").setDescription("chill | hype | meme").setRequired(false))
  .addStringOption(o => o.setName("language").setDescription("Language name").setRequired(false))
  .addBooleanOption(o => o.setName("enabled").setDescription("Enable or disable AI").setRequired(false))
  .addIntegerOption(o => o.setName("idle_minutes").setDescription("Auto-disable minutes (0 to disable)").setMinValue(0).setMaxValue(720).setRequired(false))
  .addStringOption(o => o.setName("channel_action").setDescription("add | remove | list | clear").setRequired(false))
  .addStringOption(o => o.setName("channel_target").setDescription("Channel mention or ID").setRequired(false));

module.exports = {
  data,
  execute: async function(c, ctx) {
    const message = ctx.options?.message;
    const personality = ctx.options?.personality;
    const language = ctx.options?.language;
    const enabled = ctx.options?.enabled;
    const idleMinutes = ctx.options?.idle_minutes;
    const channelAction = ctx.options?.channel_action;
    const channelTarget = ctx.options?.channel_target;
    if (enabled !== undefined) ctx.args = [enabled ? "on" : "off"];
    else if (idleMinutes !== undefined) ctx.args = ["idle", String(idleMinutes)];
    else if (channelAction) ctx.args = ["channel", channelAction, channelTarget || ""];
    else if (personality) ctx.args = ["personality", personality];
    else if (language) ctx.args = ["language", language];
    else if (message) ctx.args = message.split(/\s+/);
    else ctx.args = ["status"];
    return core.run(c, ctx);
  }
};
