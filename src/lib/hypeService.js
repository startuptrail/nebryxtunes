const SongHype = require("../database/models/SongHype");

function getTrackIdentity(track) {
  const info = track?.info || track || {};
  const trackId = String(info.identifier || info.uri || `${info.title || "unknown"}::${info.author || "unknown"}`).trim();
  return {
    trackId,
    title: String(info.title || "Unknown").slice(0, 300),
    author: String(info.author || "Unknown").slice(0, 200),
    uri: String(info.uri || "").slice(0, 500)
  };
}

async function addTrackHype({ guildId, userId, track }) {
  if (!guildId || !userId || !track) return { ok: false, reason: "invalid_input" };
  const identity = getTrackIdentity(track);
  if (!identity.trackId) return { ok: false, reason: "invalid_track" };

  let doc = await SongHype.findOne({ guildId, trackId: identity.trackId }).catch(() => null);
  if (!doc) {
    doc = await SongHype.create({
      guildId,
      trackId: identity.trackId,
      title: identity.title,
      author: identity.author,
      uri: identity.uri,
      score: 1,
      voters: [String(userId)],
      lastHypedAt: new Date()
    }).catch(() => null);
    if (!doc) return { ok: false, reason: "create_failed" };
    return { ok: true, added: true, score: doc.score, trackId: identity.trackId };
  }

  const uid = String(userId);
  const already = Array.isArray(doc.voters) && doc.voters.includes(uid);
  if (!already) {
    doc.voters.push(uid);
    doc.score = Math.max(0, Number(doc.score || 0) + 1);
  }
  doc.title = identity.title || doc.title;
  doc.author = identity.author || doc.author;
  doc.uri = identity.uri || doc.uri;
  doc.lastHypedAt = new Date();
  await doc.save().catch(() => {});
  return { ok: true, added: !already, score: Number(doc.score || 0), trackId: identity.trackId };
}

async function getTrackHypeScore(guildId, track) {
  if (!guildId || !track) return 0;
  const { trackId } = getTrackIdentity(track);
  if (!trackId) return 0;
  const doc = await SongHype.findOne({ guildId, trackId }).select({ score: 1 }).lean().catch(() => null);
  return Number(doc?.score || 0);
}

function weightedPick(items, weightByKey) {
  if (!Array.isArray(items) || !items.length) return null;
  let total = 0;
  const weights = items.map(item => {
    const raw = Number(weightByKey(item) || 0);
    const weight = Math.max(1, Math.min(100, 1 + raw * 2));
    total += weight;
    return weight;
  });
  let point = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    point -= weights[i];
    if (point <= 0) return items[i];
  }
  return items[items.length - 1];
}

async function pickTrackByHype(guildId, tracks) {
  if (!guildId || !Array.isArray(tracks) || !tracks.length) return null;
  const normalized = tracks
    .map(track => ({ track, ...getTrackIdentity(track) }))
    .filter(item => item.trackId);
  if (!normalized.length) return tracks[0] || null;

  const ids = normalized.map(item => item.trackId);
  const docs = await SongHype.find({ guildId, trackId: { $in: ids } })
    .select({ trackId: 1, score: 1 })
    .lean()
    .catch(() => []);
  const scoreMap = new Map(docs.map(doc => [String(doc.trackId), Number(doc.score || 0)]));
  const picked = weightedPick(normalized, (item) => scoreMap.get(item.trackId) || 0);
  return picked?.track || tracks[0] || null;
}

module.exports = {
  getTrackIdentity,
  addTrackHype,
  getTrackHypeScore,
  pickTrackByHype
};

