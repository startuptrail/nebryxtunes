const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

const DEFAULT_SEC = 10;

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const raw = context.args[0] ?? context.options?.seconds ?? DEFAULT_SEC;
  const sec = parseInt(raw, 10) || DEFAULT_SEC;
  const length = player.current?.info?.length;
  const remaining = typeof length === "number" && length > 0 ? Math.max(0, length - (player.position ?? 0)) : null;
  const ms = remaining === null ? sec * 1000 : Math.min(sec * 1000, remaining);
  const newPos = (player.position ?? 0) + ms;
  player.seek(Math.max(0, newPos));
  await context.reply("Forwarded " + sec + "s.");
}

module.exports = { run };
