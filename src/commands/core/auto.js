const { PermissionsBitField } = require("discord.js");
const config = require("../../../config");
const Guild = require("../../database/models/Guild");

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getAutoResponses(doc) {
  const list = Array.isArray(doc?.autoResponses) ? doc.autoResponses : [];
  if (list.length) return list.filter(item => item && item.trigger && item.reply);
  if (doc?.autoResponseEnabled && doc?.autoResponseTrigger && doc?.autoResponseText) {
    return [{ trigger: doc.autoResponseTrigger, reply: doc.autoResponseText }];
  }
  return [];
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

function hasGlobalOwnerAccess(context) {
  const userId = String(context?.userId || "");
  return getOwnerIds().has(userId);
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
  if (sub === "clear") {
    const trigger = String(args.join(" ") || "").trim().slice(0, 100);
    return { trigger, reply: "" };
  }
  const joined = String(args.join(" ") || "").trim();
  const colonIndex = joined.indexOf(":");
  if (colonIndex >= 0) {
    const trigger = joined.slice(0, colonIndex).trim().slice(0, 100);
    const reply = joined.slice(colonIndex + 1).trim().slice(0, 1000);
    return { trigger, reply };
  }
  const trigger = String(args.shift() || "").trim().slice(0, 100);
  const reply = String(args.join(" ") || "").trim().slice(0, 1000);
  return { trigger, reply };
}

async function showState(context, doc) {
  const responses = getAutoResponses(doc);
  if (!responses.length) {
    return context.reply("Auto response is not configured.");
  }
  return context.reply([
    "Auto responses:",
    ...responses.map((item, index) => `${index + 1}. \`${item.trigger}\` -> \`${item.reply}\``)
  ].join("\n"));
}

async function saveResponse(context, trigger, reply) {
  const doc = await Guild.findOne({ guildId: context.guildId }).lean();
  const responses = getAutoResponses(doc);
  const normalized = normalize(trigger);
  const next = responses.filter(item => normalize(item.trigger) !== normalized);
  next.push({ guildId: String(context.guildId), trigger, reply });
  await Guild.updateOne(
    { guildId: context.guildId },
    {
      $set: {
        autoResponses: next,
        autoResponseEnabled: next.length > 0,
        autoResponseTrigger: next[0]?.trigger || null,
        autoResponseText: next[0]?.reply || null
      }
    },
    { upsert: true }
  );
}

async function clearResponses(context, trigger) {
  const doc = await Guild.findOne({ guildId: context.guildId }).lean();
  const responses = getAutoResponses(doc);
  if (!trigger) {
    await Guild.updateOne(
      { guildId: context.guildId },
      {
        $set: {
          autoResponses: [],
          autoResponseEnabled: false,
          autoResponseTrigger: null,
          autoResponseText: null
        }
      },
      { upsert: true }
    );
    return { cleared: "all", count: responses.length };
  }

  const normalized = normalize(trigger);
  const next = responses.filter(item => normalize(item.trigger) !== normalized);
  await Guild.updateOne(
    { guildId: context.guildId },
    {
      $set: {
        autoResponses: next,
        autoResponseEnabled: next.length > 0,
        autoResponseTrigger: next[0]?.trigger || null,
        autoResponseText: next[0]?.reply || null
      }
    },
    { upsert: true }
  );
  return { cleared: "selected", count: responses.length - next.length };
}

function stampGuildIdOnResponses(doc, fallbackGuildId) {
  const responses = Array.isArray(doc?.autoResponses) ? doc.autoResponses : [];
  if (!responses.length) return { next: responses, changed: 0 };
  const guildId = String(doc?.guildId || fallbackGuildId || "");
  let changed = 0;
  const next = responses.map((item) => {
    if (!item || !item.trigger || !item.reply) return item;
    const current = item?.guildId ? String(item.guildId) : "";
    if (current) return item;
    changed += 1;
    return { ...item, guildId };
  });
  return { next, changed };
}

async function migrateCurrentGuildResponses(context) {
  const doc = await Guild.findOne({ guildId: context.guildId }).lean();
  if (!doc) return { docsUpdated: 0, responsesStamped: 0 };
  const { next, changed } = stampGuildIdOnResponses(doc, context.guildId);
  if (!changed) return { docsUpdated: 0, responsesStamped: 0 };
  await Guild.updateOne(
    { guildId: context.guildId },
    { $set: { autoResponses: next } },
    { upsert: false }
  );
  return { docsUpdated: 1, responsesStamped: changed };
}

async function migrateAllGuildResponses() {
  const docs = await Guild.find({ "autoResponses.0": { $exists: true } }).lean();
  let docsUpdated = 0;
  let responsesStamped = 0;
  for (const doc of docs) {
    const { next, changed } = stampGuildIdOnResponses(doc, doc?.guildId);
    if (!changed) continue;
    await Guild.updateOne(
      { guildId: doc.guildId },
      { $set: { autoResponses: next } },
      { upsert: false }
    );
    docsUpdated += 1;
    responsesStamped += changed;
  }
  return { docsUpdated, responsesStamped };
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
    const trigger = String(context?.interaction?.isChatInputCommand?.()
      ? context.options?.trigger || ""
      : context?.args?.slice(1).join(" ") || "").trim();
    const result = await clearResponses(context, trigger);
    if (result.cleared === "all") return context.reply("Auto responses cleared.");
    return context.reply(result.count > 0 ? "Selected auto response cleared." : "No matching auto response found.");
  }

  if (sub === "migrate") {
    const scope = String(context?.interaction?.isChatInputCommand?.()
      ? context.options?.scope || "current"
      : context?.args?.[1] || "current").trim().toLowerCase();
    if (scope === "all") {
      if (!hasGlobalOwnerAccess(context)) {
        return context.reply("Only bot owners can run `!auto migrate all`.");
      }
      const result = await migrateAllGuildResponses();
      return context.reply(`Migration complete (all servers). Updated docs: ${result.docsUpdated}, stamped responses: ${result.responsesStamped}.`);
    }
    const result = await migrateCurrentGuildResponses(context);
    return context.reply(`Migration complete (this server). Updated docs: ${result.docsUpdated}, stamped responses: ${result.responsesStamped}.`);
  }

  if (sub === "response" || sub === "set" || sub === "add") {
    const { trigger, reply } = getResponseParts(context, sub);
    if (!trigger) return context.reply("Provide a trigger.");
    if (!reply) return context.reply("Provide a response.");
    await saveResponse(context, trigger, reply);

    return context.reply([
      "Auto response saved.",
      `Trigger: \`${trigger}\``,
      `Response: \`${reply}\``
    ].join("\n"));
  }

  if (sub && !["show", "clear", "remove", "off", "disable", "response", "set", "add", "migrate"].includes(sub)) {
    const { trigger, reply } = getResponseParts(context, "");
    if (!trigger || !reply) {
      return context.reply("Use `!auto hello:hi there`, `@Bot auto hello:hi there`, or `/auto response`.");
    }
    await saveResponse(context, trigger, reply);

    return context.reply([
      "Auto response saved.",
      `Trigger: \`${trigger}\``,
      `Response: \`${reply}\``
    ].join("\n"));
  }

  return context.reply("Unknown auto subcommand.");
}

module.exports = { run };
