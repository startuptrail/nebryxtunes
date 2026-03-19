const core = require("../core/search");
module.exports = async function(client, context) {
  return core.run(client, context);
};
