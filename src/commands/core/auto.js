const { PermissionsBitField } = require("discord.js");
const config = require("../../../config");
const Guild = require("../../database/models/Guild");

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getOwnerIds() {
  return new Set(
    [
      config?.branding?.ownerId,
      config?.dashboard?.ownerId,
      ...(config?.dashboard?.ownerIds || [])
    ].filter(Boolean).map(String)
  );
}

function hasAutoAccess(context) {
  const userId = String(context?.userId || "");
  const isOwner = getOwnerIds().has(userId) || String(context?.guild?.ownerId || "") === userId;
  const isAdmin = !!context?.member?.permissions?.has?.(PermissionsBitField.Flags.Administrator);
  return isOwner || isAdmin;
}

function getSubcommand(context) {
  const raw =
    context?.interaction?.options?.getSubcommand?.(false) ||
    context?.options?._subcommand ||
    context?.args?.[0] ||
    "";
  return String(raw || "").trim().toLowerCase();
}

function getResponseParts(context, sub) {
  if (context?.interaction?.isChatInputCommand?.()) {
    const trigger = String(context?.options?.trigger || "").trim().slice(0, 100);
    const reply = String(context?.options?.reply || "").trim().slice(0, 1000);
    return { trigger, reply };
  }

  const args = Array.isArray(context?.args) ? context.args.slice() : [];
  if (sub) args.shift();
  const trigger = String(args.shift() || "").trim().slice(0, 100);
  const reply = String(args.join(" ") || "").trim().slice(0, 1000);
  return { trigger, reply };
}

async function showState(context, doc) {
  if (!doc?.autoResponseEnabled || !doc?.autoResponseTrigger || !doc?.autoResponseText) {
    return context.reply("Auto response is not configured.");
  }
  return context.reply([
    "Auto response is enabled.",
    `Trigger: \`${doc.autoResponseTrigger}\``,
    `Response: \`${doc.autoResponseText}\``
  ].join("\n"));
}

async function run(client, context) {
  if (!context?.guildId) return context.reply("Use this in a server.");
  if (!hasAutoAccess(context)) return context.reply("Only the server owner or an administrator can use this command.");

  const sub = getSubcommand(context);
  const doc = await Guild.findOne({ guildId: context.guildId }).lean();

  if (!sub || sub === "show") {
    return showState(context, doc);
  }

  if (sub === "clear" || sub === "remove" || sub === "off" || sub === "disable") {
    await Guild.updateOne(
      { guildId: context.guildId },
      {
        $set: {
          autoResponseEnabled: false,
          autoResponseTrigger: null,
          autoResponseText: null
        }
      },
      { upsert: true }
    );
    return context.reply("Auto response cleared.");
  }

  if (sub === "response" || sub === "set" || sub === "add") {
    const { trigger, reply } = getResponseParts(context, sub);
    if (!trigger) return context.reply("Provide a trigger.");
    if (!reply) return context.reply("Provide a response.");

    await Guild.updateOne(
      { guildId: context.guildId },
      {
        $set: {
          autoResponseEnabled: true,
          autoResponseTrigger: trigger,
          autoResponseText: reply
        }
      },
      { upsert: true }
    );

    return context.reply([
      "Auto response saved.",
      `Trigger: \`${trigger}\``,
      `Response: \`${reply}\``
    ].join("\n"));
  }

  return context.reply("Unknown auto subcommand.");
}

module.exports = { run };
