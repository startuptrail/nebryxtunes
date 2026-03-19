const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/loop");
const data = new SlashCommandBuilder().setName("loop").setDescription("Loop mode");
data.addStringOption(function(o) { o.setName("mode"); o.setDescription("track or queue or none"); o.setRequired(false); return o; });
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
