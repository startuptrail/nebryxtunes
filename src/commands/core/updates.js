const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
  RELEASE_TEMPLATES,
  getLatestVersionKey,
  buildUpdateEmbed,
  buildMaintenanceEmbed
} = require("../../lib/updateTemplates");

function normalizeView(raw) {
  const text = String(raw || "latest").trim().toLowerCase();
  if (!text) return "latest";
  if (text === "latest") return "latest";
  if (text === "maintenance" || text === "maintance" || text === "maint") return "maintenance";
  if (/^v\d+$/.test(text)) return text;
  if (/^\d+$/.test(text)) return `v${text}`;
  return "latest";
}

function resolveView(view) {
  const latest = getLatestVersionKey();
  const normalized = normalizeView(view);
  if (normalized === "maintenance") return "maintenance";
  if (normalized === "latest") return latest;
  if (RELEASE_TEMPLATES[normalized]) return normalized;
  return latest;
}

function buildButtons(activeKey, latestKey) {
  const latestLabel = `Latest (${RELEASE_TEMPLATES[latestKey]?.version || latestKey})`;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("updates_view:latest")
      .setLabel(latestLabel)
      .setStyle(activeKey === latestKey ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(activeKey === latestKey),
    new ButtonBuilder()
      .setCustomId("updates_view:v3")
      .setLabel("v3")
      .setStyle(activeKey === "v3" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(activeKey === "v3"),
    new ButtonBuilder()
      .setCustomId("updates_view:v2")
      .setLabel("v2")
      .setStyle(activeKey === "v2" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(activeKey === "v2"),
    new ButtonBuilder()
      .setCustomId("updates_view:v1")
      .setLabel("v1")
      .setStyle(activeKey === "v1" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(activeKey === "v1"),
    new ButtonBuilder()
      .setCustomId("updates_view:maintenance")
      .setLabel("Maintenance")
      .setStyle(activeKey === "maintenance" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(activeKey === "maintenance")
  );
}

function buildEmbed(versionKey, latestKey) {
  if (versionKey === "maintenance") {
    const embed = buildMaintenanceEmbed("[time]");
    embed.footer = { text: "Owner can post live maintenance notice using /maintance." };
    return embed;
  }
  return buildUpdateEmbed(versionKey, versionKey === latestKey);
}

function buildPayload(view) {
  const latestKey = getLatestVersionKey();
  const selected = resolveView(view);
  return {
    embeds: [buildEmbed(selected, latestKey)],
    components: [buildButtons(selected, latestKey)]
  };
}

async function run(client, context) {
  const requested = context?.interaction?.isChatInputCommand?.()
    ? context.options?.version || "latest"
    : context?.args?.[0] || "latest";
  return context.reply(buildPayload(requested));
}

module.exports = { run, buildPayload };
