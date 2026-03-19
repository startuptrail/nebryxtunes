const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/stats");
const data = new SlashCommandBuilder().setName("stats").setDescription("Stats");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
