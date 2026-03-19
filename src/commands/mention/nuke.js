const moderationText = require("../core/moderationText");

module.exports = {
  name: "nuke",
  execute: async (client, context) => moderationText.run(client, context, "NUKE")
};
