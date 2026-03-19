const { AttachmentBuilder } = require("discord.js");
const { generateImageXai } = require("../../services/xaiMediaService");
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

  try {
    await context.reply("🖼️ Generating image, please wait...");
    const media = await generateImageXai({ prompt });
    const filename = `ai-image-${Date.now()}.${media.extension || "png"}`;
    const file = new AttachmentBuilder(media.buffer, { name: filename });
    return context.reply({ content: `✅ **Generated Image**\n📝 Prompt: ${prompt}\n🤖 Provider: HuggingFace | Model: \`${media.model}\``, files: [file] });
  } catch (error) {
    const msg = String(error?.message || "Image generation failed.").slice(0, 1500);
    return context.reply(`❌ Image generation failed.\n**Reason:** ${msg}\n**Tip:** Get a free HuggingFace API key at https://huggingface.co/settings/tokens and set \`HF_API_KEY\` in config.js`);
  }
}

module.exports = { run };
