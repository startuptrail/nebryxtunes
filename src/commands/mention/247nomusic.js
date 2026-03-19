const core = require("../core/twentyFourSeven");

module.exports = async function(client, context) {
  context.args = ["nomusic"];
  return core.run(client, context);
};
