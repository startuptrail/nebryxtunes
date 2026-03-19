function extractJsonCandidate(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (start === -1) start = index;
      depth += 1;
      continue;
    }
    if (char === "}" && start !== -1) {
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }

  return "";
}

function tryParseJson(input) {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseAiPayload(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return {
      ok: true,
      payload: { action: "CHAT", args: { text: "AI did not return content. Please try again." } }
    };
  }

  const direct = tryParseJson(raw);
  if (direct) return { ok: true, payload: direct };

  const extracted = extractJsonCandidate(raw);
  const parsed = tryParseJson(extracted);
  if (parsed) return { ok: true, payload: parsed };

  return { ok: true, payload: { action: "CHAT", args: { text: raw.slice(0, 1800) } } };
}

module.exports = {
  extractJsonCandidate,
  tryParseJson,
  parseAiPayload
};
