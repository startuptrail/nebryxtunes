const GroqImport = require("groq-sdk");

const Groq = GroqImport?.default || GroqImport;

function validateApiKey(apiKey) {
  const trimmedKey = String(apiKey || "").trim();
  if (!trimmedKey) throw new Error("Groq API key is missing in config.js.");
  if (/^(?:PASTE_|your[-_ ]?groq|your_key)/i.test(trimmedKey)) {
    throw new Error("Groq API key is still a placeholder in config.js.");
  }
  return trimmedKey;
}

function normalizeMessages(messages) {
  return messages.map((message) => ({
    role: String(message?.role || "user").toLowerCase(),
    content: String(message?.content || "")
  }));
}

function extractText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(item => extractText(item)).filter(Boolean).join("\n").trim();
  }
  if (!value || typeof value !== "object") return "";
  if (typeof value.output_text === "string") return value.output_text.trim();
  if (typeof value.text === "string") return value.text.trim();
  if (typeof value.content === "string") return value.content.trim();
  if (typeof value.message === "string") return value.message.trim();
  if (Array.isArray(value.content)) return extractText(value.content);
  if (Array.isArray(value.messages)) return extractText(value.messages);
  if (Array.isArray(value.choices)) {
    return extractText(value.choices.map(choice => choice?.message?.content || choice?.text || ""));
  }
  return "";
}

async function runGroqChat({ apiKey, model = "qwen/qwen3-32b", messages }) {
  const trimmedKey = validateApiKey(apiKey);
  if (!Array.isArray(messages) || !messages.length) throw new Error("messages must be a non-empty array.");

  console.log(`[AI] Groq request model=${model} messages=${messages.length}`);
  const client = new Groq({
    apiKey: trimmedKey,
    timeout: 20 * 1000,
    maxRetries: 1
  });
  const completion = await client.chat.completions.create({
    model,
    messages: normalizeMessages(messages)
  });

  const result = extractText(completion?.choices?.[0]?.message?.content);
  if (!result) throw new Error("Groq returned an empty response.");

  console.log(`[AI] Groq response chars=${result.length}`);
  return result;
}

module.exports = { runGroqChat };
