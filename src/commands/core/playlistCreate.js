const Playlist = require("../../database/models/Playlist");

async function run(client, context) {
  const name = (context.args.join(" ").trim() || context.options?.name || "").slice(0, 64);
  if (!name) return context.reply("Provide a playlist name.");
  const userId = context.userId || context.interaction?.user?.id || context.message?.author?.id;
  const existing = await Playlist.findOne({ userId, name });
  if (existing) return context.reply("A playlist with that name already exists.");
  await Playlist.create({ userId, name, tracks: [] });
  await context.reply(`Playlist **${name}** created.`);
}

module.exports = { run };
