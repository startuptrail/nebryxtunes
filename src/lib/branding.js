const config = require("../../config");

function getBotName() {
  return String(config?.branding?.botName || "NebryxTunes").trim() || "NebryxTunes";
}

function getBotNameUpper() {
  return getBotName().toUpperCase();
}

function getOwnerName() {
  return String(config?.branding?.ownerName || "Not Flexxy").trim() || "Not Flexxy";
}

function getPoweredByText() {
  return `> 🚀 **${getBotName()}**\n> Owned by **${getOwnerName()}**`;
}

function getNowPlayingFooter() {
  return `${getBotName()} • Now Playing • Developed By ${getOwnerName()}`;
}

module.exports = {
  getBotName,
  getBotNameUpper,
  getOwnerName,
  getPoweredByText,
  getNowPlayingFooter
};
