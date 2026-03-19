function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function validateApiKey(apiKey) {
  const trimmedKey = String(apiKey || "").trim();
  if (!trimmedKey) throw new Error("Gemini API key is missing in config.js.");
  if (/^PASTE_/i.test(trimmedKey)) throw new Error("Gemini API key is still a placeholder in config.js.");
  return trimmedKey;
}

function normalizeMessages(messages) {
  return messages.map((message) => {
    const role = String(message?.role || "user").toLowerCase() === "assistant" ? "model" : "user";
    return {
      role,
      parts: [{ text: String(message?.content || "") }]
    };
  });
}

async function runXaiChat({ apiKey, model = "gemini-2.0-flash", messages, temperature = 0.3, maxTokens = 400, timeoutMs = 20000 }) {
  const trimmedKey = validateApiKey(apiKey);
  if (!Array.isArray(messages) || !messages.length) throw new Error("messages must be a non-empty array.");

  console.log(`[AI] Gemini request model=${model} messages=${messages.length}`);
  const timeout = createTimeoutSignal(timeoutMs);

  let payload;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(trimmedKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: normalizeMessages(messages),
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
          }
        }),
        signal: timeout.signal
      }
    );
    payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        `Gemini request failed with status ${response.status}.`;
      throw new Error(String(message));
    }
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Gemini request timed out.");
    throw error;
  } finally {
    timeout.clear();
  }

  const result = String(
    payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || ""
  ).trim();
  if (!result) throw new Error("Gemini returned an empty response.");

  console.log(`[AI] Gemini response chars=${result.length}`);
  return result;
}

module.exports = { runXaiChat };
