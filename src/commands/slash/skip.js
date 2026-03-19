const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/skip");
const data = new SlashCommandBuilder().setName("skip").setDescription("Skip");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
