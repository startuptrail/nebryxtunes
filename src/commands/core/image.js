const Guild = require("../../database/models/Guild");
const { analyzeSecurityRisk, logSecurityEvent } = require("../../lib/securityMonitor");

async function run(client, context) {
  const prompt = String(context.args?.join(" ") || context.options?.prompt || "").trim();
  if (!prompt) return context.reply("Provide an image prompt.");
  if (prompt.length > 1000) return context.reply("Prompt too long. Keep under 1000 characters.");
  const settings = context.guildId ? await Guild.findOne({ guildId: context.guildId }).lean() : null;
  const risk = analyzeSecurityRisk(prompt);
  if (risk.flagged) {
    const block = settings?.dashboard?.nsfwBlockMode === true;
    await logSecurityEvent({
      guildId: context.guildId,
      userId: context.userId,
      channelId: context.channelId,
      eventType: "image_prompt_risk",
      severity: risk.severity,
      blocked: block,
      reasons: risk.reasons,
      content: prompt
    });
    if (block) return context.reply("Blocked by AI safety policy for this server.");
  }

  return context.reply("Image generation is disabled in this Groq text-only build.");
}

module.exports = { run };
