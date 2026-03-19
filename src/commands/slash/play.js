const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/play");
const data = new SlashCommandBuilder();
data.setName("play");
data.setDescription("Play a track");
data.addStringOption(function(o) { o.setName("query"); o.setDescription("URL or search"); o.setRequired(true); return o; });
module.exports = { data, execute: async function(client, context) { return core.run(client, context); } };
