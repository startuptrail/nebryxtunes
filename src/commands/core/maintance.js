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

function getKnownCommandNames(client) {
  const names = new Set(["maintance", "maintenance"]);
  const addEntries = (collection) => {
    if (!collection || typeof collection.keys !== "function") return;
    for (const key of collection.keys()) {
      if (key) names.add(String(key).trim().toLowerCase());
    }
  };

  addEntries(client?.commands);
  addEntries(client?.slashCommands);

  return Array.from(names).sort();
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
    const affected = Array.isArray(state.affectedCommands) && state.affectedCommands.length
      ? state.affectedCommands.map((cmd) => `\`${cmd}\``).join(", ")
      : "None";
    const allowed = Array.isArray(state.notAffectedCommands) && state.notAffectedCommands.length
      ? state.notAffectedCommands.map((cmd) => `\`${cmd}\``).join(", ")
      : "None";
    return context.reply([
      "⚠️ Maintenance mode is ON.",
      `⏳ Downtime: ${state.downtime || "Unknown"}`,
      `⛔ Affected commands: ${affected}`,
      `✅ Not affected commands: ${allowed}`
    ].join("\n"));
  }

  if (sub === "start" || sub === "on" || sub === "enable") {
    const rawArgs = Array.isArray(context?.args) ? context.args.slice(1) : [];
    const allowArg = rawArgs.find((item) => String(item).startsWith("--allow="));
    const affectedArg = rawArgs.find((item) => String(item).startsWith("--affected="));
    const downtimeParts = rawArgs.filter((item) =>
      !String(item).startsWith("--allow=") && !String(item).startsWith("--affected=")
    );
    const downtimeRaw = isSlash
      ? String(context?.options?.downtime || "").trim()
      : String(downtimeParts.join(" ") || "").trim();
    const affectedRaw = isSlash
      ? String(context?.options?.affected_cmds || "").trim()
      : String(affectedArg || "").replace(/^--affected=/, "").trim();
    const notAffectedRaw = isSlash
      ? String(context?.options?.not_affected_cmds || "").trim()
      : String(allowArg || "").replace(/^--allow=/, "").trim();

    if (affectedRaw && notAffectedRaw) {
      return context.reply("Choose either `affected_cmds` or `not_affected_cmds`, not both.");
    }

    const normalizedTime = String(downtimeRaw || "").toLowerCase();
    const downtime = !downtimeRaw || normalizedTime === "forever" || normalizedTime === "unknown"
      ? "Unknown (until /maintance end)"
      : downtimeRaw;
    const allCommands = getKnownCommandNames(client).filter((name) => name !== "maintance" && name !== "maintenance");
    const affectedInput = Array.from(new Set(normalizeCommandList(affectedRaw))).filter((name) => allCommands.includes(name));
    const notAffectedInput = Array.from(new Set(normalizeCommandList(notAffectedRaw))).filter((name) => allCommands.includes(name));
    const affected = affectedInput.length
      ? affectedInput
      : allCommands.filter((name) => !notAffectedInput.includes(name));
    const notAffected = notAffectedInput.length
      ? notAffectedInput
      : allCommands.filter((name) => !affectedInput.includes(name));

    const next = {
      enabled: true,
      downtime,
      affectedCommands: affected,
      notAffectedCommands: notAffected,
      startedBy: String(context.userId || ""),
      startedAt: new Date(),
      endedBy: null,
      endedAt: null
    };
    await setMaintenanceState(next);
    return context.reply({
      embeds: [buildMaintenanceEmbed(downtime)],
      content: [
        "✅ Maintenance mode started globally.",
        affected.length
          ? `Affected commands: ${affected.map((cmd) => `\`${cmd}\``).join(", ")}`
          : "Affected commands: None",
        notAffected.length
          ? `Not affected commands: ${notAffected.map((cmd) => `\`${cmd}\``).join(", ")}`
          : "Not affected commands: None"
      ].join("\n")
    });
  }

  return context.reply("Use: `/maintance start`, `/maintance end`, `/maintance status`.");
}

module.exports = { run };
