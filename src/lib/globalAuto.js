const SystemSettings = require("../database/models/SystemSettings");

const CACHE_TTL_MS = 10000;
const cache = {
  expiresAt: 0,
  responses: []
};

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function sanitizeResponses(list) {
  const raw = Array.isArray(list) ? list : [];
  return raw
    .filter((item) => item && item.trigger && item.reply)
    .map((item) => ({
      trigger: String(item.trigger).trim().slice(0, 100),
      reply: String(item.reply).trim().slice(0, 1000)
    }))
    .filter((item) => item.trigger && item.reply);
}

async function getGlobalAutoResponses(force = false) {
  const now = Date.now();
  if (!force && cache.expiresAt > now) return cache.responses;
  const doc = await SystemSettings.findOne({ key: "global" }).lean().catch(() => null);
  const responses = sanitizeResponses(doc?.globalAutoResponses);
  cache.responses = responses;
  cache.expiresAt = now + CACHE_TTL_MS;
  return responses;
}

async function setGlobalAutoResponses(responses) {
  const next = sanitizeResponses(responses);
  await SystemSettings.updateOne(
    { key: "global" },
    { $set: { key: "global", globalAutoResponses: next } },
    { upsert: true }
  );
  cache.responses = next;
  cache.expiresAt = Date.now() + CACHE_TTL_MS;
  return next;
}

function upsertGlobalAutoResponse(responses, trigger, reply) {
  const normalized = normalize(trigger);
  const next = sanitizeResponses(responses).filter((item) => normalize(item.trigger) !== normalized);
  next.push({ trigger, reply });
  return next;
}

function removeGlobalAutoResponse(responses, trigger) {
  const normalized = normalize(trigger);
  return sanitizeResponses(responses).filter((item) => normalize(item.trigger) !== normalized);
}

module.exports = {
  normalize,
  getGlobalAutoResponses,
  setGlobalAutoResponses,
  upsertGlobalAutoResponse,
  removeGlobalAutoResponse
};
