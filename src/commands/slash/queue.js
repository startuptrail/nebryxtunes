const { SlashCommandBuilder } = require("discord.js");
const coreQueue = require("../core/queue");
const coreQueueClear = require("../core/queueClear");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show or clear the queue")
    .addSubcommand(s => s.setName("show").setDescription("Show queue").addIntegerOption(o => o.setName("page").setDescription("Page number")))
    .addSubcommand(s => s.setName("clear").setDescription("Clear the queue")),
  execute: async (client, context) => {
    const sub = context.interaction?.options?.getSubcommand?.();
    if (sub === "clear") return coreQueueClear.run(client, context);
    context.args = [context.options?.page || "1"];
    return coreQueue.run(client, context);
  }
};
