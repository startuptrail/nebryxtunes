const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/pause");
const data = new SlashCommandBuilder().setName("pause").setDescription("Pause");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
