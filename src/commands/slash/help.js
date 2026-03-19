const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/help");
const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Help")
  .addStringOption(o => o.setName("query").setDescription("Category or command").setRequired(false));
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
