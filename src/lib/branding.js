const config = require("../../config");

function getBotName() {
  return String(config?.branding?.botName || "NebryxTunes").trim() || "NebryxTunes";
}

function getBotNameUpper() {
  return getBotName().toUpperCase();
}

function getPoweredByText() {
  return `> 🚀 **${getBotName()}**\n> All rights reserved.`;
}

function getNowPlayingFooter() {
  return `${getBotName()} • Now Playing • Developed By Pranav`;
}

module.exports = {
  getBotName,
  getBotNameUpper,
  getPoweredByText,
  getNowPlayingFooter
};
