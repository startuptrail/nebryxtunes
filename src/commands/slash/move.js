const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/move");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("move")
    .setDescription("Move the player to your voice channel")
    .addChannelOption(o => o.setName("channel").setDescription("Voice channel").setRequired(false)),
  execute: async (client, context) => core.run(client, context)
};
