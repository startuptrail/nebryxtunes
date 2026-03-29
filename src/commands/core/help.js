const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const config = require("../../../config");
const { getPrefix } = require("../../lib/playerHelpers");
const { getBotName } = require("../../lib/branding");

function formatUptime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  const parts = [];
  if (d) parts.push(d + "d");
  if (h) parts.push(h + "h");
  if (m) parts.push(m + "m");
  parts.push(s + "s");
  return parts.join(" ");
}

function shorten(text, max = 4096) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

function getCommands() {
  return [
    { name: "play", description: "Play a track", category: "Music", usage: "play <query>", aliases: ["p"] },
    { name: "pause", description: "Pause playback", category: "Music", usage: "pause", aliases: ["ps"] },
    { name: "resume", description: "Resume playback", category: "Music", usage: "resume", aliases: ["rs"] },
    { name: "stop", description: "Stop playback", category: "Music", usage: "stop", aliases: ["stp"] },
    { name: "skip", description: "Skip current track", category: "Music", usage: "skip", aliases: ["s"] },
    { name: "previous", description: "Play previous track", category: "Music", usage: "previous", aliases: ["prev"] },
    { name: "nowplaying", description: "Show now playing", category: "Music", usage: "nowplaying", aliases: ["np"] },
    { name: "search", description: "Search for tracks", category: "Music", usage: "search <query>", aliases: ["sr"] },
    { name: "request", description: "Request a track", category: "Music", usage: "request <query>", aliases: ["req"] },
    { name: "voteskip", description: "Vote to skip", category: "Music", usage: "voteskip", aliases: ["vs"] },

    { name: "queue", description: "Show the queue", category: "Queue", usage: "queue [page]", aliases: ["q", "qp"] },
    { name: "queueClear", description: "Clear the queue", category: "Queue", usage: "queue clear", aliases: ["qc"] },
    { name: "remove", description: "Remove a track", category: "Queue", usage: "remove <position>", aliases: ["qr"] },
    { name: "jump", description: "Jump to a position", category: "Queue", usage: "jump <position>", aliases: ["qj"] },
    { name: "shuffle", description: "Shuffle the queue", category: "Queue", usage: "shuffle", aliases: ["qs"] },
    { name: "history", description: "Show queue history", category: "Queue", usage: "history", aliases: ["qh"] },

    { name: "seek", description: "Seek to time", category: "Time", usage: "seek <position>", aliases: ["seek"] },
    { name: "forward", description: "Forward by seconds", category: "Time", usage: "forward [seconds]", aliases: ["fw"] },
    { name: "rewind", description: "Rewind by seconds", category: "Time", usage: "rewind [seconds]", aliases: ["rw"] },

    { name: "join", description: "Join your voice channel", category: "Voice", usage: "join", aliases: ["j"] },
    { name: "leave", description: "Leave voice channel", category: "Voice", usage: "leave", aliases: ["l"] },
    { name: "reconnect", description: "Reconnect the player", category: "Voice", usage: "reconnect", aliases: ["rc"] },
    { name: "move", description: "Move to your voice channel", category: "Voice", usage: "move [channel]", aliases: ["mv"] },

    { name: "loop", description: "Loop mode", category: "Loop / 24/7", usage: "loop <song|queue|off>", aliases: ["ls", "lq", "lo"] },
    { name: "autoplay", description: "Toggle autoplay", category: "Loop / 24/7", usage: "autoplay", aliases: ["ap"] },
    { name: "247", description: "24/7 music or no-music stay mode", category: "Loop / 24/7", usage: "247 <music|nomusic|off|status>", aliases: ["247", "247off", "247nomusic", "247nm"] },

    { name: "playlist", description: "Manage playlists", category: "Playlists", usage: "playlist <create|add|remove|play|delete|list>", aliases: ["plc", "pla", "plr", "plp", "pld", "pll"] },

    { name: "filters", description: "Manage filters", category: "Filters", usage: "filters <filter> [level]", aliases: [] },
    { name: "8d", description: "8D filter", category: "Filters", usage: "8d", aliases: [] },
    { name: "nightcore", description: "Nightcore filter", category: "Filters", usage: "nightcore", aliases: ["nc"] },
    { name: "vaporwave", description: "Vaporwave filter", category: "Filters", usage: "vaporwave", aliases: ["vw"] },
    { name: "bassboost", description: "Bassboost filter", category: "Filters", usage: "bassboost [level]", aliases: ["bb", "sb"] },
    { name: "karaoke", description: "Karaoke filter", category: "Filters", usage: "karaoke", aliases: ["kr"] },
    { name: "resetfilters", description: "Reset filters", category: "Filters", usage: "resetfilters", aliases: ["rf"] },

    { name: "lyrics", description: "Show lyrics", category: "Info", usage: "lyrics [song]", aliases: ["ly"] },
    { name: "songinfo", description: "Show song info", category: "Info", usage: "songinfo", aliases: ["si"] },
    { name: "ping", description: "Show bot latency", category: "Info", usage: "ping", aliases: ["ping"] },
    { name: "uptime", description: "Show bot uptime", category: "Info", usage: "uptime", aliases: ["up"] },
    { name: "stats", description: "Show bot stats", category: "Info", usage: "stats", aliases: ["stats"] },
    { name: "updates", description: "Show bot update versions and changelog", category: "Info", usage: "updates [latest|v3|v2|v1|maintenance]", aliases: ["changelog", "news"] },
    { name: "maintance", description: "Global maintenance mode (bot owner only)", category: "Info", usage: "maintance start <time> [--allow=help,ping] | maintance end | maintance status | /maintance start|end|status", aliases: ["maintenance"] },
    { name: "help", description: "Show help menu", category: "Info", usage: "help [category|command]", aliases: ["h"] },
    { name: "prefix", description: "View or change prefix", category: "Settings", usage: "prefix [newPrefix]", aliases: [] },
    { name: "auto", description: "Set and manage server auto responses", category: "Settings", usage: "auto show | auto <trigger>:<reply> | auto clear [trigger] | auto migrate [current|all]", aliases: [] },
    { name: "autoglobal", description: "Owner-only auto response for all channels", category: "Settings", usage: "autoglobal show | autoglobal <trigger>:<reply> | autoglobal clear [trigger] | /autoglobal response", aliases: ["agauto", "gauto"] },

    { name: "dj", description: "Manage DJ role", category: "DJ", usage: "dj <set|remove>", aliases: ["djset", "djrm"] },
    { name: "ai", description: "AI chat and moderation", category: "AI", usage: "ai <message|status|on|off|off all|personality|language|idle|channel> | idle <minutes|off|status> | channel add/remove/list/clear", aliases: [] },
    { name: "aimod", description: "AI moderation (optional command)", category: "AI", usage: "aimod <request>", aliases: ["modai", "mod"] }
  ];
}

function groupByCategory(commands) {
  return commands.reduce((acc, cmd) => {
    const key = cmd.category || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(cmd);
    return acc;
  }, {});
}

function getInviteUrl(client) {
  const id = client?.user?.id;
  if (!id) return null;
  return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=3148800&scope=bot%20applications.commands`;
}

function normalize(input) {
  return String(input || "").toLowerCase().trim();
}

function findCommand(commands, query) {
  const q = normalize(query);
  if (!q) return null;
  return commands.find(cmd => {
    if (normalize(cmd.name) === q) return true;
    return Array.isArray(cmd.aliases) && cmd.aliases.some(a => normalize(a) === q);
  }) || null;
}

function buildOverview(client, prefix, commands) {
  const grouped = groupByCategory(commands);
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const guildCount = client.guilds?.cache?.size ?? 0;
  const ms = client.startedAt ? Date.now() - client.startedAt : 0;
  const uptimeStr = formatUptime(ms);
  const botName = getBotName();
  return {
    title: `${botName} Command Suite`,
    color: 0x5865f2,
    thumbnail: client.user?.displayAvatarURL?.({ size: 128, extension: "png" }) ? { url: client.user.displayAvatarURL({ size: 128, extension: "png" }) } : undefined,
    fields: [
      {
        name: "System Overview",
        value: `Commands: **${commands.length}**\nModules: **${categories.length}**\nPrefix: \`${prefix}\`\nUptime: **${uptimeStr}**\nServing: **${guildCount}** servers`
      },
      {
        name: "Navigating Commands",
        value: `\`${prefix}help [category|command]\`\nExample: \`${prefix}help music\``
      },
      {
        name: "Essential Links",
        value: [
          config.websiteUrl ? `[Website](${config.websiteUrl})` : "Website: Not set",
          config.supportUrl ? `[Support Server](${config.supportUrl})` : "Support Server: Not set",
          config.contactEmail ? `[Email](mailto:${config.contactEmail})` : "Email: Not set",
          getInviteUrl(client) ? `[Invite Bot](${getInviteUrl(client)})` : "Invite Bot: Not set"
        ].join("\n")
      }
    ]
  };
}

function buildCategory(prefix, category, commands, index, total) {
  const grouped = groupByCategory(commands);
  const list = grouped[category] || [];
  const names = list
    .map(cmd => `\`${cmd.name}\` — ${cmd.description}`)
    .sort((a, b) => a.localeCompare(b));
  const desc = names.length ? names.join("\n") : "No commands in this category.";
  return {
    title: `${category} Commands`,
    color: 0x5865f2,
    description: shorten(desc),
    footer: typeof index === "number" && typeof total === "number"
      ? { text: `Category ${index + 1}/${total}` }
      : undefined
  };
}

function buildCommand(prefix, command) {
  const aliases = command.aliases && command.aliases.length ? command.aliases.join(", ") : "None";
  const desc = `**${command.description}**\n\nUsage: \`${prefix}${command.usage || command.name}\`\nAliases: ${aliases}\nCategory: ${command.category}`;
  return {
    title: `Help — ${command.name}`,
    color: 0x5865f2,
    description: shorten(desc)
  };
}

function buildHelpComponents(categories, grouped, currentIndex) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_category")
    .setPlaceholder("Choose a Category for Help")
    .addOptions(categories.map(cat => ({
      label: cat,
      value: cat,
      description: `${grouped[cat].length} commands`
    })));
  const selectRow = new ActionRowBuilder().addComponents(menu);
  const hasIndex = typeof currentIndex === "number";
  const prevId = `help_prev:${hasIndex ? currentIndex : 0}`;
  const nextId = `help_next:${hasIndex ? currentIndex : 0}`;
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("help_home").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(prevId).setEmoji("◀️").setStyle(ButtonStyle.Secondary).setDisabled(!hasIndex),
    new ButtonBuilder().setCustomId(nextId).setEmoji("▶️").setStyle(ButtonStyle.Secondary).setDisabled(!hasIndex),
    new ButtonBuilder().setCustomId("help_close").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );
  return [buttonRow, selectRow];
}

function buildHelpPayload(client, guildId, view) {
  const prefix = getPrefix(client, guildId);
  const commands = getCommands();
  const grouped = groupByCategory(commands);
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  let embed;
  let index = null;
  if (view?.type === "category") {
    index = categories.findIndex(cat => normalize(cat) === normalize(view.category));
    if (index >= 0) {
      embed = buildCategory(prefix, categories[index], commands, index, categories.length);
    }
  }
  if (!embed && view?.type === "categoryIndex") {
    const total = categories.length;
    if (total) {
      const raw = Number.isFinite(view.index) ? view.index : 0;
      index = ((raw % total) + total) % total;
      embed = buildCategory(prefix, categories[index], commands, index, total);
    }
  }
  if (!embed && view?.type === "command") {
    const cmd = findCommand(commands, view.command);
    if (cmd) {
      embed = buildCommand(prefix, cmd);
      index = categories.findIndex(cat => normalize(cat) === normalize(cmd.category));
    }
  }
  if (!embed) embed = buildOverview(client, prefix, commands);
  return { embeds: [embed], components: buildHelpComponents(categories, grouped, index) };
}

async function replyWith(context, payload) {
  const content = payload.embeds ? payload : { embeds: [payload] };
  if (context.interaction) {
    if (context.interaction.deferred) await context.interaction.editReply(content).catch(() => {});
    else await context.interaction.reply(content).catch(() => {});
    return;
  }
  await context.reply(content);
}

async function run(client, context) {
  const query = context.args?.[0] ?? context.options?.query;
  const normalizedQuery = normalize(query);
  if (normalizedQuery) {
    const commands = getCommands();
    const grouped = groupByCategory(commands);
    const category = Object.keys(grouped).find(cat => normalize(cat) === normalizedQuery);
    if (category) {
      const payload = buildHelpPayload(client, context.guildId, { type: "category", category });
      return replyWith(context, payload);
    }
    const command = findCommand(commands, normalizedQuery);
    if (!command) {
      return replyWith(context, {
        embeds: [{
          title: "Help — Not found",
          color: 0x5865f2,
          description: `Command or category not found.\nUse \`${getPrefix(client, context.guildId)}help <category>\` or \`${getPrefix(client, context.guildId)}help <command>\``
        }]
      });
    }
    return replyWith(context, buildHelpPayload(client, context.guildId, { type: "command", command: command.name }));
  }
  return replyWith(context, buildHelpPayload(client, context.guildId, { type: "overview" }));
}

module.exports = { run, buildHelpPayload };
