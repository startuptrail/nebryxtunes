const pkg = require("../../package.json");
const { getBotName } = require("./branding");

const RELEASE_TEMPLATES = {
  v3: {
    version: pkg.version || "3.0.0",
    features: [
      "✨ Auto responses now work without AI mode/channel.",
      "🎧 Auto responses are now server-scoped only.",
      "⚡ Added auto-response migration commands for old data.",
      "🌟 Added song Hype system (`/hype`, `!hype`, mention `hype`) with now-playing star button."
    ],
    fixes: [
      "Fixed auto trigger being blocked by AI-only channel checks.",
      "Improved AI channel/idle control flow.",
      "Reduced false auto behavior across servers with guild-bound matching.",
      "Fixed music auto-idle race that could end playback/leave flow right after using play.",
      "Improved play command error handling when Lavalink/node is not ready."
    ],
    changes: [
      "Updated help text for auto command usage.",
      "Tweaked update panel with version buttons and templates.",
      "24/7 autoplay now gives higher pick chance to tracks with higher Hype score.",
      "Playback extraction errors are now logged internally instead of spamming channel messages."
    ],
    notes: "Run `!auto migrate all` once after restart (owner account).",
    cta: "`/updates` or `!updates`",
    tags: "#NebryxTunes #MusicBot #Update"
  },
  v2: {
    version: "2.0.0",
    features: [
      "✨ Added AI chat mode.",
      "🎧 Added AI moderation-related flows.",
      "⚡ Improved command parity across prefix, mention, and slash."
    ],
    fixes: [
      "Improved command handling reliability.",
      "Improved runtime behavior for mixed command styles.",
      "Better stability during AI and music operations."
    ],
    changes: [
      "Updated project links and command coverage.",
      "Tweaked interaction handling for smoother UX."
    ],
    notes: "AI support was introduced in this phase.",
    cta: "`/ai`",
    tags: "#NebryxTunes #MusicBot #Update"
  },
  v1: {
    version: "1.0.0",
    features: [
      "✨ Created bot with basic music commands.",
      "🎧 Added queue and playback essentials.",
      "⚡ Added core utility command set."
    ],
    fixes: [
      "Fixed initial command mapping issues.",
      "Improved basic playback flow.",
      "Improved early stability and startup behavior."
    ],
    changes: [
      "Updated initial bot architecture.",
      "Tweaked base command wrappers."
    ],
    notes: "Foundation release.",
    cta: "`!play <song>`",
    tags: "#NebryxTunes #MusicBot #Update"
  }
};

function getLatestVersionKey() {
  const major = Number.parseInt(String(pkg.version || "3").split(".")[0], 10);
  const key = `v${Number.isFinite(major) && major > 0 ? major : 3}`;
  return RELEASE_TEMPLATES[key] ? key : "v3";
}

function buildUpdateEmbed(versionKey, isLatest = false) {
  const key = RELEASE_TEMPLATES[versionKey] ? versionKey : getLatestVersionKey();
  const template = RELEASE_TEMPLATES[key];
  const botName = getBotName();
  return {
    title: `🚀 ${botName} Update${isLatest ? " (Latest)" : ` (${key})`}`,
    color: isLatest ? 0x57f287 : 0x5865f2,
    description: `Version: **${template.version}**`,
    fields: [
      {
        name: "🎶 New Features",
        value: template.features.map((line) => `* ${line}`).join("\n")
      },
      {
        name: "🛠 Fixes & Improvements",
        value: template.fixes.map((line) => `* ${line}`).join("\n")
      },
      {
        name: "📌 Changes",
        value: template.changes.map((line) => `* ${line}`).join("\n")
      },
      {
        name: "💡 Notes",
        value: template.notes
      },
      {
        name: "👉 Try It Now",
        value: template.cta
      },
      {
        name: "Tags",
        value: template.tags
      }
    ],
    timestamp: new Date().toISOString()
  };
}

function buildMaintenanceEmbed(downtimeText) {
  const botName = getBotName();
  const downtime = String(downtimeText || "Not specified").trim();
  return {
    title: `⚠️ ${botName} Maintenance`,
    color: 0xfee75c,
    description: [
      "We’re currently working on improvements 🛠",
      "",
      `⏳ Downtime: ${downtime}`,
      "",
      "Don’t worry, we’ll be back soon with upgrades 🚀",
      "",
      "Thanks for your patience ❤️"
    ].join("\n"),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  RELEASE_TEMPLATES,
  getLatestVersionKey,
  buildUpdateEmbed,
  buildMaintenanceEmbed
};
