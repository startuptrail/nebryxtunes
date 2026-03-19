const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/history");
const data = new SlashCommandBuilder().setName("history").setDescription("History");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
