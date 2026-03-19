const { getPrefix } = require("../../lib/playerHelpers");

function resolveTarget(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  const name = entry.name || "";
  const args = Array.isArray(entry.args) && entry.args.length ? " " + entry.args.join(" ") : "";
  return `${name}${args}`.trim();
}

function chunkLines(lines, maxLen) {
  const chunks = [];
  let buffer = "";
  for (const line of lines) {
    if (!buffer) {
      if (line.length > maxLen) chunks.push(line.slice(0, maxLen));
      else buffer = line;
      continue;
    }
    if (buffer.length + 1 + line.length <= maxLen) {
      buffer += "\n" + line;
    } else {
      chunks.push(buffer);
      buffer = line;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

module.exports = {
  run: async (client, context) => {
    const prefix = getPrefix(client, context.guildId);
    const entries = [];
    if (client.aliases && typeof client.aliases.entries === "function") {
      for (const [alias, entry] of client.aliases.entries()) {
        const target = resolveTarget(entry);
        if (!target) continue;
        entries.push({ alias, target });
      }
    }
    if (!entries.length) {
      const message = "No prefix shortcuts are configured.";
      if (context.interaction) {
        if (context.interaction.deferred) await context.interaction.editReply(message).catch(() => {});
        else await context.interaction.reply(message).catch(() => {});
        return;
      }
      await context.reply(message);
      return;
    }
    entries.sort((a, b) => a.alias.localeCompare(b.alias));
    const lines = [
      `Prefix shortcuts (prefix: \`${prefix}\`)`,
      ...entries.map(item => `\`${prefix}${item.alias}\` → \`${prefix}${item.target}\``)
    ];
    const chunks = chunkLines(lines, 1800);
    if (context.interaction) {
      const first = chunks.shift();
      if (context.interaction.deferred) await context.interaction.editReply(first).catch(() => {});
      else await context.interaction.reply(first).catch(() => {});
      for (const chunk of chunks) {
        if (context.interaction.followUp) await context.interaction.followUp(chunk).catch(() => {});
      }
      return;
    }
    let sent = false;
    for (const chunk of chunks) {
      if (!sent) {
        await context.reply(chunk);
        sent = true;
      } else if (context.channel && context.channel.send) {
        await context.channel.send(chunk);
      }
    }
  }
};
