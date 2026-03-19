const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/nowplaying");
const data = new SlashCommandBuilder().setName("nowplaying").setDescription("Current");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
