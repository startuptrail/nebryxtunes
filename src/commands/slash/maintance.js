const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/maintance");

const data = new SlashCommandBuilder()
  .setName("maintance")
  .setDescription("Post maintenance downtime update (owner only)")
  .addStringOption((o) =>
    o
      .setName("downtime")
      .setDescription("Downtime time, e.g. 2 hours or 10:00 PM - 11:30 PM IST")
      .setRequired(true)
  );

module.exports = {
  data,
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
