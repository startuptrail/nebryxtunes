const Guild = require("../../database/models/Guild");
const { getPrefix } = require("../../lib/playerHelpers");

async function run(client, context) {
  if (!context.guildId) return context.reply("Use this in a server.");
  const raw = context.args[0] ?? context.options?.value ?? "";
  const value = String(raw || "").trim();
  if (!value) {
    const current = getPrefix(client, context.guildId);
    return context.reply(`Current prefix: \`${current}\``);
  }
  const prefix = value.slice(0, 5);
  await Guild.updateOne(
    { guildId: context.guildId },
    { $set: { prefix } },
    { upsert: true }
  );
  if (client.guildPrefixes) client.guildPrefixes.set(context.guildId, prefix);
  await context.reply(`Prefix set to \`${prefix}\``);
}

module.exports = { run };
