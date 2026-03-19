/**
 * NebryxTunes — Web Server
 * Serves index.html at / and exposes /api/bot with REAL live bot data.
 */
const http = require("http");
const fs   = require("fs");
const path = require("path");

// Path to the index.html sitting in the project root
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
    res.writeHead(status, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": data.length,
      "Cache-Control": "no-cache"          // force browser to always re-fetch
    });
    res.end(data);
  });
}

async function startDashboardServer(client) {
  const port = Number(process.env.PORT || process.env.DASHBOARD_PORT || 8888);
  const host = process.env.DASHBOARD_HOST || "0.0.0.0";

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    // ── CORS preflight ──────────────────────────────────────────────────────
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" });
      return res.end();
    }

    // ── Health check ────────────────────────────────────────────────────────
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        uptimeMs: Date.now() - (client.startedAt || Date.now())
      });
    }

    // ── /api/bot  — REAL live bot data ──────────────────────────────────────
    if (req.method === "GET" && url.pathname === "/api/bot") {
      try {
        const wsStatus    = client.ws?.status ?? -1;   // 0 = READY
        const servers     = client.guilds?.cache?.size ?? 0;
        const ping        = client.ws?.ping ?? -1;
        const uptimeMs    = Date.now() - (client.startedAt || Date.now());

        // Detect current activity type from presence
        // ActivityType.Streaming = 1 , ActivityType.Listening = 2
        const activities  = client.user?.presence?.activities ?? [];
        const actType     = activities[0]?.type ?? null;   // null if no activity
        const actName     = activities[0]?.name ?? null;

        // Map to status string (matches our index.html setStatus function)
        // wsStatus 0 = READY, anything else = not ready
        let status = "offline";
        if (wsStatus === 0) {
          if (actType === 1) {
            status = "streaming";   // ActivityType.Streaming (purple)
          } else {
            status = "online";      // green
          }
        }
        // Note: bot always uses Streaming for idle presence (Twitch), so
        // status will realistically be "streaming" when idle and "online"
        // when playing — but we surface the real data and let HTML decide.

        return sendJson(res, 200, {
          status,          // "online" | "streaming" | "offline"
          servers,         // real guild count
          ping,            // real WebSocket ping in ms
          uptimeMs,        // uptime in milliseconds
          activityType: actType,   // raw Discord activity type number
          activityName: actName    // e.g. "Serving 3 servers"
        });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: String(err.message) });
      }
    }

    // ── Serve index.html for every other GET (SPA-style) ───────────────────
    if (req.method === "GET") {
      return sendHtml(res, 200, INDEX_HTML);
    }

    // 404 fallback
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
