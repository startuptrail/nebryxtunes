const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/auto");

const data = new SlashCommandBuilder()
  .setName("auto")
  .setDescription("Configure a server auto response")
  .addSubcommand(sub =>
    sub
      .setName("response")
      .setDescription("Set a trigger and response")
      .addStringOption(o => o.setName("trigger").setDescription("Message to match").setRequired(true))
      .addStringOption(o => o.setName("reply").setDescription("Bot response text").setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName("show")
      .setDescription("Show the current auto response")
  )
  .addSubcommand(sub =>
    sub
      .setName("clear")
      .setDescription("Clear the current auto response")
      .addStringOption(o => o.setName("trigger").setDescription("Remove only this trigger").setRequired(false))
  );

module.exports = {
  data,
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
