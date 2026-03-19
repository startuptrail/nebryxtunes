const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/uptime");
const data = new SlashCommandBuilder().setName("uptime").setDescription("Uptime");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
