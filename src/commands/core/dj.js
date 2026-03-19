const getGuildSettings = require("../../lib/getGuildSettings");
const Guild = require("../../database/models/Guild");

async function run(client, context) {
  if (!context.guildId) return context.reply("Use this in a server.");
  const sub = (context.args[0] ?? context.options?.action ?? "").toLowerCase();
  if (sub === "set") {
    const roleId = context.options?.role ?? context.args[1] ?? context.member?.roles?.highest?.id;
    if (!roleId) return context.reply("Provide a role or have a role.");
    await Guild.updateOne(
      { guildId: context.guildId },
      { $set: { djRole: roleId } },
      { upsert: true }
    );
    if (client.guildPrefixes) client.guildPrefixes.set(context.guildId, null);
    return context.reply("DJ role set.");
  }
  if (sub === "remove") {
    await Guild.updateOne(
      { guildId: context.guildId },
      { $set: { djRole: null } },
      { upsert: true }
    );
    return context.reply("DJ role removed.");
  }
  const doc = await getGuildSettings(context.guildId);
  if (doc.djRole) {
    await context.reply(`Current DJ role: <@&${doc.djRole}>`);
  } else {
    await context.reply("No DJ role set. Use `dj set <role>`.");
  }
}

module.exports = { run };
