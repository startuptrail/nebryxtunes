const { requirePlayer } = require("../../lib/playerHelpers");

const PER_PAGE = 10;

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "0:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function run(client, context) {
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const page = parseInt(context.args[0] || context.options?.page || "1", 10) || 1;
  const list = player.queue || [];
  const size = list.size ?? list.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(size / PER_PAGE));
  const p = Math.min(page, totalPages);
  const start = (p - 1) * PER_PAGE;
  let lines = [];
  if (player.current) {
    const c = player.current;
    const pos = player.position ?? 0;
    const len = c.info?.length ?? 0;
    lines.push(`**Now playing:** ${c.info?.title || "Unknown"} — \`${formatDuration(pos)}/${formatDuration(len)}\``);
  }
  const arr = Array.isArray(list) ? list : (list.queue ?? Array.from(list));
  for (let i = start; i < Math.min(start + PER_PAGE, arr.length); i++) {
    const t = arr[i];
    const title = t?.info?.title || t?.title || "Unknown";
    const len = t?.info?.length ?? t?.length ?? 0;
    lines.push(`${i + 1}. ${title} — \`${formatDuration(len)}\``);
  }
  const footer = `Page ${p}/${totalPages} • ${size} track(s) in queue`;
  await context.reply(lines.length ? lines.join("\n") + "\n" + footer : footer);
}

module.exports = { run };
