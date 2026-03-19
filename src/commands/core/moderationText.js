const { handleModeration } = require("./ai");

function extractMentionedUserId(context) {
  return context?.message?.mentions?.users?.first?.()?.id || "";
}

function parseModerationArgs(action, context) {
  const raw = String((context.args || []).join(" ") || "").trim();
  const mentionedUserId = extractMentionedUserId(context);
  const explicitId = raw.match(/\b\d{16,20}\b/)?.[0] || "";
  const userId = mentionedUserId || explicitId;
  const withoutTarget = raw
    .replace(/<@!?\d+>/g, "")
    .replace(/\b\d{16,20}\b/, "")
    .trim();

  if (action === "PURGE") {
    const count = Math.max(1, Math.min(100, Number(withoutTarget.match(/\d{1,3}/)?.[0] || 10)));
    return { count };
  }

  if (action === "NUKE") {
    return { reason: withoutTarget };
  }

  return { userId, reason: withoutTarget };
}

async function run(client, context, action) {
  return handleModeration(action, parseModerationArgs(action, context), context);
}

module.exports = { run };
