const config = require("../../../config");
const {
  normalize,
  getGlobalAutoResponses,
  setGlobalAutoResponses,
  upsertGlobalAutoResponse,
  removeGlobalAutoResponse
} = require("../../lib/globalAuto");

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

async function showState(context) {
  const responses = await getGlobalAutoResponses();
  if (!responses.length) return context.reply("Global auto response is not configured.");
  return context.reply([
    "Global auto responses (all servers, all channels):",
    ...responses.map((item, index) => `${index + 1}. \`${item.trigger}\` -> \`${item.reply}\``)
  ].join("\n"));
}

async function saveResponse(context, trigger, reply) {
  const responses = await getGlobalAutoResponses();
  const next = upsertGlobalAutoResponse(responses, trigger, reply);
  await setGlobalAutoResponses(next);
}

async function clearResponses(context, trigger) {
  const responses = await getGlobalAutoResponses();
  if (!trigger) {
    await setGlobalAutoResponses([]);
    return { cleared: "all", count: responses.length };
  }
  const next = removeGlobalAutoResponse(responses, trigger);
  await setGlobalAutoResponses(next);
  return { cleared: "selected", count: responses.length - next.length };
}

async function run(client, context) {
  if (!isBotOwner(context)) return context.reply("Only bot owners can use this command.");

  const sub = getSubcommand(context);

  if (!sub || sub === "show") return showState(context);

  if (sub === "clear" || sub === "remove" || sub === "off" || sub === "disable") {
    const trigger = String(context?.interaction?.isChatInputCommand?.()
      ? context.options?.trigger || ""
      : context?.args?.slice(1).join(" ") || "").trim();
    const result = await clearResponses(context, trigger);
    if (result.cleared === "all") return context.reply("Global auto responses cleared.");
    return context.reply(result.count > 0 ? "Selected global auto response cleared." : "No matching global auto response found.");
  }

  if (sub === "response" || sub === "set" || sub === "add") {
    const { trigger, reply } = getResponseParts(context, sub);
    if (!trigger) return context.reply("Provide a trigger.");
    if (!reply) return context.reply("Provide a response.");
    await saveResponse(context, trigger, reply);
    return context.reply([
      "Global auto response saved (all servers, all channels).",
      `Trigger: \`${trigger}\``,
      `Response: \`${reply}\``
    ].join("\n"));
  }

  if (sub && !["show", "clear", "remove", "off", "disable", "response", "set", "add"].includes(sub)) {
    const { trigger, reply } = getResponseParts(context, "");
    if (!trigger || !reply) {
      return context.reply("Use `!autoglobal hello:hi there`, `@Bot autoglobal hello:hi there`, or `/autoglobal response`.");
    }
    await saveResponse(context, trigger, reply);
    return context.reply([
      "Global auto response saved (all servers, all channels).",
      `Trigger: \`${trigger}\``,
      `Response: \`${reply}\``
    ].join("\n"));
  }

  return context.reply("Unknown autoglobal subcommand.");
}

module.exports = { run };
