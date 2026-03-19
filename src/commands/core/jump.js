const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const raw = context.args[0] ?? context.options?.position ?? context.options?.index;
  const index = parseInt(raw, 10);
  if (isNaN(index) || index < 1) return context.reply("Provide a valid queue position (e.g. 1).");
  const list = player.queue;
  const size = list.size ?? list.length ?? 0;
  if (index > size) return context.reply("That position is not in the queue.");
  const toPlay = list.remove(index - 1);
  if (toPlay) {
    if (typeof list.unshift === "function") list.unshift(toPlay);
    else list.add(toPlay);
    player.stop();
  }
  await context.reply(`Jumped to position **${index}**.`);
}

module.exports = { run };
