const core = require("../core/twentyFourSeven");

module.exports = async function(client, context) {
  context.args = ["off"];
  return core.run(client, context);
};
