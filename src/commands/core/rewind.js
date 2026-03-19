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
  const newPos = Math.max(0, (player.position ?? 0) - sec * 1000);
  player.seek(newPos);
  await context.reply(`Rewound ${sec}s.`);
}

module.exports = { run };
