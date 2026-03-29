const config = require("../../../config");
const { buildMaintenanceEmbed } = require("../../lib/updateTemplates");
const {
  normalizeCommandList,
  getMaintenanceState,
  setMaintenanceState
} = require("../../lib/maintenance");

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

  const isSlash = context?.interaction?.isChatInputCommand?.();
  const sub = String(
    isSlash
      ? context?.interaction?.options?.getSubcommand?.(false) || context?.options?._subcommand || "status"
      : context?.args?.[0] || "status"
  ).trim().toLowerCase();

  if (sub === "end" || sub === "stop" || sub === "off" || sub === "disable") {
    const current = await getMaintenanceState();
    const next = {
      ...current,
      enabled: false,
      endedBy: String(context.userId || ""),
      endedAt: new Date()
    };
    await setMaintenanceState(next);
    return context.reply("✅ Maintenance mode ended globally. All commands are now active.");
  }

  if (sub === "status" || sub === "show") {
    const state = await getMaintenanceState();
    if (!state.enabled) return context.reply("Maintenance mode is currently OFF.");
    const allowed = Array.isArray(state.notAffectedCommands) && state.notAffectedCommands.length
      ? state.notAffectedCommands.map((cmd) => `\`${cmd}\``).join(", ")
      : "None";
    return context.reply([
      "⚠️ Maintenance mode is ON.",
      `⏳ Downtime: ${state.downtime || "Unknown"}`,
      `✅ Not affected commands: ${allowed}`
    ].join("\n"));
  }

  if (sub === "start" || sub === "on" || sub === "enable") {
    const rawArgs = Array.isArray(context?.args) ? context.args.slice(1) : [];
    const allowArg = rawArgs.find((item) => String(item).startsWith("--allow="));
    const downtimeParts = rawArgs.filter((item) => !String(item).startsWith("--allow="));
    const downtimeRaw = isSlash
      ? String(context?.options?.downtime || "").trim()
      : String(downtimeParts.join(" ") || "").trim();
    const notAffectedRaw = isSlash
      ? String(context?.options?.not_affected_cmds || "").trim()
      : String(allowArg || "").replace(/^--allow=/, "").trim();

    const normalizedTime = String(downtimeRaw || "").toLowerCase();
    const downtime = !downtimeRaw || normalizedTime === "forever" || normalizedTime === "unknown"
      ? "Unknown (until /maintance end)"
      : downtimeRaw;
    const notAffected = normalizeCommandList(notAffectedRaw);

    const next = {
      enabled: true,
      downtime,
      notAffectedCommands: Array.from(new Set(notAffected)),
      startedBy: String(context.userId || ""),
      startedAt: new Date(),
      endedBy: null,
      endedAt: null
    };
    await setMaintenanceState(next);
    return context.reply({
      embeds: [buildMaintenanceEmbed(downtime)],
      content: notAffected.length
        ? `✅ Maintenance mode started globally.\nNot affected commands: ${notAffected.map((cmd) => `\`${cmd}\``).join(", ")}`
        : "✅ Maintenance mode started globally.\nNot affected commands: None"
    });
  }

  return context.reply("Use: `/maintance start`, `/maintance end`, `/maintance status`.");
}

module.exports = { run };
