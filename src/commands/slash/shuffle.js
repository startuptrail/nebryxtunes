const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/shuffle");
const data = new SlashCommandBuilder().setName("shuffle").setDescription("Shuffle");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
