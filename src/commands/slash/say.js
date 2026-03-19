const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/say");

const data = new SlashCommandBuilder()
  .setName("say")
  .setDescription("Make bot send your text")
  .addStringOption(option =>
    option
      .setName("text")
      .setDescription("Text to send")
      .setRequired(true)
      .setMaxLength(1800)
  );

module.exports = {
  data,
  execute: async function(c, ctx) {
    return core.run(c, ctx);
  }
};
