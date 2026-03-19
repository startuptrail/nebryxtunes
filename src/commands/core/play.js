const { getOrCreatePlayer, requireVoice } = require("../../lib/playerHelpers");

function parseQuery(input) {
  const value = String(input || "").trim();
  if (!value) return { query: "", source: null, isUrl: false };

  if (/^https?:\/\//i.test(value) || /^www\./i.test(value)) {
    return { query: value, source: null, isUrl: true };
  }

  const prefixMatch = value.match(/^(ytsearch|ytmsearch|scsearch):/i);
  if (prefixMatch) {
    return {
      query: value.slice(prefixMatch[0].length).trim(),
      source: prefixMatch[1].toLowerCase(),
      isUrl: false
    };
  }

  return { query: value, source: "ytmsearch", isUrl: false };
}

function isNodeUnavailableError(error) {
  const msg = String(error?.message || error || "");
  return /no\s+(available\s+)?nodes?|node\s+(disconnected|unavailable|not\s+connected)/i.test(msg);
}

async function ensureConnectedPlayer(player, voiceChannelId, guildId) {
  if (!player) return false;
  if (player.connected) return true;
  if (typeof player.connect === "function") {
    try { await player.connect({ guildId, voiceChannel: voiceChannelId, deaf: true, mute: false }); }
    catch (_) {}
  }
  const endAt = Date.now() + 3500;
  while (Date.now() < endAt) {
    if (player.connected) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return !!player.connected;
}

async function startPlayback(player) {
  if (!player) return false;
  try {
    const r = player.play();
    if (r && typeof r.then === "function") await r;
  } catch (e) {
    console.error("[PLAY] play() threw:", e?.message || e);
    return false;
  }
  const endAt = Date.now() + 3000;
  while (Date.now() < endAt) {
    if (player.playing) return true;
    await new Promise(r => setTimeout(r, 120));
  }
  return !!player.playing;
}

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);

  const rawInput = context.args.join(" ").trim() || (context.options?.query ?? "");
  const rawQuery = String(rawInput || "").trim();
  if (!rawQuery) return context.reply("❌ Provide a search query or URL.");

  const { query, source, isUrl } = parseQuery(rawQuery);
  if (!query) return context.reply("❌ Provide a search query or URL.");

  const player = getOrCreatePlayer(client, context.guildId, voice.voiceChannelId, context.channelId, true);
  const requester = context.interaction?.user ?? context.message?.author;

  let resolve;
  try {
    resolve = await client.riffy.resolve({ query, source: source || undefined, requester });
    console.log(`[PLAY] loadType=${resolve.loadType} tracks=${resolve.tracks?.length} query="${query}" source=${source || "ytmsearch"}`);
  } catch (err) {
    console.error("[PLAY] resolve error:", err?.message || err);
    if (isNodeUnavailableError(err)) return context.reply("❌ Lavalink not ready. Try again in a moment.");
    if (isUrl) return context.reply("❌ Failed to load that URL.");
    const altSource = source === "ytmsearch" ? "ytsearch" : "ytmsearch";
    try {
      resolve = await client.riffy.resolve({ query, source: altSource, requester });
    } catch (err2) {
      if (isNodeUnavailableError(err2)) return context.reply("❌ Lavalink not ready. Try again in a moment.");
      return context.reply("❌ Search failed. Try again.");
    }
  }

  const { loadType, tracks, playlistInfo } = resolve;

  if (loadType === "playlist" && Array.isArray(tracks) && tracks.length) {
    for (const track of tracks) {
      if (track.info) track.info.requester = requester;
      player.queue.add(track);
    }
    const name = playlistInfo?.name || "Playlist";
    await context.reply(`✅ Added **${tracks.length}** tracks from **${name}**.`);
    if (!player.playing && !player.paused) {
      const connected = await ensureConnectedPlayer(player, voice.voiceChannelId, context.guildId);
      if (!connected) return context.reply("⚠️ Voice connection not ready. Try again in 2-3 seconds.");
      const started = await startPlayback(player);
      if (!started) return context.reply("⚠️ Playback failed to start. Try `skip` or `play` again.");
    }
    return;
  }

  if ((loadType === "search" || loadType === "track") && Array.isArray(tracks) && tracks.length) {
    const track = tracks[0];
    if (track.info) track.info.requester = requester;
    player.queue.add(track);
    const title = track.info?.title || "Track";
    await context.reply(`✅ Added **${title}**.`);
    if (!player.playing && !player.paused) {
      const connected = await ensureConnectedPlayer(player, voice.voiceChannelId, context.guildId);
      if (!connected) return context.reply("⚠️ Voice connection not ready. Try again in 2-3 seconds.");
      const started = await startPlayback(player);
      if (!started) return context.reply("⚠️ Playback failed to start. Try `skip` or `play` again.");
    }
    return;
  }

  console.warn(`[PLAY] No results — loadType="${loadType}" tracks=${tracks?.length} query="${query}"`);
  await context.reply("❌ No results found. Try a different search or paste a direct YouTube link.");
}

module.exports = { run };