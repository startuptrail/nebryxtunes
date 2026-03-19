const Guild = require("../database/models/Guild");

async function getGuildSettings(guildId) {
  let doc = await Guild.findOne({ guildId }).lean();
  if (!doc) {
    doc = await Guild.create({ guildId });
    doc = doc.toObject ? doc.toObject() : doc;
  }
  return doc;
}

module.exports = getGuildSettings;
