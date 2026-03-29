const core = require("../core/updates");
module.exports = {
  name: "updates",
  aliases: ["changelog", "news"],
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
