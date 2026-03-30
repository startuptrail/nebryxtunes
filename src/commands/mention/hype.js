const core = require("../core/hype");

module.exports = {
  name: "hype",
  execute: async function(client, context) {
    return core.run(client, context);
  }
};

