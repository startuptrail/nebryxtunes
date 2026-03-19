const core = require("../core/filters");
module.exports = async function(client, context) {
  context.args = ["bassboost"].concat(context.args || []);
  return core.run(client, context);
};
