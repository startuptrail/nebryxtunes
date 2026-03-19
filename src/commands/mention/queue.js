const coreQueue = require("../core/queue");
const coreQueueClear = require("../core/queueClear");
module.exports = async function(client, context) {
  var a = (context.args[0] || "").toLowerCase();
  if (a === "clear") return coreQueueClear.run(client, context);
  return coreQueue.run(client, context);
};
