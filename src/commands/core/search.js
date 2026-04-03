const { getOrCreatePlayer, requireVoice, startPlaybackAndWait, shouldAttemptPlayback } = require("../../lib/playerHelpers");

const SEARCH_PICK_TIMEOUT_MS = 2 * 60 * 1000;

function getSelectionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getSelectionStore(client) {
  if (!client.searchSelections) client.searchSelections = new Map();
  return client.searchSelections;
}

function setSelection(client, guildId, userId, channelId, tracks) {
  const store = getSelectionStore(client);
  store.set(getSelectionKey(guildId, userId), {
    channelId,
    tracks,
    expiresAt: Date.now() + SEARCH_PICK_TIMEOUT_MS
  });
}

function getSelection(client, guildId, userId) {
  const store = getSelectionStore(client);
  const key = getSelectionKey(guildId, userId);
  const pending = store.get(key);
  if (!pending) return null;
  if (Date.now() > pending.expiresAt) {
    store.delete(key);
    return null;
  }
  return pending;
}

function clearSelection(client, guildId, userId) {
  const store = getSelectionStore(client);
  store.delete(getSelectionKey(guildId, userId));
}

async function waitForPlayerConnection(player, timeoutMs = 3000) {
  const endAt = Date.now() + timeoutMs;
  while (Date.now() < endAt) {
    if (player?.connected) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return !!player?.connected;
}

async function tryHandleSelectionMessage(client, message) {
  if (!message?.guild || !message?.author || message.author.bot) return false;
  const guildId = message.guild.id;
  const userId = message.author.id;
  const pending = getSelection(client, guildId, userId);
  if (!pending) return false;
  if (pending.channelId !== message.channel.id) return false;

  const value = String(message.content || "").trim();
  if (!/^\d+$/.test(value)) return false;

  const index = Number(value);
  const tracks = Array.isArray(pending.tracks) ? pending.tracks : [];
  if (index < 1 || index > tracks.length) {
    await message.reply(`Pick a valid number between 1 and ${tracks.length}.`).catch(() => {});
    return true;
  }

  const voice = requireVoice({ member: message.member });
  if (!voice.ok) {
    await message.reply(voice.message).catch(() => {});
    return true;
  }

  const selected = tracks[index - 1];
  if (!selected) {
    await message.reply("That search result is no longer available. Search again.").catch(() => {});
    clearSelection(client, guildId, userId);
    return true;
  }

  const player = getOrCreatePlayer(client, guildId, voice.voiceChannelId, message.channel.id, true);
  if (selected.info) selected.info.requester = message.author;
  player.queue.add(selected);
  const title = selected.info?.title || "Track";
  await message.reply(`Added **${title}**.`).catch(() => {});
  if (shouldAttemptPlayback(player)) {
    const connected = await waitForPlayerConnection(player, 3000);
    if (!connected) {
      await message.reply("Track added but voice connection is not ready yet. Try again in 2-3 seconds.").catch(() => {});
      clearSelection(client, guildId, userId);
      return true;
    }
    try {
      const started = await startPlaybackAndWait(client, player, 9000);
      if (!started.ok) {
        await message.reply(`Track added but playback did not start (${started.reason}). Try \`!play <song>\` once.`).catch(() => {});
      }
    } catch {
      await message.reply("Track added but playback did not start. Try `!play <song>` once.").catch(() => {});
    }
  }
  clearSelection(client, guildId, userId);
  return true;
}

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);

  const query = context.args.join(" ").trim() || (context.options?.query ?? "");
  if (!query) return context.reply("Provide a search query.");

  const resolve = await client.riffy.resolve({
    query: query.startsWith("ytsearch:") ? query : `ytsearch:${query}`,
    requester: context.interaction?.user ?? context.message?.author
  });

  const tracks = resolve.tracks || [];
  if (!tracks.length) return context.reply("No results found.");

  const max = 5;
  const top = tracks.slice(0, max);
  const list = top.map((track, index) => `${index + 1}. **${track.info?.title || "Unknown"}**`).join("\n");

  const userId = context.userId || context.message?.author?.id || context.interaction?.user?.id;
  if (context.guildId && userId && context.channelId) {
    setSelection(client, context.guildId, userId, context.channelId, top);
  }

  await context.reply(`**Search results:**\n${list}\nReply with a number (1-${max}) to play, or use \`play <query>\` to play directly.`);
}

module.exports = { run, tryHandleSelectionMessage };
