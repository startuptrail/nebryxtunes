const config = require('../../../config');
const Guild = require('../../database/models/Guild');
const coreAi = require('../../commands/core/ai');
const coreSearch = require('../../commands/core/search');
const { handleAiModeration } = require('../../lib/moderationHandler');
const { monitorIncomingMessage } = require('../../lib/securityMonitor');

function normalizeAutoText(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

module.exports = {
    name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;
    const guildData = await Guild.findOne({ guildId: message.guild.id }).lean();
    await monitorIncomingMessage(message, guildData);

    // 1. Check for Mention Command
    const content = message.content.trim();
    const mentionRegex = new RegExp(`^<@!?${client.user.id}>\\s*`);
    if (mentionRegex.test(content)) {
        const args = content.replace(mentionRegex, "").trim().split(/ +/).filter(Boolean);
        let commandName = (args.shift() || "").toLowerCase();
        if (!commandName && args.length) commandName = "play";
        if (!commandName) return;
        
        const resolvedMentionName = client.mentionAliases?.get(commandName);
        const command = client.mentionCommands.get(commandName) || client.mentionCommands.get(resolvedMentionName);
        if (command) {
            let replied = false;
            try {
                const ctx = {
                    guildId: message.guild.id,
                    member: message.member,
                    args: args,
                    reply: async (content) => {
                        try {
                            const sent = await message.reply(content);
                            replied = true;
                            return sent;
                        } catch (_) {
                            const sent = await message.channel.send(content);
                            replied = true;
                            return sent;
                        }
                    },
                    author: message.author,
                    channel: message.channel,
                    channelId: message.channel.id,
                    guild: message.guild,
                    user: message.author,
                    userId: message.author.id,
                    message: message
                };
                if (message.guild?.id && message.channel?.id && client.lastCommandChannel) {
                    client.lastCommandChannel.set(message.guild.id, message.channel.id);
                }
                await command.execute(client, ctx);
            } catch (error) {
                console.error(error);
                if (!replied) message.reply('There was an error executing that mention command!');
            }
        }
        return; // Don't process as prefix command if it was a mention
    }

    const lower = content.toLowerCase();
    const names = [];
    if (client.user && client.user.username) names.push(client.user.username.toLowerCase());
    const display = message.guild?.members?.me?.displayName;
    if (display) names.push(display.toLowerCase());
    const matchedName = names.find(n => lower.startsWith(n) || lower.startsWith("@" + n));
    if (matchedName) {
        const rest = content.slice(matchedName.length).trim().replace(/^@/, "").trim();
        const parts = rest.split(/ +/).filter(Boolean);
        let commandName = (parts.shift() || "").toLowerCase();
        if (!commandName && parts.length) commandName = "play";
        if (!commandName) return;
        const resolvedMentionName = client.mentionAliases?.get(commandName);
        const command = client.mentionCommands.get(commandName) || client.mentionCommands.get(resolvedMentionName);
        if (command) {
            let replied = false;
            try {
                const ctx = {
                    guildId: message.guild.id,
                    member: message.member,
                    args: parts,
                    reply: async (content) => {
                        try {
                            const sent = await message.reply(content);
                            replied = true;
                            return sent;
                        } catch (_) {
                            const sent = await message.channel.send(content);
                            replied = true;
                            return sent;
                        }
                    },
                    author: message.author,
                    channel: message.channel,
                    channelId: message.channel.id,
                    guild: message.guild,
                    user: message.author,
                    userId: message.author.id,
                    message: message
                };
                if (message.guild?.id && message.channel?.id && client.lastCommandChannel) {
                    client.lastCommandChannel.set(message.guild.id, message.channel.id);
                }
                await command.execute(client, ctx);
            } catch (error) {
                if (!replied) message.reply('There was an error executing that mention command!');
            }
        }
        return;
    }

    // 2. Check for Prefix Command
    let prefix = config.prefix;
    if (guildData && guildData.prefix) prefix = guildData.prefix;

    if (!message.content.startsWith(prefix)) {
        const handledSearchSelection = await coreSearch.tryHandleSelectionMessage(client, message);
        if (handledSearchSelection) return;
        const attachment = message.attachments?.first?.();
        const autoMessage = content || (attachment ? `Attachment: ${attachment.url}` : "");
        if (!autoMessage) return;
        const autoTrigger = normalizeAutoText(guildData?.autoResponseTrigger);
        const autoResponse = String(guildData?.autoResponseText || "").trim();
        if (guildData?.autoResponseEnabled && autoTrigger && autoResponse && normalizeAutoText(content) === autoTrigger) {
            await message.channel.send({ content: autoResponse, allowedMentions: { repliedUser: false } }).catch(() => {});
            return;
        }
        const ctx = {
            guildId: message.guild.id,
            member: message.member,
            args: [],
            reply: async (payload) => {
                if (typeof payload === "string") {
                    return message.channel.send({ content: payload, allowedMentions: { repliedUser: false } });
                }
                if (payload && typeof payload === "object") {
                    return message.channel.send({ ...payload, allowedMentions: { repliedUser: false } });
                }
                return message.channel.send({ content: String(payload), allowedMentions: { repliedUser: false } });
            },
            author: message.author,
            channel: message.channel,
            channelId: message.channel.id,
            guild: message.guild,
            user: message.author,
            userId: message.author.id,
            message: message
        };
        if (message.guild?.id && message.channel?.id && client.lastCommandChannel) {
            client.lastCommandChannel.set(message.guild.id, message.channel.id);
        }
        await coreAi.runChat(client, ctx, autoMessage);
        return;
    }

    let args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    if (["aimod", "modai", "mod"].includes(commandName)) {
        const input = args.join(" ").trim();
        if (!input) {
            await message.reply("Provide a moderation request.");
            return;
        }
        const ctx = {
            guildId: message.guild.id,
            member: message.member,
            args: args,
            reply: async (content) => {
                try {
                    const sent = await message.reply(content);
                    return sent;
                } catch (_) {
                    const sent = await message.channel.send(content);
                    return sent;
                }
            },
            author: message.author,
            channel: message.channel,
            channelId: message.channel.id,
            guild: message.guild,
            user: message.author,
            userId: message.author.id,
            message: message
        };
        if (message.guild?.id && message.channel?.id && client.lastCommandChannel) {
            client.lastCommandChannel.set(message.guild.id, message.channel.id);
        }
        await handleAiModeration(client, ctx, input);
        return;
    }
    const aliasEntry = client.aliases.get(commandName);
    const resolvedName = typeof aliasEntry === "string" ? aliasEntry : aliasEntry?.name;
    if (aliasEntry && typeof aliasEntry === "object" && Array.isArray(aliasEntry.args)) {
        args = aliasEntry.args.concat(args);
    }

    const command = client.commands.get(commandName) || 
                    client.commands.get(resolvedName);

    if (!command) return;

    let replied = false;
    try {
        const ctx = {
            guildId: message.guild.id,
            member: message.member,
            args: args,
            reply: async (content) => {
                try {
                    const sent = await message.reply(content);
                    replied = true;
                    return sent;
                } catch (_) {
                    const sent = await message.channel.send(content);
                    replied = true;
                    return sent;
                }
            },
            author: message.author,
            channel: message.channel,
            channelId: message.channel.id,
            guild: message.guild,
            user: message.author,
            userId: message.author.id,
            message: message
        };
        if (message.guild?.id && message.channel?.id && client.lastCommandChannel) {
            client.lastCommandChannel.set(message.guild.id, message.channel.id);
        }
        await command.execute(client, ctx);
    } catch (error) {
        console.error(error);
        if (!replied) message.reply('There was an error executing that command!');
    }
  }
};
