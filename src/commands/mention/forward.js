const core = require("../core/forward");
module.exports = async function(client, context) {
  return core.run(client, context);
};
