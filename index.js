const { Riffy } = require("riffy");
const { Player } = require("riffy/build/structures/Player");
const { Client, GatewayIntentBits, GatewayDispatchEvents, Partials, Collection, ActivityType } = require("discord.js");
const config = require("./config");
const pkg = require("./package.json");
const { connect } = require("./src/database/connect");
const { sendNowPlayingMessage, clearNowPlayingMessage } = require("./src/lib/playerHelpers");
const Guild = require("./src/database/models/Guild");
const { pickTrackByHype } = require("./src/lib/hypeService");
const { startDashboardServer } = require("./src/dashboard/server");
const { apply247StateToPlayer, normalize247Mode } = require("./src/lib/twentyFourSeven");
const { getBotName } = require("./src/lib/branding");

function patchRiffyPlayerEvents() {
  if (!Player || typeof Player.prototype?.handleEvent !== "function") return;
  if (Player.prototype.__botPatchedHandleEvent) return;

  const originalHandleEvent = Player.prototype.handleEvent;
  const ignoredEvents = new Set([
    "PlayerCreatedEvent",
    "PlayerConnectedEvent",
    "VolumeChangedEvent",
    "FiltersChangedEvent"
  ]);

  Player.prototype.handleEvent = async function patchedHandleEvent(payload) {
    if (ignoredEvents.has(payload?.type)) return;
    return originalHandleEvent.call(this, payload);
  };
  Player.prototype.__botPatchedHandleEvent = true;
}

patchRiffyPlayerEvents();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

process.on("uncaughtException", (error) => { console.error("Uncaught exception:", error); });
process.on("unhandledRejection", (reason) => { console.error("Unhandled rejection:", reason); });

client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection();
client.guildPrefixes = new Map();
client.nowPlayingMessages = new Map();
client.previousTracks = new Map();
client.idleTimeouts = new Map();
client.idleNoticeAt = new Map();
client.lastCommandChannel = new Map();
client.presenceInterval = null;
client.presenceIndex = 0;
client.aiModPingCooldowns = new Map();

function normalizeTwitchUrl(input) {
  const raw = String(input || "").trim();
  const fallback = "https://twitch.tv/startupgamingyt";
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/^twitch\.tv\//i, "")
    .replace(/^@+/, "")
    .replace(/\/+$/, "");
  if (!cleaned) return fallback;
  return `https://twitch.tv/${cleaned}`;
}

const STREAM_URL = normalizeTwitchUrl(process.env.STREAM_URL || process.env.TWITCH_URL || "https://twitch.tv/@startupgamingyt");

const nodes = [{
  name: "StartupGaming",
  host: config.lavalink.host,
  port: config.lavalink.port,
  password: config.lavalink.password,
  secure: config.lavalink.secure
}];

client.riffy = new Riffy(client, nodes, {
  send: (payload) => {
    const guildId = payload?.d?.guild_id;
    const guild = guildId ? client.guilds.cache.get(guildId) : null;
    if (guild) return guild.shard.send(payload);
  },
  defaultSearchPlatform: "ytsearch",
  restVersion: "v4"
});

client.startedAt = Date.now();

client.getIdlePresenceList = () => {
  const serverCount = client.guilds?.cache?.size || 0;
  return [
    { name: `Serving ${serverCount} servers`, type: ActivityType.Streaming, url: STREAM_URL },
    { name: "nebryx.cloud", type: ActivityType.Streaming, url: STREAM_URL },
    { name: "Did You Know? i support /slash, !prefix, @mention", type: ActivityType.Streaming, url: STREAM_URL },
    { name: "Are you Bored? Just Play a Music!", type: ActivityType.Streaming, url: STREAM_URL },
    { name: "Follow us on Twitch", type: ActivityType.Streaming, url: STREAM_URL }
  ];
};

client.setIdlePresence = () => {
  if (!client.user) return;
  const list = client.getIdlePresenceList();
  if (!list.length) return;
  const item = list[client.presenceIndex % list.length];
  client.user.setPresence({ status: "online", activities: [{ name: item.name, type: item.type, url: STREAM_URL }] });
};

client.startPresenceRotation = () => {
  if (!client.user) return;
  if (client.presenceInterval) clearInterval(client.presenceInterval);
  client.presenceIndex = 0;
  client.setIdlePresence();
  client.presenceInterval = setInterval(() => {
    client.presenceIndex = (client.presenceIndex + 1) % client.getIdlePresenceList().length;
    client.setIdlePresence();
  }, 5000);
};

client.stopPresenceRotation = () => {
  if (client.presenceInterval) clearInterval(client.presenceInterval);
  client.presenceInterval = null;
};

client.setPlayingPresence = (title) => {
  if (!client.user) return;
  const name = `Listening to ${title || "Now Playing"}`.slice(0, 128);
  client.user.setPresence({ status: "online", activities: [{ name, type: ActivityType.Listening }] });
};

function getActivePlayers() {
  const players = client.riffy?.players;
  if (!players || typeof players.values !== "function") return [];
  const list = [];
  for (const p of players.values()) {
    if (p && p.current && (p.playing || p.paused)) list.push(p);
  }
  return list;
}

function updatePresenceForPlayback(currentPlayer) {
  const active = getActivePlayers();
  if (active.length === 1 && currentPlayer) {
    const title = currentPlayer?.current?.info?.title || "Now Playing";
    client.stopPresenceRotation();
    client.setPlayingPresence(title);
  } else {
    client.startPresenceRotation();
  }
}

function getQueueSize(player) {
  if (!player || !player.queue) return 0;
  if (typeof player.queue.size === "number") return player.queue.size;
  if (Array.isArray(player.queue)) return player.queue.length;
  if (Array.isArray(player.queue.queue)) return player.queue.queue.length;
  return 0;
}

function clearIdleTimeout(guildId) {
  const t = client.idleTimeouts.get(guildId);
  if (t) clearTimeout(t);
  client.idleTimeouts.delete(guildId);
}

function canSendIdleNotice(guildId, cooldownMs = 15000) {
  const now = Date.now();
  const last = client.idleNoticeAt.get(guildId) || 0;
  if (now - last < cooldownMs) return false;
  client.idleNoticeAt.set(guildId, now);
  return true;
}

async function getTwentyFourSevenSettings(guildId) {
  const doc = await Guild.findOne({ guildId }).lean().catch(() => null);
  return doc || null;
}

function buildRelatedSearchQueries(track) {
  const info = track?.info || track || {};
  const title = String(info.title || "").trim();
  const author = String(info.author || "").trim();
  const joined = [title, author].filter(Boolean).join(" ").trim();
  const lowered = joined.toLowerCase();
  const queries = [];

  if (!joined) return queries;
  if (lowered.includes("montagem")) {
    queries.push(`${joined} montagem`);
    queries.push(`${author} montagem`);
  }
  if (lowered.includes("phonk")) {
    queries.push(`${joined} phonk`);
  }
  queries.push(joined);
  if (title && author) queries.push(`${author} ${title}`);
  if (title) queries.push(title);
  return Array.from(new Set(queries.filter(Boolean)));
}

async function ensurePlayerConnected(player) {
  if (!player) return false;
  if (player.connected) return true;
  if (typeof player.connect === "function") {
    try {
      await player.connect({
        guildId: player.guildId,
        voiceChannel: player.voiceChannel,
        deaf: true,
        mute: false
      });
    } catch (_) {}
  }
  const endAt = Date.now() + 3500;
  while (Date.now() < endAt) {
    if (player.connected) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return !!player.connected;
}

async function startPlayerPlayback(player) {
  if (!player) return false;
  try {
    const maybePromise = player.play();
    if (maybePromise && typeof maybePromise.then === "function") await maybePromise;
  } catch (_) {}
  const endAt = Date.now() + 3000;
  while (Date.now() < endAt) {
    if (player.playing) return true;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  return !!player.playing;
}

async function tryTwentyFourSevenAutoplay(player, settings) {
  const mode = normalize247Mode(settings?.twentyFourSevenMode);
  if (!settings?.twentyFourSeven || mode !== "music") return false;

  const history = client.previousTracks.get(player.guildId) || [];
  const seed = history[history.length - 1] || player.current;
  const queries = buildRelatedSearchQueries(seed);
  if (!queries.length) return false;

  for (const query of queries) {
    for (const source of ["ytsearch", "ytmsearch"]) {
      try {
        const resolve = await client.riffy.resolve({ query, source, requester: client.user });
        const tracks = Array.isArray(resolve?.tracks) ? resolve.tracks : [];
        const seedId = String(seed?.info?.identifier || seed?.identifier || "");
        const seedTitle = String(seed?.info?.title || seed?.title || "").toLowerCase();
        const candidates = tracks.filter(track => {
          const info = track?.info || {};
          const identifier = String(info.identifier || "");
          const title = String(info.title || "").toLowerCase();
          if (identifier && seedId && identifier === seedId) return false;
          if (title && seedTitle && title === seedTitle) return false;
          return true;
        });
        const pool = candidates.slice(0, 15);
        const nextTrack = await pickTrackByHype(player.guildId, pool)
          || pool[Math.floor(Math.random() * Math.min(pool.length, 5))]
          || pool[0]
          || tracks[0];
        if (!nextTrack) continue;
        if (nextTrack.info) nextTrack.info.requester = client.user;
        player.queue.add(nextTrack);
        const connected = await ensurePlayerConnected(player);
        if (!connected) return false;
        const started = await startPlayerPlayback(player);
        if (!started) return false;
        const textChannelId = client.lastCommandChannel?.get(player.guildId) || player.textChannel || settings?.twentyFourSevenTextChannelId;
        const textChannel = textChannelId ? client.channels.cache.get(textChannelId) : null;
        if (textChannel?.send) {
          await textChannel.send(`24/7 autoplay picked **${nextTrack.info?.title || "a related track"}**.`).catch(() => {});
        }
        return true;
      } catch (_) {}
    }
  }
  return false;
}

async function scheduleIdleLeave(player) {
  if (!player || !player.guildId) return;
  clearIdleTimeout(player.guildId);
  const timeout = setTimeout(async () => {
    const latest = client.riffy.players.get(player.guildId);
    const settings = await getTwentyFourSevenSettings(player.guildId);
    if (settings?.twentyFourSeven) return;
    if (!latest) return;
    if (latest.playing || (latest.paused && latest.current)) return;
    if (getQueueSize(latest) > 0) return;
    const vcId = latest.voiceChannel;
    const channel = vcId ? client.channels.cache.get(vcId) : null;
    const members = channel?.members?.filter(m => !m.user.bot) || new Collection();
    const textChannelId = client.lastCommandChannel?.get(player.guildId) || latest.textChannel;
    const textChannel = textChannelId ? client.channels.cache.get(textChannelId) : null;
    const mention = vcId ? `<#${vcId}>` : "the voice channel";
    if (textChannel && typeof textChannel.send === "function") {
      if (members.size === 0) {
        await textChannel.send(`😴 ${mention} is alone for 5 Mins So, I Left!`).catch(() => {});
      } else {
        await textChannel.send(`💤 No One Plays Songs in ${mention} So, I Left!`).catch(() => {});
      }
    }
    await clearNowPlayingMessage(client, latest);
    latest.destroy();
  }, 5 * 60 * 1000);
  client.idleTimeouts.set(player.guildId, timeout);
}

async function enterIdleState(player, delayMs = 500, trigger = "manual") {
  setTimeout(async () => {
    const latest = client.riffy.players.get(player.guildId);
    const ref = latest || player;
    if (!ref) return;
    if (latest && (latest.playing || (latest.paused && latest.current))) return;
    if (latest && getQueueSize(latest) > 0) return;
    const settings = await getTwentyFourSevenSettings(ref.guildId);
    apply247StateToPlayer(ref, settings);
    if (settings?.twentyFourSeven) {
      updatePresenceForPlayback(null);
      await clearNowPlayingMessage(client, ref);
      if (latest && normalize247Mode(settings?.twentyFourSevenMode) === "music") {
        const started = await tryTwentyFourSevenAutoplay(latest, settings);
        if (started) return;
      }
      return;
    }
    const textChannelId = client.lastCommandChannel?.get(ref.guildId) || ref.textChannel;
    const textChannel = textChannelId ? client.channels.cache.get(textChannelId) : null;
    if (trigger === "auto" && textChannel && typeof textChannel.send === "function" && canSendIdleNotice(ref.guildId)) {
      await textChannel.send("ℹ️ Music Ended, Im leaving Soon from VC!").catch(() => {});
    }
    await clearNowPlayingMessage(client, ref);
    updatePresenceForPlayback(null);
    if (latest) scheduleIdleLeave(latest);
  }, delayMs);
}

async function handleTrackFailure(player, payload, kind = "error") {
  if (!player) return;
  const reason = String(payload?.exception?.message || payload?.error || payload?.cause || payload?.reason || kind).slice(0, 180);
  console.warn(`[PLAYBACK ${kind.toUpperCase()}] guild=${player.guildId} reason=${reason}`);

  // Riffy stops on trackError/trackStuck and does not auto-advance; move to next track if available.
  if (getQueueSize(player) > 0) {
    const started = await startPlayerPlayback(player);
    if (started) {
      await sendNowPlayingMessage(client, player);
      return;
    }
  }
  enterIdleState(player, 0, "auto");
}

function printBanner() {
  const version = pkg.version || "1";
  const botName = getBotName();
  console.log([
    "╔════════════════════════════════════════════╗",
    "║                                            ║",
    `    🚀 ${botName} Bot`,
    `    📦 Version : ${version}`,
    "    ✅ Status  : Active",
    "║                                            ║",
    "╚════════════════════════════════════════════╝"
  ].join("\n"));
}

async function loadGuildPrefixes() {
  const guilds = await Guild.find({}).lean();
  let count = 0;
  for (const g of guilds) {
    if (g.prefix) { client.guildPrefixes.set(g.guildId, g.prefix); count++; }
  }
  return count;
}

async function init() {
  printBanner();
  console.log("🚀 [SYSTEM] Init Starting");
  try { client.dashboardServer = await startDashboardServer(client); }
  catch (error) { console.error("[DASHBOARD] Failed to start:", error?.message || error); }
  await connect();
  const prefixCount = await loadGuildPrefixes();
  console.log(`🟢 [CACHE] Prefixes Loaded (${prefixCount})`);
  console.log("📦 [SYSTEM] Handlers Loading");
  require("./src/handlers/eventHandler")(client);
  require("./src/handlers/commandHandler")(client);
  console.log("✅ [SYSTEM] Handlers Loaded");

  client.once("clientReady", () => {
    console.log("🟢 [DISCORD] Ready");
    console.log(`🤖 [DISCORD] User ${client.user?.tag || "Unknown"}`);
    console.log(`🆔 [DISCORD] ID ${client.user?.id || "Unknown"}`);
    client.riffy.init(client.user.id);
    console.log("🟢 [LAVALINK] Initialized");
    client.startPresenceRotation();
  });

  client.on("warn", (info) => console.warn("⚠️ [DISCORD] Warning:", info));
  client.on("error", (error) => console.error("🔴 [DISCORD] Client Error:", error));

  client.on("raw", (packet) => {
    if (!client.riffy) return;
    client.riffy.updateVoiceState(packet);
  });

  const token = process.env.DISCORD_TOKEN || config.token;
  const trimmedToken = String(token || "").trim();
  console.log(`[DISCORD] token_present=${!!trimmedToken} token_length=${trimmedToken.length}`);
  if (!trimmedToken) { console.error("Discord token is missing."); process.exit(1); }

  const readyTimeout = setTimeout(() => {
    console.error("[DISCORD] Ready event did not fire within 30s after login start.");
  }, 30 * 1000);
  client.once("clientReady", () => clearTimeout(readyTimeout));

  console.log("[DISCORD] Starting login...");
  try {
    await client.login(trimmedToken);
    console.log("✅ [DISCORD] Login Success");
  } catch (error) {
    console.error("🔴 [DISCORD] Login Failed:", error);
    process.exit(1);
  }
}

client.riffy.on("nodeConnect", node => console.log(`🎵 [LAVALINK] Node Connected (${node.name})`));
client.riffy.on("nodeError", (node, error) => console.error(`🔴 [LAVALINK] Error (${node?.name}):`, error?.message));

client.riffy.on("trackStart", (player) => {
  clearIdleTimeout(player.guildId);
  updatePresenceForPlayback(player);
  sendNowPlayingMessage(client, player);
});

client.riffy.on("trackEnd", (player, track) => {
  if (!track) return;
  const list = client.previousTracks.get(player.guildId) || [];
  list.push(track);
  if (list.length > 20) list.shift();
  client.previousTracks.set(player.guildId, list);
  // queueEnd/trackError handlers should decide idle flow; avoid false idle transitions between tracks
});

client.riffy.on("queueEnd", (player) => enterIdleState(player, 200, "auto"));
client.riffy.on("playerDestroy", (player) => enterIdleState(player, 0));
client.riffy.on("playerDisconnect", (player) => enterIdleState(player, 0));
client.riffy.on("trackError", (player, _track, payload) => {
  handleTrackFailure(player, payload, "error").catch(() => {});
});
client.riffy.on("trackStuck", (player, _track, payload) => {
  handleTrackFailure(player, payload, "stuck").catch(() => {});
});

init();
module.exports = client;
