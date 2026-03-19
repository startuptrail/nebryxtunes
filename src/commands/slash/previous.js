const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/previous");
const data = new SlashCommandBuilder().setName("previous").setDescription("Previous track");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
