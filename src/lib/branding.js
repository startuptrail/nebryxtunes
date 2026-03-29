const config = require("../../config");

function getBotName() {
  return String(config?.branding?.botName || "NebryxTunes").trim() || "NebryxTunes";
}

function getBotNameUpper() {
  return getBotName().toUpperCase();
}

function getOwnerName() {
  return String(config?.branding?.ownerName || "StartupGaming").trim() || "StartupGaming";
}

function getPoweredByText() {
  return `> 🚀 **${getBotName()}**\n> By **🤖 Bot Team Devs**`;
}

function getNowPlayingFooter() {
  return `${getBotName()} • Now Playing`;
}

module.exports = {
  getBotName,
  getBotNameUpper,
  getOwnerName,
  getPoweredByText,
  getNowPlayingFooter
};
