const moderationText = require("../core/moderationText");

module.exports = {
  name: "ban",
  execute: async (client, context) => moderationText.run(client, context, "BAN")
};
