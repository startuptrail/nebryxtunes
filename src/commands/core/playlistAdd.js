const { requirePlayer } = require("../../lib/playerHelpers");
const Playlist = require("../../database/models/Playlist");

async function run(client, context) {
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const name = (context.args[0] || context.options?.name || "").trim().slice(0, 64);
  if (!name) return context.reply("Provide a playlist name.");
  const userId = context.userId || context.interaction?.user?.id || context.message?.author?.id;
  const playlist = await Playlist.findOne({ userId, name });
  if (!playlist) return context.reply("Playlist not found.");
  const current = player.current;
  const queue = player.queue;
  const arr = Array.isArray(queue) ? queue : (queue.queue ?? []);
  const toAdd = current ? [current, ...arr] : [...arr];
  const tracks = toAdd.map(t => ({ identifier: t.info?.identifier ?? t.identifier, title: t.info?.title ?? t.title, length: t.info?.length ?? t.length })).filter(Boolean);
  if (!tracks.length) return context.reply("No tracks to add (play something first).");
  playlist.tracks.push(...tracks);
  await playlist.save();
  await context.reply(`Added **${tracks.length}** track(s) to **${name}**.`);
}

module.exports = { run };
