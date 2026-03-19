const moderationText = require("../core/moderationText");

module.exports = {
  name: "kick",
  aliases: ["kic"],
  execute: async (client, context) => moderationText.run(client, context, "KICK")
};
