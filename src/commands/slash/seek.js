const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/seek");
const data = new SlashCommandBuilder().setName("seek").setDescription("Seek to time");
data.addStringOption(function(o) {
  o.setName("position");
  o.setDescription("Time position");
  o.setRequired(true);
  return o;
});
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
