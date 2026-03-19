const core = require("../core/nowplaying");

module.exports = {
  name: "nowplaying",
  aliases: ["np"],
  execute: async function(client, context) {
    return core.run(client, context);
  }
};
