const moderationText = require("../core/moderationText");

module.exports = {
  name: "ban",
  aliases: [],
  execute: async (client, context) => moderationText.run(client, context, "BAN")
};
