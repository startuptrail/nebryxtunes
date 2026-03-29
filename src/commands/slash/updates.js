const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/updates");

const data = new SlashCommandBuilder()
  .setName("updates")
  .setDescription("Show version updates and changelog")
  .addStringOption((o) =>
    o
      .setName("version")
      .setDescription("Choose a version")
      .addChoices(
        { name: "Latest", value: "latest" },
        { name: "v3", value: "v3" },
        { name: "v2", value: "v2" },
        { name: "v1", value: "v1" },
        { name: "Maintenance", value: "maintenance" }
      )
      .setRequired(false)
  );

module.exports = {
  data,
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
