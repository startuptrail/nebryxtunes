const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/forward");
const data = new SlashCommandBuilder().setName("forward").setDescription("Forward by seconds");
data.addIntegerOption(function(o) {
  o.setName("seconds");
  o.setDescription("Seconds");
  o.setRequired(false);
  return o;
});
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
