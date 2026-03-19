const core = require("../core/stop");
module.exports = async function(client, context) {
  return core.run(client, context);
};
