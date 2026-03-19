const SecurityEvent = require("../database/models/SecurityEvent");

const NSFW_TERMS = [
  "nsfw",
  "nude",
  "naked",
  "sex",
  "porn",
  "hentai",
  "xxx",
  "boobs",
  "penis",
  "vagina",
  "explicit",
  "fetish"
];

const BYPASS_TERMS = [
  "bypass",
  "ignore safety",
  "ignore policy",
  "uncensored",
  "jailbreak",
  "no filter",
  "remove restrictions",
  "without restrictions",
  "do not block"
];

function countMatches(text, terms) {
  const source = String(text || "").toLowerCase();
  let count = 0;
  const hits = [];
  for (const term of terms) {
    if (!term) continue;
    if (source.includes(term)) {
      count += 1;
      hits.push(term);
    }
  }
  return { count, hits };
}

function analyzeSecurityRisk(content) {
  const text = String(content || "").trim();
  if (!text) {
    return { flagged: false, severity: 0, reasons: [] };
  }
  const nsfw = countMatches(text, NSFW_TERMS);
  const bypass = countMatches(text, BYPASS_TERMS);
  const flagged = nsfw.count > 0 || bypass.count > 0;
  const reasons = [];
  if (nsfw.count > 0) reasons.push(`nsfw_terms:${nsfw.hits.join(",")}`);
  if (bypass.count > 0) reasons.push(`bypass_terms:${bypass.hits.join(",")}`);
  const severity = Math.min(10, nsfw.count * 2 + bypass.count * 3);
  return { flagged, severity, reasons };
}

async function logSecurityEvent(payload) {
  try {
    await SecurityEvent.create({
      guildId: String(payload.guildId || ""),
      userId: payload.userId ? String(payload.userId) : null,
      channelId: payload.channelId ? String(payload.channelId) : null,
      messageId: payload.messageId ? String(payload.messageId) : null,
      eventType: String(payload.eventType || "unknown"),
      severity: Number(payload.severity || 1),
      blocked: payload.blocked === true,
      reasons: Array.isArray(payload.reasons) ? payload.reasons.slice(0, 20) : [],
      content: String(payload.content || "").slice(0, 1200),
      meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {}
    });
  } catch (_) {}
}

async function monitorIncomingMessage(message, guildSettings) {
  const text = String(message?.content || "").trim();
  if (!message?.guild || !text || message.author?.bot) return;
  const monitorEnabled = guildSettings?.dashboard?.nsfwMonitorEnabled !== false;
  if (!monitorEnabled) return;

  const risk = analyzeSecurityRisk(text);
  if (!risk.flagged) return;

  const blockMode = guildSettings?.dashboard?.nsfwBlockMode === true;
  let blocked = false;
  if (blockMode && message.deletable) {
    try {
      await message.delete();
      blocked = true;
    } catch (_) {}
  }

  await logSecurityEvent({
    guildId: message.guild.id,
    userId: message.author?.id,
    channelId: message.channel?.id,
    messageId: message.id,
    eventType: "user_prompt_risk",
    severity: risk.severity,
    blocked,
    reasons: risk.reasons,
    content: text,
    meta: {
      username: message.author?.tag || message.author?.username || "unknown",
      channelName: message.channel?.name || "unknown"
    }
  });

  if (blocked && message.channel?.send) {
    await message.channel.send({
      content: `<@${message.author.id}> message blocked by server AI safety policy.`,
      allowedMentions: { users: [message.author.id] }
    }).catch(() => {});
  }
}

module.exports = {
  analyzeSecurityRisk,
  logSecurityEvent,
  monitorIncomingMessage
};
