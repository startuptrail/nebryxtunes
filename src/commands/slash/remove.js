const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/remove");
const data = new SlashCommandBuilder().setName("remove").setDescription("Remove track");
data.addIntegerOption(function(o) { o.setName("position"); o.setDescription("Position"); o.setRequired(true); return o; });
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
