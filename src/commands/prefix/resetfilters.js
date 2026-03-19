const core = require("../core/filters");
module.exports = async function(client, context) {
  context.args = ["reset"];
  return core.run(client, context);
};
