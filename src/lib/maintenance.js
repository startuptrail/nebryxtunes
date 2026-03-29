const SystemSettings = require("../database/models/SystemSettings");
const { getBotName } = require("./branding");

const CACHE_TTL_MS = 10000;
const cache = {
  expiresAt: 0,
  state: null
};

function normalizeCommandName(name) {
  return String(name || "").trim().toLowerCase();
}

function normalizeCommandList(input) {
  if (!input) return [];
  return String(input)
    .split(",")
    .map((item) => normalizeCommandName(item))
    .filter(Boolean);
}

function getDefaultState() {
  return {
    enabled: false,
    downtime: "Unknown",
    notAffectedCommands: [],
    startedBy: null,
    startedAt: null,
    endedBy: null,
    endedAt: null
  };
}

async function getMaintenanceState(force = false) {
  const now = Date.now();
  if (!force && cache.state && cache.expiresAt > now) return cache.state;

  const doc = await SystemSettings.findOne({ key: "global" }).lean().catch(() => null);
  const state = doc?.maintenance ? { ...getDefaultState(), ...doc.maintenance } : getDefaultState();
  cache.state = state;
  cache.expiresAt = now + CACHE_TTL_MS;
  return state;
}

async function setMaintenanceState(nextState) {
  const state = { ...getDefaultState(), ...(nextState || {}) };
  await SystemSettings.updateOne(
    { key: "global" },
    { $set: { key: "global", maintenance: state } },
    { upsert: true }
  );
  cache.state = state;
  cache.expiresAt = Date.now() + CACHE_TTL_MS;
  return state;
}

function isCommandAllowedDuringMaintenance(commandName, state) {
  const name = normalizeCommandName(commandName);
  if (!state?.enabled) return true;
  if (!name) return false;
  if (name === "maintance" || name === "maintenance") return true;
  return Array.isArray(state.notAffectedCommands) && state.notAffectedCommands.includes(name);
}

function buildMaintenanceNotice(state) {
  const botName = getBotName();
  const downtime = String(state?.downtime || "Unknown");
  const allowed = Array.isArray(state?.notAffectedCommands) ? state.notAffectedCommands : [];
  const allowedText = allowed.length ? allowed.map((cmd) => `\`${cmd}\``).join(", ") : "None";
  return [
    `⚠️ ${botName} is in maintenance mode.`,
    `⏳ Downtime: ${downtime}`,
    `✅ Not affected commands: ${allowedText}`,
    "Use `/maintance end` when maintenance is complete."
  ].join("\n");
}

module.exports = {
  normalizeCommandName,
  normalizeCommandList,
  getMaintenanceState,
  setMaintenanceState,
  isCommandAllowedDuringMaintenance,
  buildMaintenanceNotice
};
