const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/lyrics");
const data = new SlashCommandBuilder().setName("lyrics").setDescription("Lyrics");
data.addStringOption(function(o) { o.setName("query"); o.setDescription("Song"); o.setRequired(false); return o; });
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
