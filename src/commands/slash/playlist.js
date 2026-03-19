const { SlashCommandBuilder } = require("discord.js");
const create = require("../core/playlistCreate");
const add = require("../core/playlistAdd");
const remove = require("../core/playlistRemove");
const play = require("../core/playlistPlay");
const del = require("../core/playlistDelete");
const list = require("../core/playlistList");

const data = new SlashCommandBuilder().setName("playlist").setDescription("Manage playlists");
data.addSubcommand(function(s) {
  s.setName("create").setDescription("Create playlist");
  s.addStringOption(function(o) { o.setName("name").setDescription("Name").setRequired(true); return o; });
  return s;
});
data.addSubcommand(function(s) {
  s.setName("add").setDescription("Add queue to playlist");
  s.addStringOption(function(o) { o.setName("name").setDescription("Name").setRequired(true); return o; });
  return s;
});
data.addSubcommand(function(s) {
  s.setName("remove").setDescription("Remove track from playlist");
  s.addStringOption(function(o) { o.setName("name").setDescription("Name").setRequired(true); return o; });
  s.addIntegerOption(function(o) { o.setName("index").setDescription("Position").setRequired(true); return o; });
  return s;
});
data.addSubcommand(function(s) {
  s.setName("play").setDescription("Play playlist");
  s.addStringOption(function(o) { o.setName("name").setDescription("Name").setRequired(true); return o; });
  return s;
});
data.addSubcommand(function(s) {
  s.setName("delete").setDescription("Delete playlist");
  s.addStringOption(function(o) { o.setName("name").setDescription("Name").setRequired(true); return o; });
  return s;
});
data.addSubcommand(function(s) { s.setName("list").setDescription("List playlists"); return s; });

function execute(client, context) {
  const io = context.interaction && context.interaction.options;
  const sub = io && io.getSubcommand ? io.getSubcommand() : "";
  context.options = context.options || {};
  if (io && io.getString) context.options.name = io.getString("name");
  if (io && io.getInteger) context.options.index = io.getInteger("index");
  context.args = [sub, context.options.name, context.options.index].filter(Boolean).map(String);
  if (sub === "create") return create.run(client, context);
  if (sub === "add") return add.run(client, context);
  if (sub === "remove") return remove.run(client, context);
  if (sub === "play") return play.run(client, context);
  if (sub === "delete") return del.run(client, context);
  if (sub === "list") return list.run(client, context);
  return context.reply("Use a subcommand.");
}

module.exports = { data, execute };
