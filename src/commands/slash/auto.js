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
  )
  .addSubcommand(sub =>
    sub
      .setName("migrate")
      .setDescription("Stamp missing guildId on older auto responses")
      .addStringOption(o =>
        o
          .setName("scope")
          .setDescription("Migration scope")
          .addChoices(
            { name: "Current server", value: "current" },
            { name: "All servers (bot owner only)", value: "all" }
          )
          .setRequired(false)
      )
  );

module.exports = {
  data,
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
