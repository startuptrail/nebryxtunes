const moderationText = require("../core/moderationText");

module.exports = {
  name: "purge",
  aliases: [],
  execute: async (client, context) => moderationText.run(client, context, "PURGE")
};
