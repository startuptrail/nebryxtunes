const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/maintance");

const data = new SlashCommandBuilder()
  .setName("maintance")
  .setDescription("Global maintenance control (owner only)")
  .addSubcommand((sub) =>
    sub
      .setName("start")
      .setDescription("Start global maintenance mode")
      .addStringOption((o) =>
        o
          .setName("downtime")
          .setDescription("e.g. 15mins, 2 hours, or forever/unknown")
          .setRequired(false)
      )
      .addStringOption((o) =>
        o
          .setName("not_affected_cmds")
          .setDescription("Comma-separated commands allowed during maintenance. Example: help,ping,maintance")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("end")
      .setDescription("End global maintenance mode")
  )
  .addSubcommand((sub) =>
    sub
      .setName("status")
      .setDescription("Show maintenance mode status")
  );

module.exports = {
  data,
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
