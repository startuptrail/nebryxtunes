const Playlist = require("../../database/models/Playlist");

async function run(client, context) {
  const name = (context.args[0] || context.options?.name || "").trim().slice(0, 64);
  const rawIndex = context.args[1] ?? context.options?.index ?? context.options?.position;
  if (!name) return context.reply("Provide a playlist name.");
  const index = parseInt(rawIndex, 10);
  if (isNaN(index) || index < 1) return context.reply("Provide a valid track position (e.g. 1).");
  const userId = context.userId || context.interaction?.user?.id || context.message?.author?.id;
  const playlist = await Playlist.findOne({ userId, name });
  if (!playlist) return context.reply("Playlist not found.");
  if (index > playlist.tracks.length) return context.reply("That position is not in the playlist.");
  playlist.tracks.splice(index - 1, 1);
  await playlist.save();
  await context.reply(`Removed track at position **${index}** from **${name}**.`);
}

module.exports = { run };
