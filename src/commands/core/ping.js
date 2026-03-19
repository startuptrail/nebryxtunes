const { EmbedBuilder } = require("discord.js");
function formatUptime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}
function getColor(ms) {
  if (ms < 100) return 0x57f287;
  if (ms < 200) return 0xfee75c;
  return 0xed4245;
}
function getBar(ms) {
  if (ms < 100) return "🟢";
  if (ms < 150) return "🟢";
  if (ms < 200) return "🟡";
  if (ms < 350) return "🟠";
  return "🔴";
}
function getLabel(ms) {
  if (ms < 100) return "Excellent";
  if (ms < 200) return "Good";
  if (ms < 400) return "Fair";
  return "Poor";
}
function getLavalinkInfo(client) {
  try {
    const node = [...client.riffy.nodeMap.values()].find(n => n.connected);
    if (!node) return { ping: null, players: 0, online: false };
    return {
      ping: typeof node.stats?.ping === "number" ? node.stats.ping : null,
      players: node.stats?.players || 0,
      online: node.connected === true
    };
  } catch (_) { return { ping: null, players: 0, online: false }; }
}
module.exports = {
  run: async (client, context) => {
    const requester = context.interaction?.user || context.message?.author;
    const before = Date.now();
    const msg = await context.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setDescription("```\n⏳ Calculating latency, please wait...\n```")
      ]
    });
    const roundtrip = Date.now() - before;
    const ws = Math.round(client.ws.ping);
    const { ping: lvPing, players: lvPlayers, online: lvOnline } = getLavalinkInfo(client);
    const uptime = formatUptime(client.startedAt ? Date.now() - client.startedAt : process.uptime() * 1000);
    const playing = (() => { try { return [...client.riffy.players.values()].filter(p => p.playing).length; } catch (_) { return 0; } })();
    const embed = new EmbedBuilder()
      .setColor(getColor(roundtrip))
      .setTitle("🏓  Latency Report")
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .setDescription(
        `> **Bot is fully operational** and connected to all services.\n` +
        `> Use \`/status\` for a full system overview.`
      )
      .addFields(
        {
          name: "📡  Network",
          value: [
            `**Roundtrip** ${getBar(roundtrip)} \`${roundtrip}ms\` — ${getLabel(roundtrip)}`,
            `**WebSocket** ${getBar(ws)} \`${ws}ms\` — ${getLabel(ws)}`
          ].join("\n"),
          inline: true
        },
        {
          name: "🎵  Lavalink",
          value: lvOnline
            ? [`**Status** 🟢 Online`, `📡 **Ping** \`${lvPing ?? "N/A"}ms\``, `🎶 **Players** \`${lvPlayers}\``].join("\n")
            : "**Status** 🔴 Offline",
          inline: true
        },
        {
          name: "📊  Bot Stats",
          value: [
            `⏱️ **Uptime** \`${uptime}\``,
            `🖥️ **Servers** \`${client.guilds.cache.size}\``,
            `👥 **Users** \`${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()}\``,
            `💬 **Channels** \`${client.channels.cache.size}\``,
            `⚡ **Commands** \`${client.slashCommands.size}\``,
            `🎶 **Playing** \`${playing}\``
          ].join("\n"),
          inline: true
        },
        {
          name: "🌐  Powered By",
          value: `> 🚀 **Spare Music** — Powered by **SpareCloud**\n> All rights reserved.`,
          inline: false
        }
      )
      .setFooter({
        text: `Requested by ${requester?.username || "Unknown"} • ${new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}`,
        iconURL: requester?.displayAvatarURL() || client.user.displayAvatarURL()
      })
      .setTimestamp();
    if (msg && typeof msg.edit === "function") {
      await msg.edit({ embeds: [embed] });
    } else if (context.interaction?.editReply) {
      await context.interaction.editReply({ embeds: [embed] });
    }
  }
};