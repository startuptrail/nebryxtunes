const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/rewind");
const data = new SlashCommandBuilder().setName("rewind").setDescription("Rewind");
data.addIntegerOption(function(o) { o.setName("seconds"); o.setDescription("Sec"); o.setRequired(false); return o; });
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
