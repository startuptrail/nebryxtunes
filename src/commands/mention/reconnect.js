const core = require("../core/reconnect");
module.exports = async function(client, context) {
  return core.run(client, context);
};
