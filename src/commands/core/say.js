const { PermissionsBitField } = require("discord.js");

function hasAccess(context) {
  const member = context.member;
  if (!member?.permissions) return false;
  return member.permissions.has(PermissionsBitField.Flags.Administrator)
    || member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    || member.permissions.has(PermissionsBitField.Flags.ManageMessages);
}

async function run(client, context) {
  if (!context.guildId) return context.reply("Use this in a server.");
  if (!hasAccess(context)) {
    return context.reply("You do not have access to use this command.");
  }

  const text = String(context.args?.join(" ") || context.options?.text || "").trim();
  if (!text) return context.reply("Provide text to send.");
  if (text.length > 1800) return context.reply("Message too long. Keep under 1800 characters.");

  const channel = context.channel;
  if (!channel || typeof channel.send !== "function") {
    return context.reply("Cannot access this channel.");
  }

  await channel.send({ content: text, allowedMentions: { parse: [] } });
  return context.reply("Sent.");
}

module.exports = { run };
