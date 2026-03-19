const core = require("../core/rewind");
module.exports = async function(client, context) {
  return core.run(client, context);
};
