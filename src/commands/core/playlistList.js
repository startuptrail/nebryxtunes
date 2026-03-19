const Playlist = require("../../database/models/Playlist");

async function run(client, context) {
  const userId = context.userId || context.interaction?.user?.id || context.message?.author?.id;
  const list = await Playlist.find({ userId }).lean();
  if (!list.length) return context.reply("You have no playlists.");
  const lines = list.map(p => `• **${p.name}** — ${(p.tracks?.length ?? 0)} track(s)`).join("\n");
  await context.reply(`**Your playlists:**\n${lines}`);
}

module.exports = { run };
