const fs = require('fs');
const path = require('path');
const { Routes, REST, SlashCommandBuilder } = require('discord.js');
const config = require('../../config');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if(file.endsWith(".js")) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

module.exports = async (client) => {
  const slashCommands = [];
  const coreFilters = require("../commands/core/filters");
  const coreVolume = require("../commands/core/volume");
  const filterNames = [
    "8d",
    "nightcore",
    "vaporwave",
    "bassboost",
    "subboost",
    "treble",
    "karaoke",
    "echo",
    "reverb",
    "tremolo",
    "vibrato",
    "distortion",
    "rotation",
    "timescale",
    "lowpass",
    "highpass",
    "compressor",
    "normalizer",
    "stereo",
    "mono",
    "resetfilters"
  ];

  // 1. Load Slash Commands (Recursive)
  const slashPath = path.join(__dirname, '../commands/slash');
  if (fs.existsSync(slashPath)) {
    const slashFiles = getAllFiles(slashPath);
    for (const filePath of slashFiles) {
      const command = require(filePath);
      // Slash commands usually export { data: SlashCommandBuilder, execute: func }
      if (command.data) {
        client.slashCommands.set(command.data.name, command);
        slashCommands.push(command.data.toJSON());
      }
    }
  }
  const filterDescriptions = {
    "8d": "8D filter",
    nightcore: "Nightcore filter",
    vaporwave: "Vaporwave filter",
    bassboost: "Bassboost filter",
    subboost: "Subboost filter",
    treble: "Treble filter",
    karaoke: "Karaoke filter",
    echo: "Echo filter",
    reverb: "Reverb filter",
    tremolo: "Tremolo filter",
    vibrato: "Vibrato filter",
    distortion: "Distortion filter",
    rotation: "Rotation filter",
    timescale: "Timescale filter",
    lowpass: "Lowpass filter",
    highpass: "Highpass filter",
    compressor: "Compressor filter",
    normalizer: "Normalizer filter",
    stereo: "Stereo filter",
    mono: "Mono filter",
    resetfilters: "Reset filters"
  };
  for (const name of filterNames) {
    if (client.slashCommands.has(name)) continue;
    const data = new SlashCommandBuilder().setName(name).setDescription(filterDescriptions[name] || "Filter");
    if (name === "bassboost" || name === "subboost") {
      data.addStringOption(o => o.setName("level").setDescription("off | low | medium | high").setRequired(false));
    } else if (name === "rotation") {
      data.addNumberOption(o => o.setName("hz").setDescription("Rotation Hz").setRequired(false));
      data.addBooleanOption(o => o.setName("enabled").setDescription("Enable/disable").setRequired(false));
    } else if (name === "timescale") {
      data.addNumberOption(o => o.setName("speed").setDescription("Speed").setRequired(false));
      data.addNumberOption(o => o.setName("pitch").setDescription("Pitch").setRequired(false));
      data.addNumberOption(o => o.setName("rate").setDescription("Rate").setRequired(false));
      data.addBooleanOption(o => o.setName("enabled").setDescription("Enable/disable").setRequired(false));
    } else if (name !== "resetfilters") {
      data.addBooleanOption(o => o.setName("enabled").setDescription("Enable/disable").setRequired(false));
    }
    const execute = async (client, context) => {
      context.args = [name];
      return coreFilters.run(client, context);
    };
    client.slashCommands.set(name, { data, execute });
    slashCommands.push(data.toJSON());
  }
  if (!client.slashCommands.has("volume")) {
    const data = new SlashCommandBuilder()
      .setName("volume")
      .setDescription("Set or view volume")
      .addIntegerOption(o => o.setName("level").setDescription("1 - 200").setRequired(false));
    const execute = async (client, context) => coreVolume.run(client, context);
    client.slashCommands.set("volume", { data, execute });
    slashCommands.push(data.toJSON());
  }

  // 2. Load Prefix Commands (Recursive)
  const prefixPath = path.join(__dirname, '../commands/prefix');
  if (fs.existsSync(prefixPath)) {
    const prefixFiles = getAllFiles(prefixPath);
    for (const filePath of prefixFiles) {
      const command = require(filePath);
      const fileName = path.basename(filePath, '.js');
      
      if (typeof command === 'function') {
        // Pattern: module.exports = async function(client, context) { ... }
        // Use filename as command name
        client.commands.set(fileName, { name: fileName, execute: command });
      } else if (command.name) {
        // Pattern: module.exports = { name: 'ping', execute: ... }
        client.commands.set(command.name, command);
        if (command.aliases && Array.isArray(command.aliases)) {
          command.aliases.forEach(alias => client.aliases.set(alias, command.name));
        }
      } else if (command.execute) {
        // Pattern: module.exports = { execute: ... } but no name
        client.commands.set(fileName, { name: fileName, ...command });
      }
    }
  }
  for (const name of filterNames) {
    if (client.commands.has(name)) continue;
    client.commands.set(name, {
      name,
      execute: async (client, context) => {
        context.args = [name].concat(context.args || []);
        return coreFilters.run(client, context);
      }
    });
  }
  if (!client.commands.has("volume")) {
    client.commands.set("volume", { name: "volume", execute: async (client, context) => coreVolume.run(client, context) });
  }
  const prefixAliases = {
    p: { name: "play" },
    np: { name: "nowplaying" },
    s: { name: "skip" },
    prev: { name: "previous" },
    ps: { name: "pause" },
    rs: { name: "resume" },
    stp: { name: "stop" },
    sr: { name: "search" },
    req: { name: "request" },
    vs: { name: "voteskip" },
    q: { name: "queue" },
    qp: { name: "queue" },
    qc: { name: "queueClear" },
    qr: { name: "remove" },
    qj: { name: "jump" },
    qs: { name: "shuffle" },
    qh: { name: "history" },
    seek: { name: "seek" },
    fw: { name: "forward" },
    rw: { name: "rewind" },
    vol: { name: "volume" },
    j: { name: "join" },
    l: { name: "leave" },
    rc: { name: "reconnect" },
    mv: { name: "move" },
    ls: { name: "loop", args: ["song"] },
    lq: { name: "loop", args: ["queue"] },
    lo: { name: "loop", args: ["off"] },
    ap: { name: "autoplay" },
    "247": { name: "twentyFourSeven", args: ["on"] },
    "247off": { name: "twentyFourSeven", args: ["off"] },
    plc: { name: "playlistCreate" },
    pla: { name: "playlistAdd" },
    plr: { name: "playlistRemove" },
    plp: { name: "playlistPlay" },
    pld: { name: "playlistDelete" },
    pll: { name: "playlistList" },
    "8d": { name: "8d" },
    nc: { name: "nightcore" },
    vw: { name: "vaporwave" },
    bb: { name: "bassboost" },
    sb: { name: "subboost" },
    tr: { name: "treble" },
    kr: { name: "karaoke" },
    ec: { name: "echo" },
    rv: { name: "reverb" },
    tm: { name: "tremolo" },
    vb: { name: "vibrato" },
    ds: { name: "distortion" },
    rot: { name: "rotation" },
    ts: { name: "timescale" },
    lp: { name: "lowpass" },
    hp: { name: "highpass" },
    cp: { name: "compressor" },
    nr: { name: "normalizer" },
    stereo: { name: "stereo" },
    mono: { name: "mono" },
    rf: { name: "resetfilters" },
    ly: { name: "lyrics" },
    si: { name: "songinfo" },
    ping: { name: "ping" },
    up: { name: "uptime" },
    stats: { name: "stats" },
    h: { name: "help" },
    djset: { name: "dj", args: ["set"] },
    djrm: { name: "dj", args: ["remove"] }
  };
  for (const [alias, entry] of Object.entries(prefixAliases)) {
    if (client.commands.has(entry.name)) {
      client.aliases.set(alias, entry);
    }
  }

  // 3. Load Mention Commands (Recursive)
  client.mentionCommands = new Map(); 
  client.mentionAliases = new Map();
  const mentionPath = path.join(__dirname, '../commands/mention');
  if (fs.existsSync(mentionPath)) {
    const mentionFiles = getAllFiles(mentionPath);
    for (const filePath of mentionFiles) {
      const command = require(filePath);
      const fileName = path.basename(filePath, '.js');
      
      if (typeof command === 'function') {
        client.mentionCommands.set(fileName, { name: fileName, execute: command });
      } else if (command.name) {
        client.mentionCommands.set(command.name, command);
        if (command.aliases && Array.isArray(command.aliases)) {
          command.aliases.forEach(alias => client.mentionAliases.set(alias, command.name));
        }
      } else if (command.execute) {
        client.mentionCommands.set(fileName, { name: fileName, ...command });
      }
    }
  }
  for (const name of filterNames) {
    if (client.mentionCommands.has(name)) continue;
    client.mentionCommands.set(name, {
      name,
      execute: async (client, context) => {
        context.args = [name].concat(context.args || []);
        return coreFilters.run(client, context);
      }
    });
  }
  if (!client.mentionCommands.has("volume")) {
    client.mentionCommands.set("volume", { name: "volume", execute: async (client, context) => coreVolume.run(client, context) });
  }

  // Store for ready event
  client.slashDatas = slashCommands;
  
  console.log(`✅ Loaded ${client.slashCommands.size} commands`);
};
