const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/voteskip");
module.exports = {
  data: new SlashCommandBuilder().setName("voteskip").setDescription("Vote to skip the current track"),
  execute: async (client, context) => core.run(client, context)
};
