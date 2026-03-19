const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/ping");
const data = new SlashCommandBuilder().setName("ping").setDescription("Ping");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
