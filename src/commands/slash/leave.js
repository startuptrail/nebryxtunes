const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/leave");
const data = new SlashCommandBuilder().setName("leave").setDescription("Leave VC");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
