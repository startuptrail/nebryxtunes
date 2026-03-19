const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/shortcuts");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("shortcuts")
    .setDescription("Show prefix shortcuts"),
  execute: async (client, context) => core.run(client, context)
};
