const Playlist = require("../../database/models/Playlist");

async function run(client, context) {
  const name = (context.args.join(" ").trim() || context.options?.name || "").slice(0, 64);
  if (!name) return context.reply("Provide a playlist name.");
  const userId = context.userId || context.interaction?.user?.id || context.message?.author?.id;
  const result = await Playlist.deleteOne({ userId, name });
  if (!result.deletedCount) return context.reply("Playlist not found.");
  await context.reply(`Deleted playlist **${name}**.`);
}

module.exports = { run };
