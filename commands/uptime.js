const state = require("../utils/state");

module.exports = {
  name: "uptime",
  aliases: ["up", "runtime"],
  author: "Jaymar",
  category: "utility",
  cooldowns: 5,
  description: "Shows how long the bot has been running",
  usage: "/uptime",
  role: 0,
  permissions: null,
  noPrefix: false,
  async onCall(api, event, args) {
    const ms = Date.now() - state.startTime;

    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(days + "d");
    if (hours > 0) parts.push(hours + "h");
    if (minutes > 0) parts.push(minutes + "m");
    parts.push(seconds + "s");

    api.sendMessage("Bot uptime: " + parts.join(" "), event.threadID, event.messageID);
  }
};
