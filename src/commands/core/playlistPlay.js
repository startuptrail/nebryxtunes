const { getOrCreatePlayer, requireVoice, startPlaybackAndWait, shouldAttemptPlayback } = require("../../lib/playerHelpers");
const Playlist = require("../../database/models/Playlist");

async function waitForPlayerConnection(player, timeoutMs = 3500) {
  const endAt = Date.now() + timeoutMs;
  while (Date.now() < endAt) {
    if (player?.connected) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return !!player?.connected;
}

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const name = (context.args.join(" ").trim() || context.options?.name || "").slice(0, 64);
  if (!name) return context.reply("Provide a playlist name.");
  const userId = context.userId || context.interaction?.user?.id || context.message?.author?.id;
  const playlist = await Playlist.findOne({ userId, name });
  if (!playlist || !playlist.tracks?.length) return context.reply("Playlist not found or empty.");
  const player = getOrCreatePlayer(client, context.guildId, voice.voiceChannelId, context.channelId, true);
  const requester = context.interaction?.user ?? context.message?.author;
  let added = 0;
  for (const t of playlist.tracks) {
    const query = t.identifier || t.uri || `${t.title}`;
    const resolve = await client.riffy.resolve({ query, requester });
    const tracks = resolve.tracks || [];
    if (tracks[0]) {
      tracks[0].info.requester = requester;
      player.queue.add(tracks[0]);
      added++;
    }
  }
  if (shouldAttemptPlayback(player)) {
    await waitForPlayerConnection(player, 3500);
    const started = await startPlaybackAndWait(client, player, 9000);
    if (!started.ok) {
      await context.reply(`⚠️ Added tracks but playback did not start (${started.reason}).`);
      return;
    }
  }
  await context.reply(`Added **${added}** track(s) from **${name}**.`);
}

module.exports = { run };
