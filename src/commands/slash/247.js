const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/twentyFourSeven");
const data = new SlashCommandBuilder()
  .setName("247")
  .setDescription("Manage 24/7 voice mode")
  .addStringOption(option =>
    option
      .setName("mode")
      .setDescription("music, nomusic, off, or status")
      .setRequired(false)
      .addChoices(
        { name: "music", value: "music" },
        { name: "no music", value: "nomusic" },
        { name: "off", value: "off" },
        { name: "status", value: "status" }
      )
  );
module.exports = { data, execute: async function(c, ctx) { return core.run(c, ctx); } };
