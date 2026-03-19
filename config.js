module.exports = {
  token: process.env.DISCORD_TOKEN || "",
  prefix: process.env.BOT_PREFIX || "!",
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  ai: {
    provider: "gemini",
    apiKey: process.env.GEMINI_API_KEY || "",
    model: "gemini-2.0-flash",
    hfApiKey: process.env.HF_API_KEY || "your-huggingface-api-key-here",
    hfImageModel: "black-forest-labs/FLUX.1-schnell",
    hfVideoModel: "genmo/mochi-1-preview"
  },
  supportUrl: process.env.SUPPORT_URL || "https://discord.sparecloud.in",
  dashboard: {
    ownerId: process.env.DASHBOARD_OWNER_ID || "1234512256344002650",
    ownerIds: (process.env.DASHBOARD_OWNER_IDS || "").split(",").map(x => x.trim()).filter(Boolean),
    oauth: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      redirectUri: process.env.DISCORD_REDIRECT_URI || "http://localhost:8888/auth/callback"
    }
  },
  lavalink: {
    host: process.env.LAVALINK_HOST || "sg2-nodelink.nyxbot.app",
    port: Number(process.env.LAVALINK_PORT || 3000),
    password: process.env.LAVALINK_PASSWORD || "nyxbot.app/support",
    secure: false
  }
};
