const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

const VOTE_THRESHOLD = 0.5;
const votes = new Map();

function getVoteKey(guildId) {
  return guildId;
}

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const key = getVoteKey(context.guildId);
  let set = votes.get(key);
  if (!set) {
    set = new Set();
    votes.set(key, set);
  }
  const membersInVc = context.member?.voice?.channel?.members?.filter(m => !m.user.bot)?.size ?? 1;
  set.add(context.userId);
  const need = Math.ceil(membersInVc * VOTE_THRESHOLD);
  if (set.size >= need) {
    votes.delete(key);
    player.stop();
    return context.reply("Vote passed. Skipped.");
  }
  await context.reply(`Vote to skip: ${set.size}/${need}.`);
}

module.exports = { run };
