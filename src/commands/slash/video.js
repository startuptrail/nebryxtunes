const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/video");

const data = new SlashCommandBuilder()
  .setName("video")
  .setDescription("Generate an AI video using Grok")
  .addStringOption(option =>
    option
      .setName("prompt")
      .setDescription("Video prompt")
      .setRequired(true)
      .setMaxLength(1000)
  );

module.exports = {
  data,
  execute: async function(c, ctx) {
    return core.run(c, ctx);
  }
};
