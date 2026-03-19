const config = require("../../config");

const HF_API_BASE = "https://api-inference.huggingface.co/models";
const DEFAULT_TIMEOUT_MS = 120000;

function getHfConfig() {
  const aiConfig = config?.ai || {};
  return {
    apiKey: process.env.HF_API_KEY || aiConfig.hfApiKey || "",
    imageModel: process.env.HF_IMAGE_MODEL || aiConfig.hfImageModel || "black-forest-labs/FLUX.1-schnell",
    videoModel: process.env.HF_VIDEO_MODEL || aiConfig.hfVideoModel || "genmo/mochi-1-preview"
  };
}

function extensionFromContentType(contentType, fallback) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("webp")) return "webp";
  return fallback;
}

async function hfRequest(model, body, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { apiKey } = getHfConfig();
  if (!apiKey || apiKey === "your-huggingface-api-key-here") {
    throw new Error("HuggingFace API key missing. Set HF_API_KEY in config.js or environment.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${HF_API_BASE}/${model}`;
    console.log(`🖼️ [AI] HuggingFace request → model=${model}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      let errMsg;
      try {
        const errData = await res.json();
        errMsg = errData?.error || errData?.message || `HuggingFace request failed (${res.status})`;
        if (errMsg.includes("loading")) {
          errMsg = "Model is loading, please try again in 20-30 seconds.";
        }
      } catch (_) {
        errMsg = `HuggingFace request failed with status ${res.status}`;
      }
      throw new Error(String(errMsg));
    }

    const contentType = res.headers.get("content-type") || "";
    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`✅ [AI] HuggingFace response → ${buffer.length} bytes`);
    return { buffer, contentType };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("HuggingFace request timed out.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function generateImageXai({ prompt, modelName, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const { imageModel } = getHfConfig();
  const model = modelName || imageModel;
  const text = String(prompt || "").trim();
  if (!text) throw new Error("Prompt is required.");

  console.log(`🖼️ [AI] Image gen start → model=${model} prompt="${text.slice(0, 60)}..."`);
  const { buffer, contentType } = await hfRequest(model, { inputs: text }, timeoutMs);
  const extension = extensionFromContentType(contentType, "png");

  return {
    type: "buffer",
    buffer,
    extension,
    provider: "huggingface",
    model
  };
}

async function generateVideoXai({ prompt, modelName, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const { videoModel } = getHfConfig();
  const model = modelName || videoModel;
  const text = String(prompt || "").trim();
  if (!text) throw new Error("Prompt is required.");

  console.log(`🎬 [AI] Video gen start → model=${model} prompt="${text.slice(0, 60)}..."`);
  const { buffer, contentType } = await hfRequest(model, { inputs: text }, timeoutMs);
  const extension = extensionFromContentType(contentType, "mp4");

  return {
    type: "buffer",
    buffer,
    extension,
    provider: "huggingface",
    model
  };
}

module.exports = {
  getXaiConfig: getHfConfig,
  generateImageXai,
  generateVideoXai
};
