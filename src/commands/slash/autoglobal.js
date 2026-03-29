const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/autoglobal");

const data = new SlashCommandBuilder()
  .setName("autoglobal")
  .setDescription("Owner-only auto response for all channels")
  .addSubcommand(sub =>
    sub
      .setName("response")
      .setDescription("Set a global trigger and response")
      .addStringOption(o => o.setName("trigger").setDescription("Message to match").setRequired(true))
      .addStringOption(o => o.setName("reply").setDescription("Bot response text").setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName("show")
      .setDescription("Show all global auto responses")
  )
  .addSubcommand(sub =>
    sub
      .setName("clear")
      .setDescription("Clear global auto responses")
      .addStringOption(o => o.setName("trigger").setDescription("Remove only this trigger").setRequired(false))
  );

module.exports = {
  data,
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
