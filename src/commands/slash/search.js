const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/search");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search for tracks")
    .addStringOption(o => o.setName("query").setDescription("Search query").setRequired(true)),
  execute: async (client, context) => core.run(client, context)
};
