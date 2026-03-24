const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/image");

const data = new SlashCommandBuilder()
  .setName("image")
  .setDescription("Image generation command")
  .addStringOption(option =>
    option
      .setName("prompt")
      .setDescription("Image prompt")
      .setRequired(true)
      .setMaxLength(1000)
  );

module.exports = {
  data,
  execute: async function(c, ctx) {
    return core.run(c, ctx);
  }
};
