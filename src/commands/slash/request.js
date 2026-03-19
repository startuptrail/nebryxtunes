const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/request");
const data = new SlashCommandBuilder().setName("request").setDescription("Request track").addStringOption(o => o.setName("query").setDescription("URL or search").setRequired(true));
module.exports = { data, execute: async (c, ctx) => core.run(c, ctx) };
