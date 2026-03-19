const play = require("./play");
async function run(client, context) {
  return play.run(client, context);
}

module.exports = { run };
