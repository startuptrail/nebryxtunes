const { EmbedBuilder } = require("discord.js");
const os = require("os");
const config = require("../../../config");
const { getPoweredByText } = require("../../lib/branding");
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
function memBar(used, total) {
  const pct = used / total;
  const filled = Math.round(pct * 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${(pct * 100).toFixed(1)}%`;
}
function getNodeInfo(client) {
  try {
    return [...client.riffy.nodeMap.values()].map(n => ({
      name: n.name,
      connected: n.connected,
      players: n.stats?.players || 0,
      ping: n.stats?.ping ?? null
    }));
  } catch (_) { return []; }
}
function getActivePlayers(client) {
  try { return [...client.riffy.players.values()].filter(p => p.playing).length; }
  catch (_) { return 0; }
}
module.exports = {
  run: async (client, context) => {
    const requester = context.interaction?.user || context.message?.author;
    const memUsed = process.memoryUsage().heapUsed;
    const memTotal = os.totalmem();
    const memUsedMB = (memUsed / 1024 / 1024).toFixed(1);
    const memTotalMB = (memTotal / 1024 / 1024).toFixed(0);
    const uptime = formatUptime(client.startedAt ? Date.now() - client.startedAt : process.uptime() * 1000);
    const nodes = getNodeInfo(client);
    const activePlayers = getActivePlayers(client);
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const lavalinkValue = nodes.length
      ? nodes.map(n =>
          `**${n.name}** ${n.connected ? "🟢 Online" : "🔴 Offline"}\n` +
          (n.connected ? `📡 Ping \`${n.ping ?? "?"}ms\` • 🎶 Players \`${n.players}\`` : "")
        ).join("\n")
      : "🔴 No nodes configured";
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: `${client.user.username} — System Status`, iconURL: client.user.displayAvatarURL() })
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "🤖  Bot",
          value: [
            `🏷️ **Tag** \`${client.user.tag}\``,
            `⏱️ **Uptime** \`${uptime}\``,
            `🌐 **Ping** \`${Math.round(client.ws.ping)}ms\``,
            `🟩 **Node.js** \`${process.version}\``,
            `⚡ **Commands** \`${client.slashCommands.size}\``
          ].join("\n"),
          inline: true
        },
        {
          name: "📊  Stats",
          value: [
            `🖥️ **Servers** \`${guildCount}\``,
            `👥 **Users** \`${userCount.toLocaleString()}\``,
            `💬 **Channels** \`${client.channels.cache.size}\``,
            `🎶 **Playing** \`${activePlayers}\` players`,
            `⏱️ **Uptime** \`${uptime}\``
          ].join("\n"),
          inline: true
        },
        {
          name: "🎵  Lavalink",
          value: lavalinkValue,
          inline: true
        },
        {
          name: "💾  Memory",
          value: `\`${memBar(memUsed, memTotal)}\`\n📦 \`${memUsedMB} MB\` used of \`${memTotalMB} MB\``,
          inline: false
        },
        {
          name: "⚙️  System",
          value: [
            `💻 **Platform** \`${os.platform()} ${os.arch()}\``,
            `🔧 **CPU** \`${(os.cpus()?.[0]?.model || "Unknown").trim().slice(0, 40)}\``,
            `🕐 **OS Uptime** \`${formatUptime(os.uptime() * 1000)}\``
          ].join("\n"),
          inline: false
        },
        {
          name: "🌐  Powered By",
          value: getPoweredByText(),
          inline: false
        },
        {
          name: "🔗  Links",
          value: [
            config.websiteUrl ? `[Website](${config.websiteUrl})` : "Website: Not set",
            config.supportUrl ? `[Support Server](${config.supportUrl})` : "Support Server: Not set",
            config.contactEmail ? `[Email](mailto:${config.contactEmail})` : "Email: Not set"
          ].join("\n"),
          inline: false
        }
      )
      .setFooter({
        text: `Requested by ${requester?.username || "Unknown"} • ${new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}`,
        iconURL: requester?.displayAvatarURL() || client.user.displayAvatarURL()
      })
      .setTimestamp();
    await context.reply({ embeds: [embed] });
  }
};
