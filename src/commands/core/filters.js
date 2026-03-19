const { requireVoice, requirePlayer } = require("../../lib/playerHelpers");

const FILTER_ALIASES = {
  "8d": "8d",
  nightcore: "nightcore",
  vaporwave: "vaporwave",
  bassboost: "bassboost",
  subboost: "bassboost",
  treble: "treble",
  karaoke: "karaoke",
  echo: "echo",
  reverb: "reverb",
  tremolo: "tremolo",
  vibrato: "vibrato",
  distortion: "distortion",
  rotation: "rotation",
  timescale: "timescale",
  lowpass: "lowpass",
  highpass: "highpass",
  compressor: "compressor",
  normalizer: "normalizer",
  stereo: "stereo",
  mono: "mono",
  resetfilters: "reset"
};

async function run(client, context) {
  const voice = requireVoice(context);
  if (!voice.ok) return context.reply(voice.message);
  const playerCheck = requirePlayer(client, context.guildId);
  if (!playerCheck.ok) return context.reply(playerCheck.message);
  const player = playerCheck.player;
  const raw = (context.args[0] ?? context.options?.filter ?? "").toLowerCase();
  const sub = raw.trim();
  const filterName = FILTER_ALIASES[sub] ?? sub;

  if (filterName === "reset" || filterName === "resetfilters") {
    if (player.filters && typeof player.filters.clearFilters === "function") {
      player.filters.clearFilters();
    }
    return context.reply("Filters reset.");
  }

  const filters = player.filters;
  if (!filters) return context.reply("Filters not available.");

  const bassLevels = { off: false, low: 1, medium: 2.5, high: 5 };
  if (filterName === "bassboost") {
    const level = (context.args[1] ?? context.options?.level ?? "medium").toLowerCase();
    const value = bassLevels[level] ?? (level === "true" ? 2.5 : false);
    filters.setBassboost(!!value, value ? { value } : undefined);
    return context.reply(value ? `Bassboost: **${level}**` : "Bassboost off.");
  }

  const toggle = !["off", "false", "0"].includes((context.args[1] ?? context.options?.enabled ?? "true").toLowerCase());
  const unsupported = () => context.reply("This filter isn't supported by the current Lavalink filters.");
  switch (filterName) {
    case "8d":
      filters.set8D(toggle);
      return context.reply(toggle ? "8D on." : "8D off.");
    case "nightcore":
      filters.setNightcore(toggle);
      return context.reply(toggle ? "Nightcore on." : "Nightcore off.");
    case "vaporwave":
      filters.setVaporwave(toggle);
      return context.reply(toggle ? "Vaporwave on." : "Vaporwave off.");
    case "treble": {
      if (toggle) {
        const bands = Array(13).fill(0).map((_, i) => ({
          band: i,
          gain: i >= 8 ? 0.35 : 0
        }));
        filters.setEqualizer(bands);
        return context.reply("Treble on.");
      }
      filters.setEqualizer([]);
      return context.reply("Treble off.");
    }
    case "karaoke":
      filters.setKaraoke(toggle);
      return context.reply(toggle ? "Karaoke on." : "Karaoke off.");
    case "echo":
      return unsupported();
    case "reverb":
      return unsupported();
    case "tremolo":
      filters.setTremolo(toggle);
      return context.reply(toggle ? "Tremolo on." : "Tremolo off.");
    case "vibrato":
      filters.setVibrato(toggle);
      return context.reply(toggle ? "Vibrato on." : "Vibrato off.");
    case "distortion":
      filters.setDistortion(toggle);
      return context.reply(toggle ? "Distortion on." : "Distortion off.");
    case "rotation":
      if (toggle && typeof context.options?.hz === "number") {
        filters.setRotation(true, { rotationHz: context.options.hz });
      } else {
        filters.setRotation(toggle);
      }
      return context.reply(toggle ? "Rotation on." : "Rotation off.");
    case "timescale":
      if (toggle) {
        const speed = typeof context.options?.speed === "number" ? context.options.speed : undefined;
        const pitch = typeof context.options?.pitch === "number" ? context.options.pitch : undefined;
        const rate = typeof context.options?.rate === "number" ? context.options.rate : undefined;
        const options = {};
        if (speed !== undefined) options.speed = speed;
        if (pitch !== undefined) options.pitch = pitch;
        if (rate !== undefined) options.rate = rate;
        filters.setTimescale(true, options);
      } else {
        filters.setTimescale(false);
      }
      return context.reply(toggle ? "Timescale on." : "Timescale off.");
    case "lowpass":
      filters.setLowPass(toggle);
      return context.reply(toggle ? "Lowpass on." : "Lowpass off.");
    case "highpass":
      return unsupported();
    case "compressor":
      return unsupported();
    case "normalizer":
      return unsupported();
    case "stereo":
      if (toggle) {
        filters.setChannelMix(true, { leftToLeft: 1, leftToRight: 0, rightToLeft: 0, rightToRight: 1 });
        return context.reply("Stereo on.");
      }
      filters.setChannelMix(false);
      return context.reply("Stereo off.");
    case "mono":
      if (toggle) {
        filters.setChannelMix(true, { leftToLeft: 0.5, leftToRight: 0.5, rightToLeft: 0.5, rightToRight: 0.5 });
        return context.reply("Mono on.");
      }
      filters.setChannelMix(false);
      return context.reply("Mono off.");
    default:
      return context.reply("Unknown filter. Use: 8d, nightcore, vaporwave, bassboost, treble, karaoke, echo, reverb, tremolo, vibrato, distortion, rotation, timescale, lowpass, highpass, compressor, normalizer, stereo, mono, resetfilters.");
  }
}

module.exports = { run };
