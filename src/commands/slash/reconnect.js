const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/reconnect");
module.exports = {
  data: new SlashCommandBuilder().setName("reconnect").setDescription("Reconnect the player"),
  execute: async (client, context) => core.run(client, context)
};
