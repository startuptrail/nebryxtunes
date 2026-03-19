const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/jump");
const data = new SlashCommandBuilder().setName("jump").setDescription("Jump to position");
data.addIntegerOption(function(o) { o.setName("position"); o.setDescription("Position"); o.setRequired(true); return o; });
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
