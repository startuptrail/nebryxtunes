const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/autoplay");
const data = new SlashCommandBuilder().setName("autoplay").setDescription("Toggle autoplay");
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
