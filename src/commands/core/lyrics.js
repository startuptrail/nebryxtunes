const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { requirePlayer } = require("../../lib/playerHelpers");

function buildLyricsRow(title) {
  const query = title || "lyrics";
  const url = `https://genius.com/search?q=${encodeURIComponent(query)}`;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel("See Full Lyrics")
  );
}

async function run(client, context) {
  const query = context.args.join(" ").trim() || context.options?.query;
  let title = query;
  if (!title) {
    const playerCheck = requirePlayer(client, context.guildId);
    if (!playerCheck.ok) return context.reply("Provide a song name or have something playing.");
    const player = playerCheck.player;
    title = player.current?.info?.title || player.current?.title || "";
  }
  if (!title) return context.reply("No song to search lyrics for.");
  try {
    const res = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(title)}`);
    const data = await res.json();
    if (data.error || !data.lyrics) {
      return context.reply({
        content: "Lyrics not found. Use See Lyrics to search live.",
        components: [buildLyricsRow(title)]
      });
    }
    const text = (data.lyrics || "").slice(0, 1900);
    const displayTitle = data.title || title;
    const displayAuthor = data.author ? ` — ${data.author}` : "";
    await context.reply({
      content: `**${displayTitle}**${displayAuthor}\n\n${text}`,
      components: [buildLyricsRow(displayTitle)]
    });
  } catch (_) {
    await context.reply({
      content: "Could not fetch lyrics. Use See Lyrics to search live.",
      components: [buildLyricsRow(title)]
    });
  }
}

module.exports = { run };
