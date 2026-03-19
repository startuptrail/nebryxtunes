const core = require("../core/nowplaying");
module.exports = async function(client, context) {
  return core.run(client, context);
};
