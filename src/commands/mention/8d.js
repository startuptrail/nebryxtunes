const core = require("../core/filters");
module.exports = async function(client, context) {
  context.args = ["8d"].concat(context.args || []);
  return core.run(client, context);
};
