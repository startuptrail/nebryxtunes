async function run(client, context) {
  const list = client.previousTracks?.get(context.guildId) ?? [];
  const max = 10;
  const slice = list.slice(-max).reverse();
  if (!slice.length) return context.reply("No history in this server.");
  const lines = slice.map((t, i) => `${i + 1}. **${t?.info?.title ?? t?.title ?? "Unknown"}**`).join("\n");
  await context.reply(`**Recent tracks:**\n${lines}`);
}

module.exports = { run };
