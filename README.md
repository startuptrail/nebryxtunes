# NebryxTunes Bot

Full Discord Music++ bot: **prefix** (`!play`), **slash** (`/play`), **mention** (`@Bot play`) — all call the same core logic.

## Architecture (fixed)

- `src/commands/core/` — **only** real logic
- `src/commands/prefix/` — thin wrappers (forward args → core)
- `src/commands/slash/` — thin wrappers (SlashCommandBuilder + core)
- `src/commands/mention/` — thin wrappers (same as prefix)

No logic outside core. No duplicate logic.

## Tech stack

- Node.js (CommonJS)
- discord.js v14
- Riffy (Lavalink client)
- MongoDB + mongoose
- Deploy: Render, runnable on Termux

## Config

**No `.env`.** Everything in `config.js`:

- `token` — Discord bot token
- `prefix` — default prefix (e.g. `!`)
- `mongoUri` — MongoDB connection string
- `lavalink` — host, port, password, secure

Replace placeholders before running.

### AI (Groq) quick setup

Set environment variables:

- `AI_PROVIDER=groq`
- `GROQ_API_KEY=your_key`
- `GROQ_MODEL=openai/gpt-oss-20b` (optional)

Then use: `ai <your message>`

### Dashboard + Access Control

Dashboard starts on `PORT` or `DASHBOARD_PORT` (default `8888`) and uses Discord OAuth.

Required env/config:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI` (must match Discord OAuth app redirect)
- `DASHBOARD_OWNER_ID` (global super-admin)
- `DASHBOARD_OWNER_IDS` (optional comma-separated extra super-admin IDs)

Access model:

- Super-admin (`DASHBOARD_OWNER_ID` / `DASHBOARD_OWNER_IDS`) can access **all bot servers**
- Server Owner/Admin can access only their own servers where bot is present
- Regular users cannot access server dashboard

Security monitoring:

- NSFW/bypass prompt attempts are logged to MongoDB (`SecurityEvent`)
- Per-guild toggles in dashboard:
  - `nsfwMonitorEnabled`
  - `nsfwBlockMode`

## Run locally

1. `npm install`
2. Edit `config.js` with your token, MongoDB URI, Lavalink (already running).
3. `npm start` or `node index.js`

## Deploy on Render

- **Service type:** Web (or Background Worker).
- **Build:** `npm install`
- **Start:** `node index.js`
- Add **MongoDB** (e.g. Atlas) and **Lavalink** (separate service or external). Set env or edit `config.js` in build.

## License

This project is licensed under the MIT License.

Copyright (c) 2026 Not Flexxy

## Commands (summary)

- **Music:** play, pause, resume, stop, skip, previous, nowplaying, search, request, voteskip
- **Queue:** queue [page], queue clear, remove, jump, shuffle, history
- **Time:** seek, forward, rewind
- **Voice:** join, leave, reconnect, move
- **Loop / 24/7:** loop song|queue|off, autoplay, 247 on|off
- **Playlists (MongoDB):** playlist create|add|remove|play|delete|list
- **Filters:** 8d, nightcore, vaporwave, bassboost, karaoke, resetfilters, etc.
- **Info:** lyrics, songinfo, ping, uptime, stats, help
- **DJ:** dj set, dj remove

Developed by `Not Flexxy`
Contact: contact.startupgaming@gmail.com
