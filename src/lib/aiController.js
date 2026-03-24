const config = require("../../config");
const { runGroqChat } = require("../services/openaiClient");

const ALLOWED_ACTIONS = new Set([
  "ban",
  "unban",
  "kick",
  "timeout",
  "untimeout",
  "mute",
  "unmute",
  "warn",
  "purge",
  "slowmode",
  "lock",
  "unlock",
  "role_add",
  "role_remove",
  "nickname",
  "none"
]);

function getAiConfig() {
  const cfg = config?.ai || {};
  return {
    provider: "groq",
    apiKey: process.env.GROQ_API_KEY || cfg.apiKey || "",
    model: process.env.GROQ_MODEL || cfg.model || "openai/gpt-oss-20b"
  };
}

function cleanJson(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.startsWith("```")) {
    return value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return value;
}

function buildPrompt(input, context) {
  const channelName = context?.channel?.name || "unknown";
  const guildName = context?.guild?.name || "unknown";
  return [
    "You are a strict JSON-only moderation router for a Discord server.",
    "Return ONLY valid JSON. No markdown, no explanations.",
    "JSON schema:",
    "{",
    '  "action": "ban | unban | kick | timeout | untimeout | mute | unmute | warn | purge | slowmode | lock | unlock | role_add | role_remove | nickname | none",',
    '  "targetId": "string | null",',
    '  "duration": "string | null",',
    '  "reason": "string | null",',
    '  "slowmodeSeconds": "number | null",',
    '  "roleId": "string | null",',
    '  "nickname": "string | null"',
    "}",
    "Rules:",
    "- Always return an action from the list above.",
    "- If the request is not a moderation action, set action to none.",
    "- Use targetId for user actions. Use roleId for role_add/role_remove.",
    "- Use duration for timeout/mute/ban if specified (e.g. 10m, 2h, 1d).",
    "- For purge, put the message count in duration (e.g. 25).",
    "- Use slowmodeSeconds only for slowmode.",
    `Context: guild=${guildName}, channel=${channelName}`,
    `User input: ${input}`
  ].join("\n");
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const actionRaw = String(payload.action || "").trim().toLowerCase();
  if (!ALLOWED_ACTIONS.has(actionRaw)) return null;
  const targetId = payload.targetId != null ? String(payload.targetId).trim() : null;
  const duration = payload.duration != null ? String(payload.duration).trim() : null;
  const reason = payload.reason != null ? String(payload.reason).trim() : null;
  const slowmodeSeconds = payload.slowmodeSeconds != null ? Number(payload.slowmodeSeconds) : null;
  const roleId = payload.roleId != null ? String(payload.roleId).trim() : null;
  const nickname = payload.nickname != null ? String(payload.nickname).trim() : null;
  return {
    action: actionRaw,
    targetId: targetId || null,
    duration: duration || null,
    reason: reason || null,
    slowmodeSeconds: Number.isFinite(slowmodeSeconds) ? slowmodeSeconds : null,
    roleId: roleId || null,
    nickname: nickname || null
  };
}

async function requestModerationPayload(input, context) {
  const { apiKey, model } = getAiConfig();
  if (!apiKey) return { ok: false, error: "🤖 [AI] API key missing. Set GROQ_API_KEY." };
  const prompt = buildPrompt(input, context);
  try {
    const raw = await runGroqChat({
      apiKey,
      model,
      messages: [{ role: "user", content: prompt }]
    });
    const cleaned = cleanJson(raw);
    const parsed = JSON.parse(String(cleaned || "").trim());
    const normalized = normalizePayload(parsed);
    if (!normalized) return { ok: false, error: "Invalid AI payload." };
    return { ok: true, payload: normalized, raw };
  } catch (error) {
    return { ok: false, error: error?.message || "AI request failed." };
  }
}

module.exports = { requestModerationPayload, ALLOWED_ACTIONS };
