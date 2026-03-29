const core = require("../core/maintance");

module.exports = {
  name: "maintance",
  aliases: ["maintenance"],
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
