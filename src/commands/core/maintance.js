const config = require("../../../config");
const { buildMaintenanceEmbed } = require("../../lib/updateTemplates");

function getOwnerIds() {
  return new Set(
    [
      config?.branding?.ownerId,
      config?.dashboard?.ownerId,
      ...(config?.dashboard?.ownerIds || [])
    ].filter(Boolean).map(String)
  );
}

function isBotOwner(context) {
  const userId = String(context?.userId || "");
  return getOwnerIds().has(userId);
}

async function run(client, context) {
  if (!context?.guildId) return context.reply("Use this in a server.");
  if (!isBotOwner(context)) return context.reply("Only bot owners can use `/maintance`.");

  const downtime = context?.interaction?.isChatInputCommand?.()
    ? String(context?.options?.downtime || "").trim()
    : String(context?.args?.join(" ") || "").trim();

  if (!downtime) return context.reply("Provide downtime time. Example: `2 hours` or `10:00 PM - 11:30 PM IST`.");
  return context.reply({ embeds: [buildMaintenanceEmbed(downtime)] });
}

module.exports = { run };
