const create = require("../core/playlistCreate");
const add = require("../core/playlistAdd");
const remove = require("../core/playlistRemove");
const play = require("../core/playlistPlay");
const del = require("../core/playlistDelete");
const list = require("../core/playlistList");
module.exports = async function(client, context) {
  var a = (context.args[0] || "").toLowerCase();
  context.args = context.args.slice(1);
  if (a === "create") return create.run(client, context);
  if (a === "add") return add.run(client, context);
  if (a === "remove") return remove.run(client, context);
  if (a === "play") return play.run(client, context);
  if (a === "delete") return del.run(client, context);
  if (a === "list") return list.run(client, context);
  return context.reply("Usage: playlist create|add|remove|play|delete|list");
};
