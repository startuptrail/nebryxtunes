const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/resume");
const data = new SlashCommandBuilder().setName("resume").setDescription("Resume");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
