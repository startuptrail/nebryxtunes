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

async function run(client, context) {
  const ms = client.startedAt ? Date.now() - client.startedAt : 0;
  await context.reply("Uptime: **" + formatUptime(ms) + "**");
}

module.exports = { run };
