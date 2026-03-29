/**
 * Core command exports.
 * All real logic lives in core/*. Wrappers only forward args.
 */
const play = require("./play");
const pause = require("./pause");
const resume = require("./resume");
const stop = require("./stop");
const skip = require("./skip");
const previous = require("./previous");
const nowplaying = require("./nowplaying");
const search = require("./search");
const request = require("./request");
const voteskip = require("./voteskip");

const queue = require("./queue");
const queueClear = require("./queueClear");
const remove = require("./remove");
const jump = require("./jump");
const shuffle = require("./shuffle");
const history = require("./history");

const seek = require("./seek");
const forward = require("./forward");
const rewind = require("./rewind");

const join = require("./join");
const leave = require("./leave");
const reconnect = require("./reconnect");
const move = require("./move");

const loop = require("./loop");
const autoplay = require("./autoplay");
const twentyFourSeven = require("./twentyFourSeven");

const playlistCreate = require("./playlistCreate");
const playlistAdd = require("./playlistAdd");
const playlistRemove = require("./playlistRemove");
const playlistPlay = require("./playlistPlay");
const playlistDelete = require("./playlistDelete");
const playlistList = require("./playlistList");

const volume = require("./volume");
const filters = require("./filters");
const lyrics = require("./lyrics");
const songinfo = require("./songinfo");
const prefix = require("./prefix");
const ping = require("./ping");
const uptime = require("./uptime");
const stats = require("./stats");
const help = require("./help");
const updates = require("./updates");
const dj = require("./dj");

module.exports = {
  play,
  pause,
  resume,
  stop,
  skip,
  previous,
  nowplaying,
  search,
  request,
  voteskip,
  queue,
  queueClear,
  remove,
  jump,
  shuffle,
  history,
  seek,
  forward,
  rewind,
  join,
  leave,
  reconnect,
  move,
  loop,
  autoplay,
  twentyFourSeven,
  playlistCreate,
  playlistAdd,
  playlistRemove,
  playlistPlay,
  playlistDelete,
  playlistList,
  volume,
  filters,
  lyrics,
  songinfo,
  prefix,
  ping,
  uptime,
  stats,
  help,
  updates,
  dj
};
