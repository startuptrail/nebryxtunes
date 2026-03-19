const { SlashCommandBuilder } = require("discord.js");
const core = require("../core/dj");
const data = new SlashCommandBuilder().setName("dj").setDescription("DJ").addSubcommand(s => s.setName("set").setDescription("Set role").addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true))).addSubcommand(s => s.setName("remove").setDescription("Remove"));
module.exports = { data, execute: async (c, ctx) => { ctx.args = [ctx.interaction?.options?.getSubcommand?.() || ""]; if (ctx.interaction?.options?.getRole) ctx.options.role = ctx.interaction.options.getRole("role")?.id; return core.run(c, ctx); } };
