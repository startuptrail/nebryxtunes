const defaultOwnerId = process.env.BOT_OWNER_ID || "1234512256344002650";
const defaultOwnerIds = "1234512256344002650,1060921330159059034";

module.exports = {
  branding: {
    botName: process.env.BOT_NAME || "NebryxTunes",
    ownerName: process.env.BOT_OWNER_NAME || "StartupGaming",
    ownerId: defaultOwnerId
  },
  token: process.env.DISCORD_TOKEN || "",
  prefix: process.env.BOT_PREFIX || "!",
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  ai: {
    provider: "groq",
    apiKey: String(process.env.RENDER || "").toLowerCase() === "true"
      ? (process.env.GROQ_API_KEY || "")
      : "",
    model: process.env.GROQ_MODEL || "qwen/qwen3-32b"
  },
  websiteUrl: process.env.WEBSITE_URL || "https://nebryxtunes.ibot.qzz.io",
  supportUrl: process.env.SUPPORT_URL || "https://dsc.gg/sparecloud",
  contactEmail: process.env.CONTACT_EMAIL || "contact.startupgaming@gmail.com",
  dashboard: {
    ownerId: process.env.DASHBOARD_OWNER_ID || defaultOwnerId,
    ownerIds: (process.env.DASHBOARD_OWNER_IDS || defaultOwnerIds).split(",").map(x => x.trim()).filter(Boolean),
    oauth: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      redirectUri: process.env.DISCORD_REDIRECT_URI || "http://localhost:8888/auth/callback"
    }
  },
  lavalink: {
    host: process.env.LAVALINK_HOST || "lavalink.jirayu.net",
    port: Number(process.env.LAVALINK_PORT || 13592),
    password: process.env.LAVALINK_PASSWORD || "youshallnotpass",
    secure: false
  }
};
