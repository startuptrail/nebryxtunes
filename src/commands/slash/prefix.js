const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/prefix");
const data = new SlashCommandBuilder()
  .setName("prefix")
  .setDescription("View or change the server prefix")
  .addStringOption(o => o.setName("value").setDescription("New prefix").setRequired(false));
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
