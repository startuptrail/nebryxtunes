const { getOrCreatePlayer, requireVoice, startPlaybackAndWait, shouldAttemptPlayback, waitForVoiceConnectionReady } = require("../../lib/playerHelpers");

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

  return { query: value, source: "ytsearch", isUrl: false };
}

function isNodeUnavailableError(error) {
  const msg = String(error?.message || error || "");
  return /no\s+(available\s+)?nodes?|node\s+(disconnected|unavailable|not\s+connected)/i.test(msg);
}

async function ensureConnectedPlayer(player, voiceChannelId, guildId) {
  if (!player) return false;
  if (typeof player.connect === "function") {
    try { await player.connect({ guildId, voiceChannel: voiceChannelId, deaf: true, mute: false }); }
    catch (_) {}
  }
  const ready = await waitForVoiceConnectionReady(player, 5000);
  return ready.ok;
}

function getAlternateSources(source) {
  const preferred = source || "ytsearch";
  return ["ytsearch", "ytmsearch", "scsearch"].filter((item, index, list) => item && item !== preferred && list.indexOf(item) === index);
}

async function resolveWithFallbacks(client, query, source, requester, isUrl = false) {
  const attempts = [source || undefined, ...(!isUrl ? getAlternateSources(source) : [])];
  let lastError = null;

  for (const currentSource of attempts) {
    try {
      const resolved = await client.riffy.resolve({ query, source: currentSource, requester });
      const tracks = Array.isArray(resolved?.tracks) ? resolved.tracks : [];
      console.log(`[PLAY] loadType=${resolved?.loadType} tracks=${tracks.length} query="${query}" source=${currentSource || "default"}`);
      if (tracks.length || isUrl) {
        return { resolved, sourceUsed: currentSource || source || "default" };
      }
    } catch (error) {
      lastError = error;
      console.error(`[PLAY] resolve error (${currentSource || "default"}):`, error?.message || error);
      if (isNodeUnavailableError(error)) throw error;
    }
  }

  if (lastError) throw lastError;
  return { resolved: { loadType: "empty", tracks: [] }, sourceUsed: source || "default" };
}

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);

  const rawInput = context.args.join(" ").trim() || (context.options?.query ?? "");
  const rawQuery = String(rawInput || "").trim();
  if (!rawQuery) return context.reply("❌ Provide a search query or URL.");

  const { query, source, isUrl } = parseQuery(rawQuery);
  if (!query) return context.reply("❌ Provide a search query or URL.");

  let player;
  try {
    player = getOrCreatePlayer(client, context.guildId, voice.voiceChannelId, context.channelId, true);
  } catch (error) {
    if (isNodeUnavailableError(error)) {
      return context.reply("❌ Lavalink not ready. Try again in a moment.");
    }
    console.error("[PLAY] player create error:", error?.message || error);
    return context.reply("❌ Could not connect to music node right now. Try again in a moment.");
  }
  const requester = context.interaction?.user ?? context.message?.author;

  let resolve;
  let sourceUsed = source || "ytsearch";
  try {
    const result = await resolveWithFallbacks(client, query, source, requester, isUrl);
    resolve = result.resolved;
    sourceUsed = result.sourceUsed;
  } catch (err) {
    if (isNodeUnavailableError(err)) return context.reply("❌ Lavalink not ready. Try again in a moment.");
    return context.reply(isUrl ? "❌ Failed to load that URL." : "❌ Search failed. Try again.");
  }

  const { loadType, tracks, playlistInfo } = resolve;

  if (loadType === "playlist" && Array.isArray(tracks) && tracks.length) {
    for (const track of tracks) {
      if (track.info) track.info.requester = requester;
      player.queue.add(track);
    }
    const name = playlistInfo?.name || "Playlist";
    await context.reply(`✅ Added **${tracks.length}** tracks from **${name}**.`);
    if (shouldAttemptPlayback(player)) {
      const connected = await ensureConnectedPlayer(player, voice.voiceChannelId, context.guildId);
      if (!connected) return context.reply("⚠️ Voice connection not ready. Try again in 2-3 seconds.");
      const started = await startPlaybackAndWait(client, player, 9000);
      if (!started.ok) return context.reply(`⚠️ Playback failed to start (${started.reason}). Try \`play <song>\` again.`);
    }
    return;
  }

  if ((loadType === "search" || loadType === "track") && Array.isArray(tracks) && tracks.length) {
    const track = tracks[0];
    if (track.info) track.info.requester = requester;
    player.queue.add(track);
    const title = track.info?.title || "Track";
    await context.reply(`✅ Added **${title}**.`);
    if (shouldAttemptPlayback(player)) {
      const connected = await ensureConnectedPlayer(player, voice.voiceChannelId, context.guildId);
      if (!connected) return context.reply("⚠️ Voice connection not ready. Try again in 2-3 seconds.");
      const started = await startPlaybackAndWait(client, player, 9000);
      if (!started.ok) {
        // Automatic fallback: retry same query on an alternate source when initial stream fails.
        if (!isUrl) {
          const alternates = getAlternateSources(sourceUsed);
          for (const alt of alternates) {
            try {
              const retryResolve = await client.riffy.resolve({ query, source: alt, requester });
              const retryTrack = retryResolve?.tracks?.[0];
              if (!retryTrack) continue;
              if (typeof player.queue?.clear === "function") player.queue.clear();
              player.stop();
              if (retryTrack.info) retryTrack.info.requester = requester;
              player.queue.add(retryTrack);
              const retried = await startPlaybackAndWait(client, player, 9000);
              if (retried.ok) {
                await context.reply(`✅ Recovered playback using **${alt}**.`);
                return;
              }
            } catch (_) {}
          }
        }
        return context.reply(`⚠️ Playback failed to start (${started.reason}). Try another song/link.`);
      }
    }
    return;
  }

  console.warn(`[PLAY] No results — loadType="${loadType}" tracks=${tracks?.length} query="${query}"`);
  await context.reply("❌ No results found. Try a different search or paste a direct YouTube link.");
}

module.exports = { run };
