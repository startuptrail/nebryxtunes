const { PermissionsBitField, ChannelType } = require("discord.js");
const Warning = require("../database/models/Warning");
const { requestModerationPayload } = require("./aiController");

const UNAUTHORIZED_PING_COOLDOWN_MS = 5 * 60 * 1000;

function isOwnerOrAdmin(context) {
  const ownerId = String(context?.guild?.ownerId || "");
  const userId = String(context?.userId || "");
  const isOwner = ownerId && ownerId === userId;
  const isAdmin = !!context?.member?.permissions?.has?.(PermissionsBitField.Flags.Administrator);
  return isOwner || isAdmin;
}

function ensureBotPermissions(botMember, permissions) {
  return permissions.every((perm) => botMember?.permissions?.has?.(perm));
}

function parseDurationMs(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return 0;
  const match = raw.match(/^(\d{1,6})\s*(s|m|h|d)?$/);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2] || "m";
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (unit === "s") return value * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  if (unit === "d") return value * 24 * 60 * 60 * 1000;
  return value * 60 * 1000;
}

async function pingAdmins(context, client) {
  if (!context?.guild || !context?.channel) return;
  if (!client.aiModPingCooldowns) client.aiModPingCooldowns = new Map();
  const last = client.aiModPingCooldowns.get(context.guildId) || 0;
  const now = Date.now();
  if (now - last < UNAUTHORIZED_PING_COOLDOWN_MS) return;
  client.aiModPingCooldowns.set(context.guildId, now);
  const members = await context.guild.members.fetch().catch(() => null);
  const pool = members || context.guild.members.cache;
  const admins = pool.filter((m) => !m.user.bot && m.permissions.has(PermissionsBitField.Flags.Administrator));
  if (!admins.size) return;
  const ids = admins.map((m) => m.id);
  const mentions = admins.map((m) => m.toString()).join(" ");
  const text = `🚨 Unauthorized AI moderation attempt. ${mentions}`;
  await context.channel.send({ content: text.slice(0, 1900), allowedMentions: { users: ids } }).catch(() => {});
}

async function getBotMember(guild, client) {
  if (guild.members.me) return guild.members.me;
  return guild.members.fetch(client.user.id).catch(() => null);
}

function isTextChannel(channel) {
  return channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement || channel.isTextBased?.());
}

async function sendModLog(context, payload, result) {
  const guild = context.guild;
  if (!guild) return;
  const envId = process.env.MODLOG_CHANNEL_ID || process.env.MOD_LOG_CHANNEL_ID;
  const target = envId
    ? guild.channels.cache.get(envId)
    : guild.channels.cache.find((c) => ["mod-log", "modlog", "mod-logs", "moderation-logs"].includes(String(c.name || "").toLowerCase()));
  if (!target || !target.isTextBased?.()) return;
  const lines = [
    "**AI Moderation Log**",
    `Moderator: <@${context.userId}>`,
    `Target: ${payload.targetId ? `<@${payload.targetId}>` : "N/A"}`,
    `Action: ${payload.action}`,
    `Reason: ${payload.reason || "None"}`,
    `Time: ${new Date().toISOString()}`,
    `Result: ${result}`,
    `Payload: ${JSON.stringify(payload).slice(0, 1000)}`
  ];
  await target.send(lines.join("\n")).catch(() => {});
}

function requiresTarget(action) {
  return !["lock", "unlock", "purge", "slowmode", "none", "unban"].includes(action);
}

function isHierarchyBlocked(target, moderator, botMember) {
  const targetRole = target?.roles?.highest;
  const moderatorRole = moderator?.roles?.highest;
  const botRole = botMember?.roles?.highest;
  if (!targetRole || !moderatorRole || !botRole) return false;
  if (targetRole.position >= botRole.position) return "bot";
  if (targetRole.position >= moderatorRole.position) return "moderator";
  return false;
}

async function executeWarn(context, targetId, reason) {
  await Warning.create({ guildId: context.guildId, userId: targetId, moderatorId: context.userId, reason: reason || "" });
  const total = await Warning.countDocuments({ guildId: context.guildId, userId: targetId });
  await context.reply(`Warned <@${targetId}>. Total warnings: ${total}.`);
}

async function executePurge(context, count) {
  const deleted = await context.channel.bulkDelete(count, true);
  await context.reply(`Deleted ${deleted.size} message(s).`);
}

async function executeSlowmode(context, seconds, reason) {
  await context.channel.setRateLimitPerUser(seconds, reason || "AI slowmode");
  await context.reply(seconds ? `Slowmode set to ${seconds}s.` : "Slowmode disabled.");
}

async function executeLock(context, reason) {
  await context.channel.permissionOverwrites.edit(context.guild.roles.everyone, { SendMessages: false }, { reason: reason || "AI lock" });
  await context.reply("Channel locked.");
}

async function executeUnlock(context, reason) {
  await context.channel.permissionOverwrites.edit(context.guild.roles.everyone, { SendMessages: null }, { reason: reason || "AI unlock" });
  await context.reply("Channel unlocked.");
}

async function executeBan(context, targetId, durationMs, reason) {
  const member = await context.guild.members.fetch(targetId).catch(() => null);
  if (member) await member.ban({ reason: reason || undefined });
  else await context.guild.bans.create(targetId, { reason: reason || undefined });
  await context.reply(`Banned <@${targetId}>.${durationMs ? ` Duration: ${Math.round(durationMs / 1000)}s` : ""}`);
  if (durationMs > 0) {
    setTimeout(() => {
      context.guild.bans.remove(targetId, "Temporary ban expired").catch(() => {});
    }, durationMs);
  }
}

async function executeUnban(context, targetId, reason) {
  await context.guild.bans.remove(targetId, reason || undefined);
  await context.reply(`Unbanned <@${targetId}>.`);
}

async function executeKick(context, target, reason) {
  await target.kick(reason || undefined);
  await context.reply(`Kicked <@${target.id}>.`);
}

async function executeTimeout(context, target, durationMs, reason) {
  await target.timeout(durationMs, reason || undefined);
  await context.reply(`Timed out <@${target.id}> for ${Math.round(durationMs / 1000)}s.`);
}

async function executeUntimeout(context, target, reason) {
  await target.timeout(null, reason || undefined);
  await context.reply(`Removed timeout for <@${target.id}>.`);
}

async function executeMute(context, target, durationMs, reason) {
  await target.timeout(durationMs, reason || undefined);
  await context.reply(`Muted <@${target.id}> for ${Math.round(durationMs / 1000)}s.`);
}

async function executeUnmute(context, target, reason) {
  await target.timeout(null, reason || undefined);
  await context.reply(`Unmuted <@${target.id}>.`);
}

async function executeRoleAdd(context, target, role, reason) {
  await target.roles.add(role, reason || "AI role add");
  await context.reply(`Added role **${role.name}** to <@${target.id}>.`);
}

async function executeRoleRemove(context, target, role, reason) {
  await target.roles.remove(role, reason || "AI role remove");
  await context.reply(`Removed role **${role.name}** from <@${target.id}>.`);
}

async function executeNickname(context, target, nickname, reason) {
  await target.setNickname(nickname || null, reason || "AI nickname");
  await context.reply(nickname ? `Nickname updated for <@${target.id}>.` : `Nickname reset for <@${target.id}>.`);
}

async function handleAiModeration(client, context, input) {
  if (!context?.guild || !context?.member || !context?.channel) return;
  if (!isOwnerOrAdmin(context)) {
    await context.reply("⛔ You are not allowed to use AI moderation.");
    await pingAdmins(context, client);
    return;
  }
  const aiResult = await requestModerationPayload(input, context);
  if (!aiResult.ok || !aiResult.payload) {
    await context.reply("⚠️ Could not understand moderation command.");
    return;
  }
  const payload = aiResult.payload;
  const action = payload.action;
  if (action === "none") {
    await context.reply("No moderation action detected.");
    return;
  }
  const botMember = await getBotMember(context.guild, client);
  if (!botMember) {
    await context.reply("⚠️ Could not perform action due to Discord permission error.");
    return;
  }
  const targetId = payload.targetId;
  const reason = payload.reason ? payload.reason.slice(0, 200) : "";
  if (action === "unban" && !targetId) {
    await context.reply("⚠️ Could not understand moderation command.");
    return;
  }
  const target = requiresTarget(action) ? await context.guild.members.fetch(targetId).catch(() => null) : null;

  // Safety check: require target for user actions and block self/owner moderation.
  if (requiresTarget(action) && !targetId) {
    await context.reply("⚠️ Could not understand moderation command.");
    return;
  }
  if (target && String(target.id) === String(context.userId)) {
    await context.reply("You cannot moderate yourself.");
    return;
  }
  if (target && String(target.id) === String(context.guild.ownerId || "")) {
    await context.reply("You cannot moderate the server owner.");
    return;
  }
  if (requiresTarget(action) && !target) {
    await context.reply("User not found.");
    return;
  }
  if (target) {
    // Safety check: role hierarchy blocks moderator or bot when target is equal/higher.
    const blocked = isHierarchyBlocked(target, context.member, botMember);
    if (blocked === "moderator") {
      await context.reply("You cannot moderate a member with an equal or higher role.");
      return;
    }
    if (blocked === "bot") {
      await context.reply("⚠️ Could not perform action due to Discord permission error.");
      return;
    }
  }

  try {
    if (action === "warn") {
      await executeWarn(context, targetId, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "purge") {
      if (!isTextChannel(context.channel)) throw new Error("Channel not text");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ManageMessages])) throw new Error("Missing permissions");
      const count = Math.max(1, Math.min(100, Number(payload.duration || 10)));
      await executePurge(context, count);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "slowmode") {
      if (!isTextChannel(context.channel)) throw new Error("Channel not text");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ManageChannels])) throw new Error("Missing permissions");
      const seconds = Math.max(0, Math.min(21600, Number(payload.slowmodeSeconds || 0)));
      await executeSlowmode(context, seconds, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "lock") {
      if (!isTextChannel(context.channel)) throw new Error("Channel not text");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ManageChannels])) throw new Error("Missing permissions");
      await executeLock(context, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "unlock") {
      if (!isTextChannel(context.channel)) throw new Error("Channel not text");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ManageChannels])) throw new Error("Missing permissions");
      await executeUnlock(context, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "ban") {
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.BanMembers])) throw new Error("Missing permissions");
      if (target && !target.bannable) throw new Error("Missing permissions");
      const durationMs = parseDurationMs(payload.duration);
      await executeBan(context, targetId, durationMs, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "unban") {
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.BanMembers])) throw new Error("Missing permissions");
      await executeUnban(context, targetId, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "kick") {
      if (!target) throw new Error("Missing target");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.KickMembers])) throw new Error("Missing permissions");
      if (!target.kickable) throw new Error("Missing permissions");
      await executeKick(context, target, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "timeout") {
      if (!target) throw new Error("Missing target");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ModerateMembers])) throw new Error("Missing permissions");
      if (!target.moderatable) throw new Error("Missing permissions");
      const durationMs = parseDurationMs(payload.duration) || 10 * 60 * 1000;
      await executeTimeout(context, target, durationMs, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "untimeout") {
      if (!target) throw new Error("Missing target");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ModerateMembers])) throw new Error("Missing permissions");
      if (!target.moderatable) throw new Error("Missing permissions");
      await executeUntimeout(context, target, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "mute") {
      if (!target) throw new Error("Missing target");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ModerateMembers])) throw new Error("Missing permissions");
      if (!target.moderatable) throw new Error("Missing permissions");
      const durationMs = parseDurationMs(payload.duration) || 10 * 60 * 1000;
      await executeMute(context, target, durationMs, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "unmute") {
      if (!target) throw new Error("Missing target");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ModerateMembers])) throw new Error("Missing permissions");
      if (!target.moderatable) throw new Error("Missing permissions");
      await executeUnmute(context, target, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "role_add" || action === "role_remove") {
      if (!target) throw new Error("Missing target");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ManageRoles])) throw new Error("Missing permissions");
      const role = payload.roleId ? context.guild.roles.cache.get(payload.roleId) : null;
      if (!role) {
        await context.reply("Role not found.");
        return;
      }
      if (role.position >= botMember.roles.highest.position) throw new Error("Missing permissions");
      if (role.position >= context.member.roles.highest.position) {
        await context.reply("You cannot manage a role equal or higher than your top role.");
        return;
      }
      if (action === "role_add") await executeRoleAdd(context, target, role, reason);
      else await executeRoleRemove(context, target, role, reason);
      await sendModLog(context, payload, "success");
      return;
    }
    if (action === "nickname") {
      if (!target) throw new Error("Missing target");
      if (!ensureBotPermissions(botMember, [PermissionsBitField.Flags.ManageNicknames])) throw new Error("Missing permissions");
      await executeNickname(context, target, payload.nickname || "", reason);
      await sendModLog(context, payload, "success");
      return;
    }

    await context.reply("⚠️ Could not understand moderation command.");
  } catch (error) {
    await context.reply("⚠️ Could not perform action due to Discord permission error.");
    await sendModLog(context, payload, `failed: ${String(error?.message || "error").slice(0, 120)}`);
  }
}

module.exports = { handleAiModeration };
