const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/hype");

const data = new SlashCommandBuilder()
  .setName("hype")
  .setDescription("Hype the currently playing song");

module.exports = {
  data,
  execute: async function(client, context) {
    return core.run(client, context);
  }
};

