/**
 * NebryxTunes Web Server
 * Serves index.html at / and exposes /api/bot plus /health.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { getBotName, getBotNameUpper } = require("../lib/branding");

const INDEX_HTML = path.join(__dirname, "../../index.html");

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendHtml(res, status, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error: could not read index.html");
      return;
    }
    const html = String(data)
      .replace(/__BOT_NAME__/g, getBotName())
      .replace(/__BOT_NAME_UPPER__/g, getBotNameUpper())
      .replace(/NEBRYXTUNES/g, getBotNameUpper())
      .replace(/NebryxTunes/g, getBotName());
    res.writeHead(status, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(html),
      "Cache-Control": "no-cache"
    });
    res.end(html);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    `${seconds}s`
  ].filter(Boolean).join(" ");
}

function getBotSnapshot(client) {
  const wsStatus = client.ws?.status ?? -1;
  const servers = client.guilds?.cache?.size ?? 0;
  const ping = client.ws?.ping ?? -1;
  const uptimeMs = Date.now() - (client.startedAt || Date.now());
  const activities = client.user?.presence?.activities ?? [];
  const activity = activities[0] || null;
  const activityName = activity?.name || "Idle";

  let status = "offline";
  if (wsStatus === 0) {
    status = activity?.type === 1 ? "streaming" : "online";
  }

  return {
    ok: true,
    status,
    gatewayReady: wsStatus === 0,
    servers,
    ping,
    uptimeMs,
    activityType: activity?.type ?? null,
    activityName,
    updatedAt: new Date().toISOString(),
    botName: getBotName()
  };
}

function renderHealthPage(snapshot) {
  const accent = snapshot.status === "offline" ? "#ff5f57" : snapshot.status === "streaming" ? "#47f6ff" : "#7dff7a";
  const statusLabel = snapshot.status.toUpperCase();
  const uptimeLabel = formatDuration(snapshot.uptimeMs);
  const pingLabel = snapshot.ping >= 0 ? `${snapshot.ping} ms` : "Unknown";
  const updatedLabel = new Date(snapshot.updatedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
    timeZoneName: "short"
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(snapshot.botName)} Health</title>
  <style>
    :root {
      --bg: #050814;
      --panel: rgba(10, 16, 30, 0.84);
      --panel-strong: rgba(7, 12, 24, 0.95);
      --line: rgba(125, 255, 122, 0.16);
      --text: #ecfff1;
      --muted: #9cb4a4;
      --accent: ${accent};
      --cyan: #47f6ff;
      --accent-soft: color-mix(in srgb, ${accent} 20%, transparent);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: Consolas, "Courier New", monospace;
      background:
        radial-gradient(circle at top, rgba(71, 246, 255, 0.14), transparent 30%),
        radial-gradient(circle at 82% 18%, rgba(125, 255, 122, 0.11), transparent 22%),
        linear-gradient(180deg, #09111f 0%, #050814 50%, #03050a 100%);
      overflow-x: hidden;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(125, 255, 122, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(125, 255, 122, 0.04) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
      mask-image: linear-gradient(180deg, rgba(0,0,0,0.92), rgba(0,0,0,0.3));
    }
    .wrap {
      width: min(1100px, calc(100% - 24px));
      margin: 0 auto;
      padding: 24px 0 40px;
      position: relative;
    }
    .hero, .card {
      border: 1px solid var(--line);
      background: linear-gradient(180deg, var(--panel), var(--panel-strong));
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.02) inset,
        0 18px 50px rgba(0,0,0,0.38),
        0 0 28px var(--accent-soft);
      backdrop-filter: blur(12px);
    }
    .hero {
      border-radius: 24px;
      padding: 28px;
      overflow: hidden;
      position: relative;
    }
    .hero::after {
      content: "";
      position: absolute;
      inset: auto -12% -48% 58%;
      height: 260px;
      background: radial-gradient(circle, color-mix(in srgb, var(--accent) 30%, transparent), transparent 68%);
      pointer-events: none;
    }
    .eyebrow {
      color: var(--cyan);
      text-transform: uppercase;
      letter-spacing: 0.24em;
      font-size: 12px;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0;
      font-size: clamp(34px, 6vw, 72px);
      line-height: 0.95;
      letter-spacing: -0.04em;
      text-transform: uppercase;
      text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 30%, transparent);
    }
    .sub {
      margin: 14px 0 0;
      max-width: 760px;
      color: var(--muted);
      line-height: 1.65;
      font-size: 14px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .chip {
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      font-size: 12px;
    }
    .chip strong { color: var(--accent); margin-left: 8px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
      margin-top: 16px;
    }
    .card {
      border-radius: 20px;
      padding: 18px;
      min-height: 150px;
    }
    .span-4 { grid-column: span 4; }
    .span-6 { grid-column: span 6; }
    .label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .value {
      color: var(--accent);
      font-weight: 700;
      font-size: clamp(26px, 4vw, 42px);
      text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 30%, transparent);
    }
    .small {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
      margin-top: 10px;
    }
    .terminal {
      color: #d7ffe0;
      font-size: 13px;
      line-height: 1.75;
      white-space: pre-wrap;
    }
    .cursor {
      display: inline-block;
      width: 10px;
      height: 1.1em;
      margin-left: 6px;
      vertical-align: -0.18em;
      background: var(--accent);
      box-shadow: 0 0 12px var(--accent);
      animation: blink 1s steps(1) infinite;
    }
    .footer {
      margin-top: 16px;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
    @media (max-width: 840px) {
      .span-4, .span-6 { grid-column: span 12; }
      .wrap { width: min(100% - 16px, 1100px); }
      .hero { padding: 22px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div class="eyebrow">NebryxTunes System Monitor</div>
      <h1>${escapeHtml(snapshot.botName)} Health</h1>
      <p class="sub">Live gateway diagnostics with a terminal-style surface. This page stays lightweight for uptime checks while matching the darker branded feel of the main site.</p>
      <div class="chips">
        <div class="chip">Status<strong>${escapeHtml(statusLabel)}</strong></div>
        <div class="chip">Gateway<strong>${snapshot.gatewayReady ? "READY" : "WAITING"}</strong></div>
        <div class="chip">Updated<strong>${escapeHtml(updatedLabel)}</strong></div>
      </div>
    </section>

    <div class="grid">
      <section class="card span-4">
        <div class="label">Signal</div>
        <div class="value">${escapeHtml(statusLabel)}</div>
        <div class="small">Derived from Discord gateway connectivity and current presence state.</div>
      </section>
      <section class="card span-4">
        <div class="label">Uptime</div>
        <div class="value">${escapeHtml(uptimeLabel)}</div>
        <div class="small">Process uptime since the current Render instance booted.</div>
      </section>
      <section class="card span-4">
        <div class="label">Gateway Ping</div>
        <div class="value">${escapeHtml(pingLabel)}</div>
        <div class="small">Current Discord WebSocket latency from the active client session.</div>
      </section>

      <section class="card span-6">
        <div class="label">Deployment Trace</div>
        <div class="terminal">$ bot.status
STATUS............. ${escapeHtml(statusLabel)}
GATEWAY............ ${snapshot.gatewayReady ? "READY" : "NOT_READY"}
SERVERS............ ${escapeHtml(String(snapshot.servers))}
ACTIVITY........... ${escapeHtml(snapshot.activityName)}
UPDATED_AT......... ${escapeHtml(snapshot.updatedAt)}<span class="cursor"></span></div>
      </section>
      <section class="card span-6">
        <div class="label">Runtime Stats</div>
        <div class="terminal">$ metrics.snapshot
SERVER_COUNT....... ${escapeHtml(String(snapshot.servers))}
BOT_ACTIVITY....... ${escapeHtml(snapshot.activityName)}
PING_MS............ ${escapeHtml(String(snapshot.ping))}
UPTIME_MS.......... ${escapeHtml(String(snapshot.uptimeMs))}
HEALTH_ENDPOINT.... /health</div>
      </section>
    </div>

    <div class="footer">MIT licensed NebryxTunes status surface</div>
  </main>
</body>
</html>`;
}

async function startDashboardServer(client) {
  const port = Number(process.env.PORT || process.env.DASHBOARD_PORT || 8888);
  const host = process.env.DASHBOARD_HOST || "0.0.0.0";

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" });
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/health") {
      const snapshot = getBotSnapshot(client);
      const html = renderHealthPage(snapshot);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(html),
        "Cache-Control": "no-store"
      });
      return res.end(html);
    }

    if (req.method === "GET" && url.pathname === "/api/bot") {
      try {
        return sendJson(res, 200, getBotSnapshot(client));
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: String(err.message) });
      }
    }

    if (req.method === "GET") {
      return sendHtml(res, 200, INDEX_HTML);
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  console.log(`[WEB] Server listening → http://${host}:${port}`);
  console.log(`[WEB] Landing page  → http://${host}:${port}/`);
  console.log(`[WEB] Bot API       → http://${host}:${port}/api/bot`);
  return server;
}

module.exports = { startDashboardServer };
