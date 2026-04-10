const fs = require("fs");
const path = require("path");
const state = require("../utils/state");

module.exports = {
  name: "prefix",
  aliases: ["setprefix", "changeprefix"],
  author: "Jaymar",
  category: "admin",
  cooldowns: 5,
  description: "Changes the bot command prefix (admin only)",
  usage: "/prefix <new_prefix>",
  role: 1,
  permissions: null,
  noPrefix: false,
  async onCall(api, event, args) {
    if (!args.length) {
      api.sendMessage("Current prefix: " + state.prefix + "\nUsage: " + this.usage, event.threadID, event.messageID);
      return;
    }

    const newPrefix = args[0];

    if (newPrefix.length > 5) {
      api.sendMessage("Prefix must be 5 characters or fewer.", event.threadID, event.messageID);
      return;
    }

    state.prefix = newPrefix;

    if (state.config) {
      state.config.prefix = newPrefix;
      const configPath = path.join(__dirname, "../config.json");
      fs.writeFileSync(configPath, JSON.stringify(state.config, null, 2));
    }

    api.sendMessage("Prefix changed to: " + newPrefix, event.threadID, event.messageID);
  }
};
