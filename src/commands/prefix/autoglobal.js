const core = require("../core/autoglobal");
module.exports = {
  name: "autoglobal",
  aliases: ["agauto", "gauto"],
  execute: async function(client, ctx) {
    return core.run(client, ctx);
  }
};
