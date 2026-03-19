const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/songinfo");
const data = new SlashCommandBuilder().setName("songinfo").setDescription("Song info");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
