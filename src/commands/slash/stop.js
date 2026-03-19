const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/stop");
const data = new SlashCommandBuilder().setName("stop").setDescription("Stop player");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
