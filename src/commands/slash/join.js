const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/join");
const data = new SlashCommandBuilder().setName("join").setDescription("Join VC");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
