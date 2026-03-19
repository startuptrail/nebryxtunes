const core = require("../core/loop");
module.exports = async function(client, context) {
  return core.run(client, context);
};
