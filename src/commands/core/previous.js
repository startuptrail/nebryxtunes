const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const history = client.previousTracks?.get(context.guildId) ?? [];
  if (!history.length) return context.reply("No previous track.");
  const prev = history.pop();
  const q = player.queue;
  if (player.current) {
    if (typeof q.unshift === "function") q.unshift(player.current);
    else q.add(player.current);
  }
  if (typeof q.unshift === "function") q.unshift(prev);
  else q.add(prev);
  player.stop();
  await context.reply("Playing previous track.");
}

module.exports = { run };
