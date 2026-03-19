const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const sub = (context.args[0] ?? context.options?.mode ?? "").toLowerCase();
  const modes = { song: "track", track: "track", queue: "queue", off: "none", none: "none" };
  const mode = modes[sub] ?? (player.loop === "none" ? "queue" : player.loop === "queue" ? "track" : "none");
  player.setLoop(mode);
  const labels = { track: "Loop song", queue: "Loop queue", none: "Loop off" };
  await context.reply(`${labels[mode]}.`);
}

module.exports = { run };
