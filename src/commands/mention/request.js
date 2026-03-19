const core = require("../core/request");
module.exports = async function(client, context) {
  return core.run(client, context);
};
