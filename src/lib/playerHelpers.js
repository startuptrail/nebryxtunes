const config = require("../../config");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getNowPlayingFooter } = require("./branding");

function getPrefix(client, guildId) {
  return (client.guildPrefixes && client.guildPrefixes.get(guildId)) || config.prefix;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hasUsableVoiceConnection(player) {
  if (!player) return false;
  const connection = player.connection;
  if (!connection) return !!player.connected;
  return !!(
    player.connected
    && connection.isReady
    && !connection.pendingUpdate
    && !connection.establishing
    && player.voiceChannel
  );
}

function getOrCreatePlayer(client, guildId, voiceChannelId, textChannelId, deaf = true) {
  const safeConnect = (targetPlayer) => {
    if (!targetPlayer || typeof targetPlayer.connect !== "function") return;
    try {
      const maybePromise = targetPlayer.connect({
        guildId,
        voiceChannel: voiceChannelId,
        deaf,
        mute: false
      });
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => {});
      }
    } catch (_) {}
  };

  let player = client.riffy.players.get(guildId);
  if (player) {
    if (player.voiceChannel !== voiceChannelId) {
      player.setVoiceChannel(voiceChannelId, { deaf, mute: false });
    }
    if (textChannelId) player.setTextChannel(textChannelId);
    if (typeof player.connect === "function" && player.connected === false) {
      safeConnect(player);
    }
    return player;
  }
  player = client.riffy.createConnection({
    guildId,
    voiceChannel: voiceChannelId,
    textChannel: textChannelId,
    deaf
  });
  safeConnect(player);
  return player;
}

function getPlayer(client, guildId) {
  return client.riffy.players.get(guildId) || null;
}

function requireVoice(context) {
  const vc = context.member?.voice?.channel;
  if (!vc) return { ok: false, message: "❌ You must be in a voice channel." };
  const me = context.guild?.members?.me;
  const perms = vc.permissionsFor?.(me);
  if (perms) {
    if (!perms.has("ViewChannel")) return { ok: false, message: "I need **View Channel** permission in your voice channel." };
    if (!perms.has("Connect")) return { ok: false, message: "I need **Connect** permission in your voice channel." };
    if (!perms.has("Speak")) return { ok: false, message: "I need **Speak** permission in your voice channel." };
  }
  return { ok: true, voiceChannelId: vc.id };
}

function requirePlayer(client, guildId) {
  const player = getPlayer(client, guildId);
  if (!player) return { ok: false, message: "No player in this server." };
  return { ok: true, player };
}

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "0:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getRequesterText(requester) {
  if (!requester) return "Unknown";
  const mention = requester.id ? `<@${requester.id}>` : "Unknown";
  const name = requester.username || requester.tag || requester.displayName || "";
  return name ? `${mention} • ${name}` : mention;
}

function getArtworkUrl(track) {
  return track?.info?.artworkUrl || track?.info?.thumbnail || track?.artworkUrl || track?.thumbnail || null;
}

function getSourceUrl(track) {
  return track?.info?.uri || track?.info?.url || track?.uri || track?.url || null;
}

function getLoopText(player) {
  const loop = player?.loop;
  if (!loop) return "none";
  if (loop === "track") return "track";
  if (loop === "queue") return "queue";
  return "none";
}

function getVolume(player) {
  if (typeof player?.volume === "number") return player.volume;
  return 100;
}

function isMuted(player) {
  const volume = getVolume(player);
  return player?.muted === true || volume === 0;
}

function buildNowPlayingPayload(client, player) {
  const track = player?.current;
  if (!track) return null;
  const info = track.info || track;
  const requester = info.requester || track.requester;
  const duration = formatDuration(info.length);
  const volume = getVolume(player);
  const loopText = getLoopText(player);
  const artwork = getArtworkUrl(track);
  const sourceUrl = getSourceUrl(track);
  const paused = !!player.paused;
  const muted = isMuted(player);

  const avatar = client?.user?.displayAvatarURL?.({ size: 128, extension: "png" });
  const embed = {
    color: 0x5865f2,
    title: info.title || "Unknown",
    description: "🎶 _Enjoying the vibes? Type more song names below to keep the party going!_",
    fields: [
      { name: "🎵 Artist", value: info.author || "Unknown", inline: true },
      { name: "👤 Requested by", value: getRequesterText(requester), inline: true },
      { name: "⏱️ Duration", value: duration, inline: true },
      { name: "🔁 Loop", value: loopText, inline: true },
      { name: "🔊 Volume", value: `${volume}%`, inline: true }
    ],
    footer: { text: getNowPlayingFooter(), icon_url: avatar || undefined },
    timestamp: new Date().toISOString()
  };

  if (artwork) embed.thumbnail = { url: artwork };
  if (sourceUrl) embed.url = sourceUrl;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("np_prev").setEmoji("⏮️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("np_pause").setEmoji(paused ? "▶️" : "⏸️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("np_next").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("np_stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("np_queue").setEmoji("📜").setStyle(ButtonStyle.Secondary)
  );

  const supportUrl = config.supportUrl || "https://example.com";
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("np_loop").setLabel("Loop").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("np_vol_down").setEmoji("🔉").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("np_mute").setEmoji(muted ? "🔇" : "🔈").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("np_vol_up").setEmoji("🔊").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("np_shuffle").setEmoji("🔀").setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("np_hype").setEmoji("🌟").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("np_lyrics").setEmoji("📝").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("np_clear").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setLabel("Support").setStyle(ButtonStyle.Link).setURL(supportUrl)
  );

  return { embeds: [embed], components: [row1, row2, row3] };
}

async function sendNowPlayingMessage(client, player) {
  const payload = buildNowPlayingPayload(client, player);
  if (!payload) return;
  const channelId = player?.textChannel;
  if (!channelId) return;
  const channel = client.channels.cache.get(channelId);
  if (!channel || typeof channel.send !== "function") return;
  const existingEntry = client.nowPlayingMessages?.get(player.guildId);
  const existingId = typeof existingEntry === "string" ? existingEntry : existingEntry?.messageId;
  const existingChannelId = typeof existingEntry === "object" && existingEntry?.channelId ? existingEntry.channelId : channelId;
  const existingChannel = client.channels.cache.get(existingChannelId) || channel;
  if (existingId && existingChannel?.messages?.fetch) {
    const existing = await existingChannel.messages.fetch(existingId).catch(() => null);
    if (existing) {
      await existing.edit(payload).catch(() => {});
      return;
    }
  }
  const sent = await channel.send(payload).catch(() => null);
  if (sent) {
    if (!client.nowPlayingMessages) client.nowPlayingMessages = new Map();
    client.nowPlayingMessages.set(player.guildId, { channelId: channel.id, messageId: sent.id });
  }
}

async function updateNowPlayingMessage(client, player, message) {
  const payload = buildNowPlayingPayload(client, player);
  if (!payload || !message) return;
  if (typeof message.edit === "function") {
    await message.edit(payload).catch(() => {});
  }
}

async function clearNowPlayingMessage(client, player) {
  const entry = client.nowPlayingMessages?.get(player.guildId);
  const savedChannelId = typeof entry === "object" ? entry?.channelId : null;
  const savedMessageId = typeof entry === "object" ? entry?.messageId : entry;
  const channelId = savedChannelId || player?.textChannel;
  if (!channelId) return;
  const channel = client.channels.cache.get(channelId);
  if (!channel || typeof channel.messages?.fetch !== "function") return;
  const existingId = savedMessageId;
  if (!existingId) return;
  const existing = await channel.messages.fetch(existingId).catch(() => null);
  if (existing) {
    await existing.delete().catch(() => {});
  }
  client.nowPlayingMessages?.delete(player.guildId);
}

async function awaitPlaybackStart(client, player, timeoutMs = 8000) {
  if (!client?.riffy || !player?.guildId) return { ok: !!player?.playing, reason: "invalid_state" };
  const guildId = player.guildId;
  let timer = null;
  let settled = false;

  return new Promise((resolve) => {
    const finish = (ok, reason) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      client.riffy.off("trackStart", onTrackStart);
      client.riffy.off("trackError", onTrackError);
      client.riffy.off("trackStuck", onTrackStuck);
      client.riffy.off("queueEnd", onQueueEnd);
      resolve({ ok, reason });
    };

    const isSameGuild = (p) => p?.guildId === guildId;
    const onTrackStart = (p) => { if (isSameGuild(p)) finish(true, "trackStart"); };
    const onTrackError = (p, _track, payload) => {
      if (!isSameGuild(p)) return;
      const msg = String(payload?.exception?.message || payload?.error || payload?.cause || "trackError");
      finish(false, msg.slice(0, 200));
    };
    const onTrackStuck = (p) => { if (isSameGuild(p)) finish(false, "trackStuck"); };
    const onQueueEnd = (p) => { if (isSameGuild(p)) finish(false, "queueEnd"); };

    client.riffy.on("trackStart", onTrackStart);
    client.riffy.on("trackError", onTrackError);
    client.riffy.on("trackStuck", onTrackStuck);
    client.riffy.on("queueEnd", onQueueEnd);

    timer = setTimeout(async () => {
      // Final fallback check in case event was missed but playback actually started.
      for (let i = 0; i < 8; i++) {
        if (player.playing && (player.position > 0 || player.paused)) return finish(true, "state");
        await wait(120);
      }
      finish(false, "start_timeout");
    }, Math.max(1500, timeoutMs));
  });
}

async function waitForVoiceConnectionReady(player, timeoutMs = 8000) {
  if (!player) return { ok: false, reason: "invalid_player" };
  const endAt = Date.now() + Math.max(1000, timeoutMs);
  while (Date.now() < endAt) {
    if (hasUsableVoiceConnection(player)) return { ok: true, reason: "ready" };
    await wait(100);
  }
  const connection = player.connection;
  const reason = !player.voiceChannel
    ? "missing_voice_channel"
    : !player.connected
      ? "player_not_connected"
      : !connection?.voice?.sessionId
        ? "missing_session_id"
        : !connection?.voice?.endpoint
          ? "missing_endpoint"
          : !connection?.voice?.token
            ? "missing_token"
            : connection?.pendingUpdate
              ? "voice_update_pending"
              : connection?.establishing
                ? "voice_not_confirmed"
                : "voice_not_ready";
  return { ok: false, reason };
}

function shouldAttemptPlayback(player) {
  if (!player) return false;
  if (player.paused) return true;
  if (!player.current) return true;
  return !player.playing;
}

async function recoverPlaybackState(player) {
  if (!player) return;
  if (player.paused && typeof player.pause === "function") {
    try { await player.pause(false); } catch (_) {}
  }
  const currentVolume = typeof player.volume === "number" ? player.volume : 100;
  if ((player.muted === true || currentVolume === 0) && typeof player.setVolume === "function") {
    const restore = typeof player._prevVolume === "number" && player._prevVolume > 0 ? player._prevVolume : 100;
    try { player.setVolume(restore); } catch (_) {}
    player.muted = false;
  }
}

async function startPlaybackAndWait(client, player, timeoutMs = 8000) {
  const connection = await waitForVoiceConnectionReady(player, Math.min(timeoutMs, 8000));
  if (!connection.ok) return connection;
  await recoverPlaybackState(player);
  try {
    const maybePromise = player.play();
    if (maybePromise && typeof maybePromise.then === "function") await maybePromise;
  } catch (error) {
    return { ok: false, reason: String(error?.message || "play_failed").slice(0, 200) };
  }
  return await awaitPlaybackStart(client, player, timeoutMs);
}

module.exports = {
  getPrefix,
  getOrCreatePlayer,
  getPlayer,
  requireVoice,
  requirePlayer,
  buildNowPlayingPayload,
  sendNowPlayingMessage,
  updateNowPlayingMessage,
  clearNowPlayingMessage,
  awaitPlaybackStart,
  waitForVoiceConnectionReady,
  startPlaybackAndWait,
  shouldAttemptPlayback,
  recoverPlaybackState,
  hasUsableVoiceConnection
};
