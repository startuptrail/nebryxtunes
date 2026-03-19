const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/filters");
const data = new SlashCommandBuilder().setName("filters").setDescription("Filters").addStringOption(o => o.setName("filter").setDescription("8d, nightcore, etc").setRequired(true)).addStringOption(o => o.setName("level").setDescription("For bassboost").setRequired(false));
module.exports = { data, execute: async (c, ctx) => core.run(c, ctx) };
