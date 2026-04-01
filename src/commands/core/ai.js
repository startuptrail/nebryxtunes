const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const config = require("../../../config");
const Guild = require("../../database/models/Guild");
const Warning = require("../../database/models/Warning");
const { parseAiPayload } = require("../../lib/safeJson");
const { runGroqChat } = require("../../services/openaiClient");
const { lookupWeb } = require("../../services/webLookupService");
const corePlay = require("./play");
const coreSearch = require("./search");
const coreJoin = require("./join");
const coreLeave = require("./leave");
const coreSkip = require("./skip");
const coreStop = require("./stop");
const corePause = require("./pause");
const coreResume = require("./resume");
const coreQueue = require("./queue");
const coreShuffle = require("./shuffle");
const corePrevious = require("./previous");
const coreNowplaying = require("./nowplaying");
const coreSeek = require("./seek");
const coreForward = require("./forward");
const coreRewind = require("./rewind");
const coreRemove = require("./remove");
const coreJump = require("./jump");
const coreReconnect = require("./reconnect");
const coreVoteskip = require("./voteskip");
const coreAutoplay = require("./autoplay");
const coreLyrics = require("./lyrics");
const coreSonginfo = require("./songinfo");
const coreHistory = require("./history");
const coreRequest = require("./request");
const coreSay = require("./say");
const coreImage = require("./image");
const coreVideo = require("./video");
const coreVolume = require("./volume");
const coreFilters = require("./filters");
const coreLoop = require("./loop");
const coreQueueClear = require("./queueClear");

const ALLOWED_ACTIONS = new Set([
  "JOIN",
  "LEAVE",
  "PLAY",
  "SEARCH",
  "SKIP",
  "STOP",
  "PAUSE",
  "RESUME",
  "QUEUE",
  "SHUFFLE",
  "PREVIOUS",
  "NOWPLAYING",
  "SEEK",
  "FORWARD",
  "REWIND",
  "REMOVE",
  "JUMP",
  "RECONNECT",
  "VOTESKIP",
  "AUTOPLAY",
  "LYRICS",
  "SONGINFO",
  "HISTORY",
  "REQUEST",
  "SAY",
  "IMAGE",
  "VIDEO",
  "WEB",
  "VOLUME",
  "FILTER",
  "LOOP",
  "CLEAR",
  "CHAT",
  "BLOCK",
  "WARN",
  "WARNS",
  "CLEARWARNS",
  "BAN",
  "UNBAN",
  "KICK",
  "NUKE",
  "MUTE",
  "UNMUTE",
  "TIMEOUT",
  "UNTIMEOUT",
  "PURGE",
  "LOCK",
  "UNLOCK",
  "SLOWMODE",
  "NICK",
  "ROLEADD",
  "ROLEREMOVE"
]);

const PERSONALITIES = new Set(["chill", "hype", "meme"]);
const AFFIRMATIVE_RE = /^(yes|yeah|yep|yup|ya|yea|ok|okay|sure|haan|han|hmm yes|do it|go ahead)$/i;
const NEGATIVE_RE = /^(no|nope|nah|cancel|stop|don't|do not)$/i;
const PENDING_TTL_MS = 2 * 60 * 1000;
const CHAT_MEMORY_MAX_TURNS = 8;
const AI_IDLE_DEFAULT_MINUTES = 60;
const AI_IDLE_MIN_MINUTES = 0;
const AI_IDLE_MAX_MINUTES = 720;
const ACTION_HINT_RE = /\b(play|search|skip|stop|pause|resume|queue|shuffle|previous|now\s*playing|seek|forward|rewind|remove|jump|reconnect|voteskip|autoplay|lyrics|songinfo|history|request|say|announce|volume|filter|loop|clear|image|draw|video|generate)\b/i;
const MUSIC_HINT_RE = /\b(song|music|track|album|artist|youtube|yt|listen|play)\b/i;
const LICENSE_TEXT = [
  "MIT License",
  "",
  "Copyright (c) 2026 StartupGaming",
  "",
  "Permission is hereby granted, free of charge, to any person obtaining a copy",
  "of this software and associated documentation files (the \"Software\"), to deal",
  "in the Software without restriction, including without limitation the rights",
  "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
  "copies of the Software, and to permit persons to whom the Software is",
  "furnished to do so, subject to the following conditions:",
  "",
  "The above copyright notice and this permission notice shall be included in all",
  "copies or substantial portions of the Software.",
  "",
  "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
  "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
  "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
  "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
  "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
  "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
  "SOFTWARE."
].join("\n");

const BOT_OWNER_REPLY = "This bot is owned by <@1060921330159059034>, and the provider, developer, and maintainer is <@1234512256344002650>.";
const BOT_CREATOR_REPLY = "This bot was created by <@1234512256344002650>.";
const BOT_DEVELOPER_REPLY = "This bot is developed and improved by <@1234512256344002650>.";
const BOT_MAINTAINER_REPLY = "This bot is maintained by <@1234512256344002650>.";
const BOT_ORGANIZATION_REPLY = "The organization behind this bot's AI stack is Qwen via Groq, while the bot itself is owned by <@1060921330159059034>, and bot provider owner, developer, and maintainer is <@1234512256344002650>.";

const ATTRIBUTION_PATTERNS = [
  {
    role: "license",
    tokens: [
      "license",
      "licence",
      "your license",
      "what is your license",
      "what is ur license",
      "what's your license",
      "whats your license",
      "can u gimme ur license",
      "can you give me your license",
      "can i get your license",
      "gimme your license",
      "give me your license",
      "show license",
      "send license",
      "license please",
      "licence please",
      "what license",
      "license of bot",
      "bot license"
    ]
  },
  {
    role: "creator",
    tokens: [
      "creator",
      "created",
      "who created",
      "who built",
      "built you",
      "made you",
      "who made",
      "who created you",
      "who make you",
      "who maked you",
      "who build you",
      "your creator",
      "creater",
      "creatr",
      "who is your creator",
      "what is your creator"
    ]
  },
  {
    role: "developer",
    tokens: [
      "developer",
      "developed",
      "who developed",
      "engineer",
      "engineers",
      "improve you",
      "improved",
      "who is your developer",
      "who is developer",
      "who developed u",
      "who develop u",
      "dev",
      "develper",
      "developr",
      "devloper",
      "deveplod",
      "develpod",
      "develeped",
      "who is deveplod u"
    ]
  },
  {
    role: "organization",
    tokens: [
      "organization",
      "organisation",
      "company",
      "company behind you",
      "qwen",
      "who is your organization",
      "what is your organization",
      "which organization",
      "which company made you",
      "who is behind you"
    ]
  },
  {
    role: "maintainer",
    tokens: [
      "maintainer",
      "maintained",
      "who maintains",
      "keeps systems running",
      "who maintain",
      "maintain you",
      "who is your maintainer",
      "system maintainer"
    ]
  },
  {
    role: "owner",
    tokens: [
      "owner",
      "owned",
      "author",
      "who owns",
      "bot owner",
      "who is your owner",
      "what is your owner",
      "what your owner",
      "who your owner",
      "yoour owner",
      "ur owner",
      "owener",
      "onwer"
    ]
  }
];

function getAttributionReply(text) {
  const value = String(text || "").toLowerCase();
  if (!value) return null;

  if (ATTRIBUTION_PATTERNS[0].tokens.some(token => value.includes(token))) {
    return getLicenseReply();
  }
  if (ATTRIBUTION_PATTERNS[1].tokens.some(token => value.includes(token))) {
    return BOT_CREATOR_REPLY;
  }
  if (ATTRIBUTION_PATTERNS[2].tokens.some(token => value.includes(token))) {
    return BOT_DEVELOPER_REPLY;
  }
  if (ATTRIBUTION_PATTERNS[3].tokens.some(token => value.includes(token))) {
    return BOT_ORGANIZATION_REPLY;
  }
  if (ATTRIBUTION_PATTERNS[4].tokens.some(token => value.includes(token))) {
    return BOT_MAINTAINER_REPLY;
  }
  if (ATTRIBUTION_PATTERNS[5].tokens.some(token => value.includes(token))) {
    return BOT_OWNER_REPLY;
  }
  return null;
}

function getLicenseReply() {
  return LICENSE_TEXT;
}

function getAiConfig() {
  const cfg = config?.ai || {};
  return {
    provider: "groq",
    apiKey: String(cfg.apiKey || "").trim(),
    model: String(cfg.model || "qwen/qwen3-32b").trim()
  };
}

function buildPrompt({ message, personality, language, canModerate, allowModeration }) {
  const allowed = Array.from(ALLOWED_ACTIONS).join(", ");
  return [
    "You are a strict JSON-only router for a Discord music bot.",
    "Return ONLY valid JSON with keys: action, args.",
    "Allowed actions:",
    allowed,
    "If you cannot comply, return: {\"action\":\"BLOCK\",\"args\":{\"reason\":\"...\"}}",
    "Never include markdown or extra text.",
    "For greetings, casual talk, questions, or general conversation, always use CHAT.",
    "CHAT args.text must sound natural and human, not robotic, and must be in the selected language.",
    "Use short, friendly replies for simple greetings like hi/hello.",
    "When user intent is music-related, prefer SEARCH for vague song-name queries and PLAY for explicit play requests.",
    "Do not use SEARCH unless the request is clearly about songs/music/artists.",
    "For factual lookups (artist details, release dates, views, general info), use WEB.",
    "If the user confirms with short words like yes/yeah/ok and a song was just discussed, return PLAY for that song.",
    `If the user asks about the creator, reply exactly: ${BOT_CREATOR_REPLY}`,
    `If the user asks about the developer, reply exactly: ${BOT_DEVELOPER_REPLY}`,
    `If the user asks about the organization behind the bot or Qwen, reply exactly: ${BOT_ORGANIZATION_REPLY}`,
    `If the user asks about the maintainer, reply exactly: ${BOT_MAINTAINER_REPLY}`,
    `If the user asks about the owner, author, or who made the bot, reply exactly: ${BOT_OWNER_REPLY}`,
    `If the user asks about the license, reply exactly with: ${getLicenseReply()}`,
    `Personality: ${personality}`,
    `Language: ${language}`,
    `Moderator: ${canModerate ? "true" : "false"}`,
    "Music actions must use these args:",
    "JOIN/LEAVE/SKIP/STOP/PAUSE/RESUME/SHUFFLE/PREVIOUS/NOWPLAYING/RECONNECT/VOTESKIP/AUTOPLAY/HISTORY/CLEAR: {}",
    "PLAY: {\"song\":\"...\"}",
    "SEARCH: {\"query\":\"...\"}",
    "REQUEST: {\"query\":\"...\"}",
    "SAY: {\"text\":\"...\"}",
    "IMAGE: {\"prompt\":\"...\"}",
    "VIDEO: {\"prompt\":\"...\"}",
    "WEB: {\"query\":\"...\"}",
    "SEEK: {\"position\":\"1:30|90\"}",
    "FORWARD/REWIND: {\"seconds\":10}",
    "REMOVE/JUMP: {\"index\":1}",
    "QUEUE: {\"page\":1}",
    "LYRICS: {\"query\":\"optional\"}",
    "SONGINFO: {}",
    "VOLUME: {\"level\": 1-200}",
    "FILTER: {\"filter\":\"name\",\"level\":\"optional\"}",
    "LOOP: {\"mode\":\"song|queue|off\"}",
    "CHAT: {\"text\":\"...\"}",
    ...(allowModeration ? [
      "Moderation actions require admin/owner access and target user when needed.",
      `Moderator access in this context: ${canModerate ? "true" : "false"}`,
      "WARN/WARNS/CLEARWARNS: {\"userId\":\"...\",\"reason\":\"optional\"}",
      "BAN/KICK: {\"userId\":\"...\",\"reason\":\"optional\"}",
      "UNBAN: {\"userId\":\"...\",\"reason\":\"optional\"}",
      "NUKE: {\"reason\":\"optional\"}",
      "MUTE: {\"userId\":\"...\",\"minutes\":10,\"reason\":\"optional\"}",
      "UNMUTE: {\"userId\":\"...\",\"reason\":\"optional\"}",
      "TIMEOUT: {\"userId\":\"...\",\"minutes\":10,\"reason\":\"optional\"}",
      "UNTIMEOUT: {\"userId\":\"...\",\"reason\":\"optional\"}",
      "PURGE: {\"count\":10}",
      "LOCK/UNLOCK: {}",
      "SLOWMODE: {\"seconds\":5}",
      "NICK: {\"userId\":\"...\",\"nickname\":\"new name\"}",
      "ROLEADD/ROLEREMOVE: {\"userId\":\"...\",\"role\":\"@role|roleId|name\"}"
    ] : [
      "Do not return moderation actions in this context."
    ]),
    "",
    `User message: ${message}`
  ].join("\n");
}

function getPendingKey(context) {
  return `${context.guildId}:${context.userId}`;
}

function getPendingStore(client) {
  if (!client.aiPendingActions) client.aiPendingActions = new Map();
  return client.aiPendingActions;
}

function getPendingAction(client, context) {
  const store = getPendingStore(client);
  const key = getPendingKey(context);
  const pending = store.get(key);
  if (!pending) return null;
  if (Date.now() > pending.expiresAt) {
    store.delete(key);
    return null;
  }
  return pending;
}

function setPendingAction(client, context, action, args) {
  const store = getPendingStore(client);
  const key = getPendingKey(context);
  store.set(key, { action, args, expiresAt: Date.now() + PENDING_TTL_MS });
}

function clearPendingAction(client, context) {
  const store = getPendingStore(client);
  const key = getPendingKey(context);
  store.delete(key);
}

function getAiAllowedChannels(doc) {
  return Array.isArray(doc?.aiAllowedChannelIds) ? doc.aiAllowedChannelIds.map(String).filter(Boolean) : [];
}

function normalizeChannelId(input) {
  const value = String(input || "").trim();
  const match = value.match(/^<#(\d+)>$/) || value.match(/^(\d{16,20})$/);
  return match ? match[1] : "";
}

function formatChannelList(ids, guild) {
  const list = Array.isArray(ids) ? ids.filter(Boolean).map(String) : [];
  if (!list.length) return "No AI channels are configured.";
  return list.map(id => {
    const ch = guild?.channels?.cache?.get?.(id);
    return ch ? `<#${id}>` : `\`${id}\``;
  }).join("\n");
}

function normalizeChannelId(input) {
  const value = String(input || "").trim();
  const match = value.match(/^<#!?(\d+)>$/) || value.match(/^<#(\d+)>$/) || value.match(/^(\d+)$/);
  return match ? match[1] : "";
}

function formatChannelList(ids, guild) {
  const list = Array.isArray(ids) ? ids.filter(Boolean).map(String) : [];
  if (!list.length) return "No AI channels configured.";
  return list.map(id => {
    const channel = guild?.channels?.cache?.get?.(id);
    return channel ? `<#${id}>` : `\`${id}\``;
  }).join("\n");
}

function setPendingConfirmation(client, context, command, args, prompt) {
  setPendingAction(client, context, "__AI_CONFIRM__", {
    command,
    args,
    prompt: String(prompt || "").trim()
  });
}

function runConfirmedAiSetting(client, context, pending) {
  const command = String(pending?.args?.command || "").toLowerCase();
  if (command === "on" || command === "enable") {
    return Guild.updateOne(
      { guildId: context.guildId },
      { $set: { aiEnabled: true, aiAutoDisabled: false } },
      { upsert: true }
    ).then(() => context.reply("AI enabled."));
  }
  if (command === "off" || command === "disable") {
    return Guild.updateOne(
      { guildId: context.guildId },
      { $set: { aiEnabled: false } },
      { upsert: true }
    ).then(() => context.reply("AI disabled."));
  }
  if (command === "personality") {
    const mode = String(pending?.args?.mode || "").toLowerCase();
    if (!PERSONALITIES.has(mode)) return context.reply("Use: chill | hype | meme");
    return Guild.updateOne(
      { guildId: context.guildId },
      { $set: { personality: mode } },
      { upsert: true }
    ).then(() => context.reply(`Personality set to ${mode}.`));
  }
  if (command === "language") {
    const lang = String(pending?.args?.lang || "").trim();
    if (!lang) return context.reply("Provide a language name.");
    return Guild.updateOne(
      { guildId: context.guildId },
      { $set: { language: lang.slice(0, 32) } },
      { upsert: true }
    ).then(() => context.reply(`Language set to ${lang.slice(0, 32)}.`));
  }
  return context.reply("Invalid AI action.");
}

function getChatMemoryKey(context) {
  return `${context.guildId}:${context.userId}`;
}

function getChatMemoryStore(client) {
  if (!client.aiChatMemory) client.aiChatMemory = new Map();
  return client.aiChatMemory;
}

function getChatHistory(client, context) {
  const store = getChatMemoryStore(client);
  const key = getChatMemoryKey(context);
  return store.get(key) || [];
}

function pushChatHistory(client, context, role, content) {
  const value = String(content || "").trim();
  if (!value) return;
  const store = getChatMemoryStore(client);
  const key = getChatMemoryKey(context);
  const existing = getChatHistory(client, context);
  const next = existing.concat([{ role, content: value }]).slice(-(CHAT_MEMORY_MAX_TURNS * 2));
  store.set(key, next);
}

function buildChatMessages(client, context, message, personality, language) {
  const history = getChatHistory(client, context);
  const system = {
    role: "system",
    content: [
      "You are the AI assistant inside a Discord music + moderation bot.",
      "Speak naturally like a smart human assistant, concise and helpful.",
      "Do not output JSON in chat mode.",
      "If the user asks for bot actions, answer briefly and ask them to confirm command intent naturally.",
      `If the user asks about the creator, reply exactly: ${BOT_CREATOR_REPLY}`,
      `If the user asks about the developer, reply exactly: ${BOT_DEVELOPER_REPLY}`,
      `If the user asks about the organization behind the bot or Qwen, reply exactly: ${BOT_ORGANIZATION_REPLY}`,
      `If the user asks about the maintainer, reply exactly: ${BOT_MAINTAINER_REPLY}`,
      `If the user asks about the owner, author, or who made the bot, reply exactly: ${BOT_OWNER_REPLY}`,
      `If the user asks about the license, reply exactly with: ${LICENSE_TEXT}`,
      `Personality: ${personality}`,
      `Language: ${language}`
    ].join("\n")
  };
  return [system, ...history, { role: "user", content: String(message || "").slice(0, 1200) }];
}

function normalizeSongText(song) {
  return String(song || "")
    .replace(/\b(song|music|please|plz|on youtube|youtube)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMusicContext(text) {
  return MUSIC_HINT_RE.test(String(text || ""));
}

function inferDirectIntent(message) {
  const text = String(message || "").trim();
  if (!text) return null;

  const sayMatch = text.match(/^(?:say|announce)\s+([\s\S]+)$/i);
  if (sayMatch?.[1]) return { action: "SAY", args: { text: sayMatch[1].trim() } };

  const imageMatch = text.match(/^(?:image|draw|generate\s+image)\s+(.+)$/i);
  if (imageMatch?.[1]) return { action: "IMAGE", args: { prompt: imageMatch[1].trim() } };
  const imageNaturalMatch = text.match(/\b(?:create|make|generate)\s+(?:an?\s+)?image(?:\s+of)?\s+(.+)$/i);
  if (imageNaturalMatch?.[1]) return { action: "IMAGE", args: { prompt: imageNaturalMatch[1].trim() } };
  const videoMatch = text.match(/^(?:video|generate\s+video)\s+(.+)$/i);
  if (videoMatch?.[1]) return { action: "VIDEO", args: { prompt: videoMatch[1].trim() } };
  const videoNaturalMatch = text.match(/\b(?:create|make|generate)\s+(?:a\s+)?video(?:\s+of)?\s+(.+)$/i);
  if (videoNaturalMatch?.[1]) return { action: "VIDEO", args: { prompt: videoNaturalMatch[1].trim() } };

  const playPatterns = [
    /^(?:play)\s+(?:music\s+|song\s+)?(.+)$/i,
    /^(?:listen(?:\s+to)?|put)\s+(.+)$/i,
    /^(?:i want|wanna|want)\s+(?:to\s+)?(?:listen(?:\s+to)?|play)\s+(.+)$/i,
    /^(?:can\s+you|could\s+you|pls|please)?\s*play\s+(.+)$/i,
    /.*\bplay\s+(.+)$/i
  ];

  for (const pattern of playPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const song = normalizeSongText(match[1]);
    if (song) return { action: "PLAY", args: { song } };
  }

  const searchPatterns = [
    /^(?:search|find|look\s*for)\s+(.+)$/i,
    /^(.+?)\s+song$/i,
    /^song\s+(.+)$/i
  ];

  for (const pattern of searchPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const source = String(match[1]).trim();
    const query = normalizeSongText(source);
    if (!query) continue;
    if (pattern === searchPatterns[0] && !hasMusicContext(text)) {
      return { action: "WEB", args: { query: source } };
    }
    if (!hasMusicContext(text) && pattern !== searchPatterns[2] && pattern !== searchPatterns[1]) {
      return { action: "WEB", args: { query: source } };
    }
    return { action: "SEARCH", args: { query } };
  }

  if (!/\b(play|listen)\b/i.test(text) && /\b(song|music|youtube)\b/i.test(text)) {
    const query = normalizeSongText(text);
    if (query) return { action: "SEARCH", args: { query } };
  }

  const webPatterns = [
    /^(?:who\s+is|what\s+is|tell\s+me\s+about|about)\s+(.+)$/i,
    /^(?:release\s+date\s+of|views\s+of|info\s+about)\s+(.+)$/i
  ];
  for (const pattern of webPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const query = String(match[1]).trim();
    if (query) return { action: "WEB", args: { query } };
  }

  return null;
}

function parseDirectMusicControlIntent(message) {
  const text = String(message || "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  const simpleMap = new Map([
    ["join", "JOIN"],
    ["leave", "LEAVE"],
    ["skip", "SKIP"],
    ["stop", "STOP"],
    ["pause", "PAUSE"],
    ["resume", "RESUME"],
    ["queue", "QUEUE"],
    ["shuffle", "SHUFFLE"],
    ["previous", "PREVIOUS"],
    ["prev", "PREVIOUS"],
    ["nowplaying", "NOWPLAYING"],
    ["now playing", "NOWPLAYING"],
    ["np", "NOWPLAYING"],
    ["reconnect", "RECONNECT"],
    ["voteskip", "VOTESKIP"],
    ["autoplay", "AUTOPLAY"],
    ["history", "HISTORY"],
    ["songinfo", "SONGINFO"],
    ["clear queue", "CLEAR"],
    ["queue clear", "CLEAR"]
  ]);
  if (simpleMap.has(lower)) return { action: simpleMap.get(lower), args: {} };
  if (/^autoplay\s+(on|off)$/i.test(text)) return { action: "AUTOPLAY", args: {} };
  const queuePage = text.match(/^queue\s+(\d{1,3})$/i);
  if (queuePage) return { action: "QUEUE", args: { page: Number(queuePage[1]) } };

  const v = text.match(/^volume\s+(\d{1,3})$/i);
  if (v) return { action: "VOLUME", args: { level: Number(v[1]) } };
  const loop = text.match(/^loop\s+(song|queue|off)$/i);
  if (loop) return { action: "LOOP", args: { mode: loop[1].toLowerCase() } };
  const seek = text.match(/^seek\s+(.+)$/i);
  if (seek) return { action: "SEEK", args: { position: seek[1].trim() } };
  const fwd = text.match(/^forward\s+(\d{1,4})$/i);
  if (fwd) return { action: "FORWARD", args: { seconds: Number(fwd[1]) } };
  const rew = text.match(/^rewind\s+(\d{1,4})$/i);
  if (rew) return { action: "REWIND", args: { seconds: Number(rew[1]) } };
  const remove = text.match(/^remove\s+(\d{1,4})$/i);
  if (remove) return { action: "REMOVE", args: { index: Number(remove[1]) } };
  const jump = text.match(/^jump\s+(\d{1,4})$/i);
  if (jump) return { action: "JUMP", args: { index: Number(jump[1]) } };
  const req = text.match(/^request\s+(.+)$/i);
  if (req) return { action: "REQUEST", args: { query: req[1].trim() } };
  const lyrics = text.match(/^lyrics(?:\s+(.+))?$/i);
  if (lyrics) return { action: "LYRICS", args: { query: String(lyrics[1] || "").trim() } };
  const filter = text.match(/^filter\s+([^\s]+)(?:\s+(.+))?$/i);
  if (filter) return { action: "FILTER", args: { filter: filter[1], level: String(filter[2] || "").trim() || undefined } };

  return null;
}

function extractUserIdFromText(text, context) {
  const raw = String(text || "");
  return context?.message?.mentions?.users?.first?.()?.id
    || raw.match(/<@!?(\d+)>/)?.[1]
    || raw.match(/\b(\d{16,20})\b/)?.[1]
    || "";
}

function parseDirectModerationIntent(message, context) {
  const text = String(message || "").trim();
  if (!text) return null;
  const normalized = text
    .replace(/^role\s+add\b/i, "roleadd")
    .replace(/^role\s+remove\b/i, "roleremove")
    .replace(/^clear\s+warns\b/i, "clearwarns");
  const match = normalized.match(/^(warns|clearwarns|warn|ban|unban|kick|kic|nuke|mute|unmute|timeout|untimeout|purge|lock|unlock|slowmode|nick|roleadd|roleremove)\b\s*(.*)$/i);
  if (!match) return null;

  const action = match[1].toLowerCase() === "kic" ? "KICK" : match[1].toUpperCase();
  const rest = String(match[2] || "").trim();

  if (action === "LOCK" || action === "UNLOCK") return { action, args: {} };
  if (action === "NUKE") return { action, args: { reason: rest } };
  if (action === "PURGE") {
    const count = Math.max(1, Math.min(100, Number(rest.match(/\d{1,3}/)?.[0] || 10)));
    return { action, args: { count } };
  }
  if (action === "SLOWMODE") {
    const seconds = Math.max(0, Math.min(21600, Number(rest.match(/\d{1,5}/)?.[0] || 0)));
    return { action, args: { seconds } };
  }

  const userId = extractUserIdFromText(rest, context);
  if (!userId) {
    return {
      action: "BLOCK",
      args: { reason: "Mention a valid user. Example: `!ai ban @user reason`" }
    };
  }

  const sanitized = rest
    .replace(/<@!?\d+>/g, "")
    .replace(/\b\d{16,20}\b/, "")
    .trim();

  if (action === "TIMEOUT" || action === "MUTE") {
    const minuteMatch = sanitized.match(/^(\d{1,5})\b/);
    const minutes = minuteMatch ? Math.max(1, Math.min(40320, Number(minuteMatch[1]))) : 10;
    const reason = sanitized.replace(/^(\d{1,5})\b/, "").trim();
    return { action, args: { userId, minutes, reason } };
  }

  if (action === "NICK") {
    return { action, args: { userId, nickname: sanitized || "" } };
  }

  if (action === "ROLEADD" || action === "ROLEREMOVE") {
    return { action, args: { userId, role: sanitized } };
  }

  return { action, args: { userId, reason: sanitized } };
}

function shouldUseActionRouting(message) {
  const text = String(message || "").trim();
  if (!text) return false;
  if (AFFIRMATIVE_RE.test(text)) return true;
  return ACTION_HINT_RE.test(text);
}

async function resolveAndRunAction(client, context, message, personality, language, options = {}) {
  const allowModeration = options.allowModeration === true;
  if (allowModeration) {
    const moderationIntent = parseDirectModerationIntent(message, context);
    if (moderationIntent?.action && moderationIntent?.args) {
      clearPendingAction(client, context);
      return routeAction(client, context, moderationIntent.action, moderationIntent.args);
    }
  }

  const directMusic = parseDirectMusicControlIntent(message);
  if (directMusic?.action && directMusic?.args) {
    clearPendingAction(client, context);
    return routeAction(client, context, directMusic.action, directMusic.args);
  }

  const directIntent = inferDirectIntent(message);
  if (directIntent?.action && directIntent?.args) {
    clearPendingAction(client, context);
    return routeAction(client, context, directIntent.action, directIntent.args);
  }

  if (AFFIRMATIVE_RE.test(message)) {
    const pending = getPendingAction(client, context);
    if (pending?.action && ALLOWED_ACTIONS.has(pending.action)) {
      clearPendingAction(client, context);
      return routeAction(client, context, pending.action, pending.args || {});
    }
  }

  if (!shouldUseActionRouting(message)) {
    const attributionReply = getAttributionReply(message);
    if (attributionReply) {
      await scheduleAiIdle(client, context.guildId, context.channel);
      return context.reply(attributionReply);
    }
    const chatMessages = buildChatMessages(client, context, message, personality, language);
    const chatResult = await callAI(chatMessages);
    if (!chatResult.ok) return context.reply(chatResult.error);
    const text = String(chatResult.text || "").trim().slice(0, 1800);
    if (!text) return context.reply("I could not generate a response right now.");
    pushChatHistory(client, context, "user", message);
    pushChatHistory(client, context, "assistant", text);
    await scheduleAiIdle(client, context.guildId, context.channel);
    return context.reply(text);
  }

  const canModerate = allowModeration && hasAdminAccess(context);
  const prompt = buildPrompt({ message, personality, language, canModerate, allowModeration });
  const result = await callAI(prompt);
  if (!result.ok) return context.reply(result.error);
  const parsed = parseAiPayload(result.text);
  if (!parsed.ok) return context.reply(parsed.error);
  const payload = parsed.payload;
  const action = String(payload?.action || "").toUpperCase();
  if (!ALLOWED_ACTIONS.has(action)) return context.reply("Invalid AI action.");

  if (action === "PLAY") {
    clearPendingAction(client, context);
  } else if (action === "CHAT") {
    const suggestion = inferDirectIntent(message);
    const chatText = String(payload?.args?.text || "");
    const asksToPlay = /\b(looking to play|want me to play|should i play|play .*\?)\b/i.test(chatText);
    if (suggestion?.action === "SEARCH" && asksToPlay) {
      setPendingAction(client, context, "SEARCH", suggestion.args);
    }
    pushChatHistory(client, context, "user", message);
    pushChatHistory(client, context, "assistant", chatText);
  }

  await scheduleAiIdle(client, context.guildId, context.channel);
  return routeAction(client, context, action, payload?.args || {});
}

function normalizeInputMessages(input) {
  if (Array.isArray(input)) return input;
  return [{ role: "user", content: String(input || "") }];
}

async function callGroq(input, apiKey, model) {
  const messages = normalizeInputMessages(input);
  const isChat = Array.isArray(input);
  const candidate = String(model || "").trim() || "qwen/qwen3-32b";
  console.log(`🤖 [AI] request start model=${candidate} mode=${isChat ? "chat" : "router"}`);
  return runGroqChat({
    apiKey,
    model: candidate,
    messages
  });
}

async function callAI(input) {
  const { apiKey, model } = getAiConfig();
  if (!apiKey || /^PASTE_/i.test(apiKey)) {
    return { ok: false, error: "AI API key missing in config.js." };
  }
  try {
    const text = await callGroq(input, apiKey, model);
    console.log(`✅ [AI] request ok chars=${String(text || "").length}`);
    return { ok: true, text };
  } catch (error) {
    console.log(`🔴 [AI] request failed reason=${String(error?.message || "unknown")}`);
    return { ok: false, error: error?.message || "AI request failed." };
  }
}

function hasAdminAccess(context) {
  const isOwner = String(context?.guild?.ownerId || "") === String(context?.userId || "");
  const isAdmin = !!context?.member?.permissions?.has?.(PermissionsBitField.Flags.Administrator);
  return isOwner || isAdmin;
}

function isAdministrator(context) {
  return !!context.member?.permissions?.has?.(PermissionsBitField.Flags.Administrator);
}

async function scheduleAiIdle(client, guildId, channel) {
  const doc = await Guild.findOne({ guildId }).lean();
  const idleMinutesRaw = Number(doc?.aiIdleMinutes);
  const idleMinutes = Number.isFinite(idleMinutesRaw)
    ? Math.max(AI_IDLE_MIN_MINUTES, Math.min(AI_IDLE_MAX_MINUTES, Math.floor(idleMinutesRaw)))
    : AI_IDLE_DEFAULT_MINUTES;

  if (!client.aiIdleTimers) client.aiIdleTimers = new Map();
  const existing = client.aiIdleTimers.get(guildId);
  if (existing) {
    if (existing.warn) clearTimeout(existing.warn);
    if (existing.disable) clearTimeout(existing.disable);
  }
  if (idleMinutes <= 0) {
    client.aiIdleTimers.delete(guildId);
    return;
  }

  let warn = null;
  if (idleMinutes > 10) {
    warn = setTimeout(async () => {
      const ch = channel || client.channels?.cache?.get?.(client.lastCommandChannel?.get(guildId));
      if (ch && ch.send) {
        await ch.send("⚠️ AI will auto-disable in 10 minutes if there is no activity. Talk to keep it on.").catch(() => {});
      }
    }, (idleMinutes - 10) * 60 * 1000);
  }
  const disable = setTimeout(async () => {
    await Guild.updateOne(
      { guildId },
      { $set: { aiEnabled: false, aiAutoDisabled: true } },
      { upsert: true }
    );
    const ch = channel || client.channels?.cache?.get?.(client.lastCommandChannel?.get(guildId));
    if (ch && ch.send) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ai_reactivate").setLabel("Reactivate AI").setStyle(ButtonStyle.Success)
      );
      await ch.send({ content: `⏳ AI auto-disabled after ${idleMinutes} minute(s) of inactivity. Tap below to reactivate.`, components: [row] }).catch(() => {});
    }
  }, idleMinutes * 60 * 1000);
  client.aiIdleTimers.set(guildId, { warn, disable });
}

function resolveRole(guild, raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const roleId = value.match(/<@&(\d+)>/)?.[1] || value.match(/\b(\d{16,20})\b/)?.[1] || "";
  if (roleId) return guild.roles.cache.get(roleId) || null;
  const needle = value.toLowerCase();
  return guild.roles.cache.find(r => r.name.toLowerCase() === needle)
    || guild.roles.cache.find(r => r.name.toLowerCase().includes(needle))
    || null;
}

function validateMemberHierarchy(context, target) {
  const guild = context.guild;
  const actor = context.member;
  const botMember = guild?.members?.me;
  const isOwner = String(actor?.id || "") === String(guild?.ownerId || "");

  if (!target) return "User not found.";
  if (!botMember) return "Bot member not available in this guild.";

  if (!isOwner && actor?.roles?.highest && target?.roles?.highest) {
    if (actor.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
      return "You cannot moderate this user due to role hierarchy.";
    }
  }

  if (botMember?.roles?.highest && target?.roles?.highest) {
    if (botMember.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
      return "I cannot moderate this user due to role hierarchy.";
    }
  }

  return "";
}

async function handleModeration(action, args, context) {
  if (!hasAdminAccess(context)) {
    return context.reply("You do not have access. Only server administrators or the server owner can use AI moderation.");
  }
  const guild = context.guild;
  if (!guild) return context.reply("Use this in a server.");
  const requiresTarget = !["LOCK", "UNLOCK", "PURGE", "SLOWMODE", "NUKE"].includes(action);
  const userId = String(args?.userId || "").trim();
  const reason = String(args?.reason || "").slice(0, 200);

  if (action === "LOCK") {
    try {
      await context.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: reason || "AI lock" });
      return context.reply("Channel locked.");
    } catch (error) {
      return context.reply(`Lock failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "UNLOCK") {
    try {
      await context.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason: reason || "AI unlock" });
      return context.reply("Channel unlocked.");
    } catch (error) {
      return context.reply(`Unlock failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "PURGE") {
    const count = Math.max(1, Math.min(100, Number(args?.count || 10)));
    try {
      const deleted = await context.channel.bulkDelete(count, true);
      return context.reply(`Deleted ${deleted.size} message(s).`);
    } catch (error) {
      return context.reply(`Purge failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "NUKE") {
    try {
      const original = context.channel;
      const cloned = await original.clone({
        reason: reason || "AI nuke"
      });
      await cloned.setPosition(original.position).catch(() => {});
      if (original.parentId && cloned.parentId !== original.parentId) {
        await cloned.setParent(original.parentId).catch(() => {});
      }
      await original.delete(reason || "AI nuke");
      return cloned.send(`Channel nuked by <@${context.userId}>.`);
    } catch (error) {
      return context.reply(`Nuke failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "SLOWMODE") {
    const seconds = Math.max(0, Math.min(21600, Number(args?.seconds || 0)));
    try {
      await context.channel.setRateLimitPerUser(seconds, reason || "AI slowmode");
      return context.reply(seconds ? `Slowmode set to ${seconds}s.` : "Slowmode disabled.");
    } catch (error) {
      return context.reply(`Slowmode failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }

  if (requiresTarget && !userId) return context.reply("Missing userId for moderation.");
  const target = requiresTarget ? await guild.members.fetch(userId).catch(() => null) : null;
  if (requiresTarget && !target && action !== "UNBAN") return context.reply("User not found.");
  if (target && String(target.id) === String(context.userId)) return context.reply("You cannot moderate yourself.");
  if (target && String(target.id) === String(guild.ownerId || "")) return context.reply("You cannot moderate the server owner.");
  if (target && action !== "WARNS" && action !== "CLEARWARNS") {
    const hierarchyError = validateMemberHierarchy(context, target);
    if (hierarchyError) return context.reply(hierarchyError);
  }

  if (action === "WARN") {
    await Warning.create({ guildId: context.guildId, userId, moderatorId: context.userId, reason });
    const total = await Warning.countDocuments({ guildId: context.guildId, userId });
    return context.reply(`Warned <@${userId}>. Total warnings: ${total}.`);
  }
  if (action === "WARNS") {
    const recent = await Warning.find({ guildId: context.guildId, userId }).sort({ createdAt: -1 }).limit(5).lean();
    if (!recent.length) return context.reply("No warnings for this user.");
    const lines = recent.map((item, index) => `${index + 1}. ${item.reason || "No reason"}`).join("\n");
    const total = await Warning.countDocuments({ guildId: context.guildId, userId });
    return context.reply(`Warnings for <@${userId}> (${total}):\n${lines}`);
  }
  if (action === "CLEARWARNS") {
    const result = await Warning.deleteMany({ guildId: context.guildId, userId });
    return context.reply(`Cleared ${result.deletedCount || 0} warning(s) for <@${userId}>.`);
  }

  if (action === "BAN") {
    if (!target.bannable) return context.reply("Cannot ban this user. Check bot permissions and role hierarchy.");
    try {
      await target.ban({ reason: reason || undefined });
      return context.reply(`Banned <@${target.id}>.`);
    } catch (error) {
      return context.reply(`Ban failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "UNBAN") {
    try {
      await guild.bans.remove(userId, reason || undefined);
      return context.reply(`Unbanned <@${userId}>.`);
    } catch (error) {
      return context.reply(`Unban failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "KICK") {
    if (!target.kickable) return context.reply("Cannot kick this user. Check bot permissions and role hierarchy.");
    try {
      await target.kick(reason || undefined);
      return context.reply(`Kicked <@${target.id}>.`);
    } catch (error) {
      return context.reply(`Kick failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "TIMEOUT") {
    const minutes = Math.max(1, Math.min(40320, Number(args?.minutes || 10)));
    if (!target.moderatable) return context.reply("Cannot timeout this user. Check bot permissions and role hierarchy.");
    try {
      await target.timeout(minutes * 60 * 1000, reason || undefined);
      return context.reply(`Timed out <@${target.id}> for ${minutes} minute(s).`);
    } catch (error) {
      return context.reply(`Timeout failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "UNTIMEOUT") {
    if (!target.moderatable) return context.reply("Cannot untimeout this user. Check bot permissions and role hierarchy.");
    try {
      await target.timeout(null, reason || undefined);
      return context.reply(`Removed timeout for <@${target.id}>.`);
    } catch (error) {
      return context.reply(`Untimeout failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "MUTE") {
    const minutes = Math.max(1, Math.min(40320, Number(args?.minutes || 10)));
    if (!target.moderatable) return context.reply("Cannot mute this user. Check bot permissions and role hierarchy.");
    try {
      await target.timeout(minutes * 60 * 1000, reason || undefined);
      return context.reply(`Muted <@${target.id}> for ${minutes} minute(s).`);
    } catch (error) {
      return context.reply(`Mute failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "UNMUTE") {
    if (!target.moderatable) return context.reply("Cannot unmute this user. Check bot permissions and role hierarchy.");
    try {
      await target.timeout(null, reason || undefined);
      return context.reply(`Unmuted <@${target.id}>.`);
    } catch (error) {
      return context.reply(`Unmute failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "NICK") {
    const nickname = String(args?.nickname || "").trim().slice(0, 32);
    if (!target.manageable) return context.reply("Cannot update nickname due to role hierarchy or permissions.");
    try {
      await target.setNickname(nickname || null, reason || "AI nick");
      return context.reply(nickname ? `Nickname updated for <@${target.id}>.` : `Nickname reset for <@${target.id}>.`);
    } catch (error) {
      return context.reply(`Nick failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }
  if (action === "ROLEADD" || action === "ROLEREMOVE") {
    const role = resolveRole(guild, args?.role);
    if (!role) return context.reply("Role not found. Mention role, pass role ID, or exact role name.");
    const botMember = guild.members.me;
    const actor = context.member;
    const isOwner = String(actor?.id || "") === String(guild.ownerId || "");
    if (botMember?.roles?.highest && botMember.roles.highest.comparePositionTo(role) <= 0) {
      return context.reply("I cannot manage that role because it is higher or equal to my top role.");
    }
    if (!isOwner && actor?.roles?.highest && actor.roles.highest.comparePositionTo(role) <= 0) {
      return context.reply("You cannot manage that role because it is higher or equal to your top role.");
    }
    try {
      if (action === "ROLEADD") {
        await target.roles.add(role, reason || "AI role add");
        return context.reply(`Added role **${role.name}** to <@${target.id}>.`);
      }
      await target.roles.remove(role, reason || "AI role remove");
      return context.reply(`Removed role **${role.name}** from <@${target.id}>.`);
    } catch (error) {
      return context.reply(`Role update failed: ${String(error?.message || "Unknown error").slice(0, 180)}`);
    }
  }

  return context.reply("Unsupported moderation action.");
}

async function handleWebAction(args, context) {
  const query = String(args?.query || args?.text || "").trim();
  if (!query) return context.reply("Provide a query for web lookup.");
  try {
    const result = await lookupWeb(query);
    const title = String(result?.title || "Web Result").slice(0, 150);
    const summary = String(result?.summary || "").trim().slice(0, 1700);
    const source = String(result?.sourceUrl || "").trim();
    const output = [`**${title}**`, summary, source ? `Source: ${source}` : ""].filter(Boolean).join("\n");
    return context.reply(output || "No information found.");
  } catch (error) {
    return context.reply(`Web lookup failed: ${String(error?.message || "Unknown error").slice(0, 300)}`);
  }
}

async function routeAction(client, context, action, args) {
  switch (action) {
    case "JOIN":
      return coreJoin.run(client, context);
    case "LEAVE":
      return coreLeave.run(client, context);
    case "PLAY":
      context.args = [String(args?.song || "")].filter(Boolean);
      if (!context.args.length) return context.reply("AI needs a song name.");
      return corePlay.run(client, context);
    case "SEARCH":
      context.args = [String(args?.query || args?.song || "")].filter(Boolean);
      if (!context.args.length) return context.reply("AI needs a search query.");
      return coreSearch.run(client, context);
    case "SKIP":
      return coreSkip.run(client, context);
    case "STOP":
      return coreStop.run(client, context);
    case "PAUSE":
      return corePause.run(client, context);
    case "RESUME":
      return coreResume.run(client, context);
    case "QUEUE":
      if (args?.page) context.args = [String(args.page)];
      return coreQueue.run(client, context);
    case "SHUFFLE":
      return coreShuffle.run(client, context);
    case "PREVIOUS":
      return corePrevious.run(client, context);
    case "NOWPLAYING":
      return coreNowplaying.run(client, context);
    case "SEEK":
      context.args = [String(args?.position || "")].filter(Boolean);
      return coreSeek.run(client, context);
    case "FORWARD":
      context.args = [String(args?.seconds || 10)];
      return coreForward.run(client, context);
    case "REWIND":
      context.args = [String(args?.seconds || 10)];
      return coreRewind.run(client, context);
    case "REMOVE":
      context.args = [String(args?.index || "")].filter(Boolean);
      return coreRemove.run(client, context);
    case "JUMP":
      context.args = [String(args?.index || "")].filter(Boolean);
      return coreJump.run(client, context);
    case "RECONNECT":
      return coreReconnect.run(client, context);
    case "VOTESKIP":
      return coreVoteskip.run(client, context);
    case "AUTOPLAY":
      return coreAutoplay.run(client, context);
    case "LYRICS":
      context.args = [String(args?.query || "")].filter(Boolean);
      return coreLyrics.run(client, context);
    case "SONGINFO":
      return coreSonginfo.run(client, context);
    case "HISTORY":
      return coreHistory.run(client, context);
    case "REQUEST":
      context.args = [String(args?.query || args?.song || "")].filter(Boolean);
      if (!context.args.length) return context.reply("AI needs a request query.");
      return coreRequest.run(client, context);
    case "SAY":
      context.args = [String(args?.text || "")].filter(Boolean);
      if (!context.args.length) return context.reply("AI needs text for say.");
      return coreSay.run(client, context);
    case "IMAGE":
      context.args = [String(args?.prompt || "")].filter(Boolean);
      if (!context.args.length) return context.reply("AI needs an image prompt.");
      return coreImage.run(client, context);
    case "VIDEO":
      context.args = [String(args?.prompt || "")].filter(Boolean);
      if (!context.args.length) return context.reply("AI needs a video prompt.");
      return coreVideo.run(client, context);
    case "WEB":
      return handleWebAction(args, context);
    case "VOLUME":
      context.args = [String(args?.level || "")].filter(Boolean);
      return coreVolume.run(client, context);
    case "FILTER":
      context.args = [String(args?.filter || "")].filter(Boolean);
      if (args?.level !== undefined) context.args.push(String(args.level));
      return coreFilters.run(client, context);
    case "LOOP":
      context.args = [String(args?.mode || "")].filter(Boolean);
      return coreLoop.run(client, context);
    case "CLEAR":
      return coreQueueClear.run(client, context);
    case "CHAT": {
      const text = String(args?.text || "").slice(0, 1800);
      if (!text) return context.reply("AI did not return a message.");
      return context.reply(text);
    }
    case "BLOCK":
      return context.reply(String(args?.reason || "Invalid AI action.").slice(0, 1800));
    case "BAN":
    case "UNBAN":
    case "KICK":
    case "NUKE":
    case "MUTE":
    case "UNMUTE":
    case "TIMEOUT":
    case "UNTIMEOUT":
    case "WARN":
    case "WARNS":
    case "CLEARWARNS":
    case "PURGE":
    case "LOCK":
    case "UNLOCK":
    case "SLOWMODE":
    case "NICK":
    case "ROLEADD":
    case "ROLEREMOVE":
      return handleModeration(action, args, context);
    default:
      return context.reply("Invalid AI action.");
  }
}

async function run(client, context) {
  if (!context.guildId) return context.reply("Use this in a server.");
  const raw = context.args?.join(" ").trim() || context.options?.message || "";
  const words = String(raw || "").trim().split(/\s+/).filter(Boolean);
  const sub = (words[0] || "").toLowerCase();

  const doc = await Guild.findOne({ guildId: context.guildId }).lean();
  const personality = doc?.personality || "chill";
  const language = doc?.language || "English";
  const aiEnabled = doc?.aiEnabled !== false;
  const aiAutoDisabled = doc?.aiAutoDisabled === true;
  const aiIdleMinutes = Number.isFinite(Number(doc?.aiIdleMinutes))
    ? Math.max(AI_IDLE_MIN_MINUTES, Math.min(AI_IDLE_MAX_MINUTES, Math.floor(Number(doc.aiIdleMinutes))))
    : AI_IDLE_DEFAULT_MINUTES;
  const currentAllowedChannels = getAiAllowedChannels(doc);

  if (sub === "on" || sub === "enable") {
    const targetChannelId = normalizeChannelId(context.channelId);
    const nextChannels = targetChannelId ? [targetChannelId] : currentAllowedChannels;
    await Guild.updateOne(
      { guildId: context.guildId },
      { $set: { aiEnabled: true, aiAutoDisabled: false, aiAllowedChannelIds: nextChannels } }
    );
    clearPendingAction(client, context);
    if (!targetChannelId) return context.reply("AI enabled.");
    return context.reply(`AI enabled in <#${targetChannelId}> only.`);
  }
  if (sub === "off" || sub === "disable") {
    const scope = String(words[1] || "").toLowerCase();
    if (scope === "all" || scope === "global" || scope === "everywhere") {
      if (!isAdministrator(context)) return context.reply("Only server administrators can disable AI everywhere.");
      await Guild.updateOne(
        { guildId: context.guildId },
        { $set: { aiEnabled: false, aiAutoDisabled: false, aiAllowedChannelIds: [] } },
        { upsert: true }
      );
      clearPendingAction(client, context);
      return context.reply("AI disabled in all channels.");
    }
    const targetChannelId = normalizeChannelId(context.channelId);
    const nextChannels = currentAllowedChannels.filter(id => id !== targetChannelId);
    const stillEnabled = nextChannels.length > 0;
    await Guild.updateOne(
      { guildId: context.guildId },
      { $set: { aiEnabled: stillEnabled, aiAutoDisabled: false, aiAllowedChannelIds: nextChannels } },
      { upsert: true }
    );
    clearPendingAction(client, context);
    if (!targetChannelId) return context.reply(stillEnabled ? "AI updated." : "AI disabled.");
    if (stillEnabled) return context.reply(`AI disabled in <#${targetChannelId}>.`);
    return context.reply(`AI disabled in <#${targetChannelId}>. No AI channels remain enabled.`);
  }
  if (sub === "idle" || sub === "autoff" || sub === "timeout") {
    if (!isAdministrator(context)) return context.reply("Only server administrators can change AI auto-disable time.");
    const raw = String(words[1] || "status").toLowerCase();
    if (raw === "status" || raw === "show") {
      if (aiIdleMinutes <= 0) return context.reply("AI auto-disable: off.");
      return context.reply(`AI auto-disable: ${aiIdleMinutes} minute(s).`);
    }
    if (raw === "off" || raw === "disable" || raw === "none" || raw === "0") {
      await Guild.updateOne(
        { guildId: context.guildId },
        { $set: { aiIdleMinutes: 0 } },
        { upsert: true }
      );
      return context.reply("AI auto-disable disabled.");
    }
    const minutes = Number.parseInt(raw, 10);
    if (!Number.isFinite(minutes) || minutes < AI_IDLE_MIN_MINUTES || minutes > AI_IDLE_MAX_MINUTES) {
      return context.reply(`Use: \`ai idle <minutes>\` (0-${AI_IDLE_MAX_MINUTES}) | \`ai idle off\` | \`ai idle status\`.`);
    }
    await Guild.updateOne(
      { guildId: context.guildId },
      { $set: { aiIdleMinutes: minutes } },
      { upsert: true }
    );
    if (minutes === 0) return context.reply("AI auto-disable disabled.");
    return context.reply(`AI auto-disable set to ${minutes} minute(s).`);
  }
  if (sub === "personality") {
    const mode = String(words[1] || "").toLowerCase();
    if (!PERSONALITIES.has(mode)) return context.reply("Use: chill | hype | meme");
    await Guild.updateOne(
      { guildId: context.guildId },
      { $set: { personality: mode } }
    );
    clearPendingAction(client, context);
    return context.reply(`Personality set to ${mode}.`);
  }
  if (sub === "language") {
    const lang = String(words.slice(1).join(" ") || "").trim();
    if (!lang) return context.reply("Provide a language name.");
    const nextLang = lang.slice(0, 32);
    await Guild.updateOne(
      { guildId: context.guildId },
      { $set: { language: nextLang } }
    );
    clearPendingAction(client, context);
    return context.reply(`Language set to ${nextLang}.`);
  }
  if (sub === "channel") {
    if (!isAdministrator(context)) return context.reply("Only server administrators can manage AI channels.");
    const action = String(words[1] || "list").toLowerCase();
    const targetRaw = String(words.slice(2).join(" ") || "").trim();
    const targetId = normalizeChannelId(targetRaw || context.channelId);
    const docNow = await Guild.findOne({ guildId: context.guildId }).lean();
    const current = getAiAllowedChannels(docNow);

    if (action === "list") {
      return context.reply([
        "AI channels:",
        formatChannelList(current, context.guild)
      ].join("\n"));
    }

    if (action === "clear" || action === "reset") {
      await Guild.updateOne(
        { guildId: context.guildId },
        { $set: { aiAllowedChannelIds: [] } },
        { upsert: true }
      );
      return context.reply("AI channels cleared.");
    }

    if (!targetId) return context.reply("Provide a text channel mention or ID.");

    if (action === "add" || action === "here" || action === "enable") {
      if (!current.includes(targetId)) current.push(targetId);
      await Guild.updateOne(
        { guildId: context.guildId },
        { $set: { aiAllowedChannelIds: current } },
        { upsert: true }
      );
      return context.reply(`AI enabled in <#${targetId}>.`);
    }

    if (action === "remove" || action === "delete" || action === "del" || action === "disable") {
      const next = current.filter(id => id !== targetId);
      await Guild.updateOne(
        { guildId: context.guildId },
        { $set: { aiAllowedChannelIds: next } },
        { upsert: true }
      );
      return context.reply(`AI removed from <#${targetId}>.`);
    }

    return context.reply("Use: `ai channel add`, `ai channel remove`, `ai channel list`, or `ai channel clear`.");
  }
  if (sub === "status") {
    const status = aiEnabled ? "on" : "off";
    const auto = aiAutoDisabled ? " (auto disabled)" : "";
    const channels = currentAllowedChannels.length
      ? formatChannelList(currentAllowedChannels, context.guild)
      : "None";
    const idleText = aiIdleMinutes <= 0 ? "off" : `${aiIdleMinutes}m`;
    return context.reply(`AI: ${status}${auto} • personality: ${personality} • language: ${language} • auto-disable: ${idleText}\nChannels: ${channels}`);
  }

  if (!aiEnabled) {
    const msg = aiAutoDisabled
      ? "AI is disabled due to inactivity. Use `ai on` in this channel to reactivate."
      : "AI is disabled here. Use `ai on` in this channel.";
    return context.reply(msg);
  }

  const message = String(raw || "").trim();
  if (!message) return context.reply("Provide a message for AI.");
  if (message.length > 500) return context.reply("Message too long. Keep under 500 characters.");

  if (!isAdministrator(context)) {
    if (!client.aiRateLimit) client.aiRateLimit = new Map();
    const now = Date.now();
    const last = client.aiRateLimit.get(context.userId) || 0;
    if (now - last < 4000) return context.reply("Slow down. Try again in a few seconds.");
    client.aiRateLimit.set(context.userId, now);
  }

  return resolveAndRunAction(client, context, message, personality, language, { allowModeration: true });
}

async function runChat(client, context, messageText) {
  if (!context.guildId) return;
  const doc = await Guild.findOne({ guildId: context.guildId }).lean();
  const personality = doc?.personality || "chill";
  const language = doc?.language || "English";
  const aiEnabled = doc?.aiEnabled !== false;
  if (!aiEnabled) return;
  const allowedChannels = getAiAllowedChannels(doc);
  if (!allowedChannels.length) return;
  if (!context.channelId || !allowedChannels.includes(String(context.channelId))) return;
  const message = String(messageText || "").trim();
  if (!message) return;
  if (message.length > 500) return context.reply("Message too long. Keep under 500 characters.");
  return resolveAndRunAction(client, context, message, personality, language, { allowModeration: true });
}

module.exports = { run, runChat, handleModeration };
