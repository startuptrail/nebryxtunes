const { PermissionsBitField } = require("discord.js");
const { requireVoice, requirePlayer, updateNowPlayingMessage, clearNowPlayingMessage } = require("../../lib/playerHelpers");
const coreQueue = require("../../commands/core/queue");
const coreSkip = require("../../commands/core/skip");
const coreLyrics = require("../../commands/core/lyrics");
const coreHelp = require("../../commands/core/help");
const coreUpdates = require("../../commands/core/updates");
const Guild = require("../../database/models/Guild");

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    const buildEphemeralPayload = (payload) => {
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return { ...payload, ephemeral: payload.ephemeral ?? true };
      }
      const content = payload === undefined || payload === null ? "" : String(payload);
      return { content, ephemeral: true };
    };
    if (interaction.isButton()) {
      if (interaction.customId === "ai_reactivate") {
        const member = interaction.member;
        const canManage = member?.permissions?.has?.(PermissionsBitField.Flags.ManageGuild)
          || member?.permissions?.has?.(PermissionsBitField.Flags.Administrator);
        if (!canManage) {
          return interaction.reply({ content: "You need Manage Server to reactivate AI.", ephemeral: true }).catch(() => {});
        }
        await Guild.updateOne(
          { guildId: interaction.guildId },
          { $set: { aiEnabled: true, aiAutoDisabled: false } },
          { upsert: true }
        );
        await interaction.update({ content: "✅ AI reactivated.", components: [] }).catch(() => {});
        return;
      }
      if (interaction.customId && interaction.customId.startsWith("help_")) {
        const id = interaction.customId;
        if (id === "help_close") {
          await interaction.deferUpdate().catch(() => {});
          await interaction.message?.delete().catch(() => {});
          return;
        }
        if (id === "help_home") {
          const payload = coreHelp.buildHelpPayload(client, interaction.guildId, { type: "overview" });
          return interaction.update(payload).catch(() => {});
        }
        if (id.startsWith("help_prev:") || id.startsWith("help_next:")) {
          const raw = Number(id.split(":")[1]);
          const delta = id.startsWith("help_prev:") ? -1 : 1;
          const payload = coreHelp.buildHelpPayload(client, interaction.guildId, { type: "categoryIndex", index: raw + delta });
          return interaction.update(payload).catch(() => {});
        }
        return;
      }
      if (interaction.customId && interaction.customId.startsWith("updates_view:")) {
        const view = String(interaction.customId.split(":")[1] || "latest").trim().toLowerCase();
        const payload = coreUpdates.buildPayload(view);
        return interaction.update(payload).catch(() => {});
      }
      if (!interaction.customId || !interaction.customId.startsWith("np_")) return;
      const voiceCheck = requireVoice({ member: interaction.member });
      if (!voiceCheck.ok) return interaction.reply(buildEphemeralPayload(voiceCheck.message));
      const playerCheck = requirePlayer(client, interaction.guildId);
      if (!playerCheck.ok) return interaction.reply(buildEphemeralPayload(playerCheck.message));
      const player = playerCheck.player;
      const memberVc = interaction.member?.voice?.channel?.id;
      if (player.voiceChannel && memberVc && player.voiceChannel !== memberVc) {
        return interaction.reply(buildEphemeralPayload("❌ You must be in my voice channel."));
      }
      await interaction.deferUpdate().catch(() => {});
      const respond = async (payload) => {
        const data = buildEphemeralPayload(payload);
        if (interaction.deferred || interaction.replied) return interaction.followUp(data).catch(() => {});
        return interaction.reply(data).catch(() => {});
      };
      try {
        switch (interaction.customId) {
          case "np_prev": {
            const history = client.previousTracks?.get(interaction.guildId) ?? [];
            if (!history.length) {
              await respond("No previous track.");
              break;
            }
            const prev = history.pop();
            const q = player.queue;
            if (player.current) {
              if (typeof q.unshift === "function") q.unshift(player.current);
              else if (typeof q.add === "function") q.add(player.current);
            }
            if (typeof q.unshift === "function") q.unshift(prev);
            else if (typeof q.add === "function") q.add(prev);
            player.stop();
            client.previousTracks.set(interaction.guildId, history);
            break;
          }
          case "np_pause": {
            player.pause(!player.paused);
            break;
          }
          case "np_next": {
            const ctx = {
              guildId: interaction.guildId,
              member: interaction.member,
              args: [],
              options: {},
              reply: async (content) => respond(content),
              author: interaction.user,
              user: interaction.user,
              userId: interaction.user.id,
              channel: interaction.channel,
              channelId: interaction.channelId,
              guild: interaction.guild,
              interaction
            };
            await coreSkip.run(client, ctx);
            break;
          }
          case "np_stop": {
            if (typeof player.queue?.clear === "function") player.queue.clear();
            player.stop();
            player.destroy();
            if (client.startPresenceRotation) client.startPresenceRotation();
            await clearNowPlayingMessage(client, player);
            await respond("⛔ Music Halted!");
            break;
          }
          case "np_loop": {
            const next = player.loop === "none" ? "queue" : player.loop === "queue" ? "track" : "none";
            if (typeof player.setLoop === "function") player.setLoop(next);
            else player.loop = next;
            break;
          }
          case "np_vol_down": {
            const current = typeof player.volume === "number" ? player.volume : 100;
            const next = Math.max(0, current - 10);
            if (typeof player.setVolume === "function") player.setVolume(next);
            else player.volume = next;
            break;
          }
          case "np_vol_up": {
            const current = typeof player.volume === "number" ? player.volume : 100;
            const next = Math.min(200, current + 10);
            if (typeof player.setVolume === "function") player.setVolume(next);
            else player.volume = next;
            break;
          }
          case "np_mute": {
            const current = typeof player.volume === "number" ? player.volume : 100;
            const muted = player.muted === true || current === 0;
            if (muted) {
              const restore = typeof player._prevVolume === "number" && player._prevVolume > 0 ? player._prevVolume : 100;
              if (typeof player.setVolume === "function") player.setVolume(restore);
              else player.volume = restore;
              player.muted = false;
            } else {
              player._prevVolume = current;
              if (typeof player.setVolume === "function") player.setVolume(0);
              else player.volume = 0;
              player.muted = true;
            }
            break;
          }
          case "np_shuffle": {
            if (typeof player.queue?.shuffle === "function") player.queue.shuffle();
            break;
          }
          case "np_clear": {
            if (typeof player.queue?.clear === "function") player.queue.clear();
            break;
          }
          case "np_queue": {
            const ctx = {
              guildId: interaction.guildId,
              member: interaction.member,
              args: [],
              options: { page: 1 },
              reply: async (content) => respond(content),
              author: interaction.user,
              user: interaction.user,
              userId: interaction.user.id,
              channel: interaction.channel,
              channelId: interaction.channelId,
              guild: interaction.guild,
              interaction
            };
            await coreQueue.run(client, ctx);
            break;
          }
          case "np_lyrics": {
            const ctx = {
              guildId: interaction.guildId,
              member: interaction.member,
              args: [],
              options: {},
              reply: async (content) => respond(content),
              author: interaction.user,
              user: interaction.user,
              userId: interaction.user.id,
              channel: interaction.channel,
              channelId: interaction.channelId,
              guild: interaction.guild,
              interaction
            };
            await coreLyrics.run(client, ctx);
            break;
          }
          default:
            break;
        }
        if (interaction.message?.editable) {
          await updateNowPlayingMessage(client, player, interaction.message);
        }
      } catch (error) {
        await respond("There was an error handling that control.");
        console.error(error);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== "help_category") return;
      const value = interaction.values?.[0];
      const payload = coreHelp.buildHelpPayload(client, interaction.guildId, { type: "category", category: value });
      return interaction.update(payload).catch(() => {});
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) return;

    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }
      const options = {};
      if (interaction.options && interaction.options.data) {
        for (const opt of interaction.options.data) {
          if (opt.options && opt.options.length) {
            options._subcommand = opt.name;
            for (const sub of opt.options) {
              options[sub.name] = sub.value;
            }
          } else {
            options[opt.name] = opt.value;
          }
        }
      }

      const ctx = {
        guildId: interaction.guildId,
        member: interaction.member,
        args: [], 
        options: options,
        reply: async (content) => {
          if (interaction.deferred || interaction.replied) return interaction.editReply(content);
          return interaction.reply(content);
        },
        author: interaction.user,
        user: interaction.user,
        userId: interaction.user.id,
        channel: interaction.channel,
        channelId: interaction.channelId,
        guild: interaction.guild,
        interaction: interaction
      };

      if (interaction.guildId && interaction.channelId && client.lastCommandChannel) {
        client.lastCommandChannel.set(interaction.guildId, interaction.channelId);
      }
      await command.execute(client, ctx);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  }
};
