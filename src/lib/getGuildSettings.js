const Guild = require("../database/models/Guild");
const { isDatabaseReady } = require("../database/connect");

async function getGuildSettings(guildId) {
  if (!isDatabaseReady()) {
    return { guildId };
  }

  let doc = await Guild.findOne({ guildId }).lean().catch(() => null);
  if (!doc) {
    doc = await Guild.create({ guildId }).catch(() => null);
    if (!doc) return { guildId };
    doc = doc.toObject ? doc.toObject() : doc;
  }
  return doc;
}

module.exports = getGuildSettings;
