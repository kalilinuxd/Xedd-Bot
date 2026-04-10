module.exports = {
  name: "hi",
  aliases: ["hello", "hey"],
  author: "Jaymar",
  category: "noprefix",
  cooldowns: 5,
  description: "Greets the user without needing a prefix",
  usage: "hi",
  role: 0,
  permissions: null,
  noPrefix: true,
  async onCall(api, event, args) {
    api.sendMessage("Hello! Type /help to see all available commands.", event.threadID, event.messageID);
  }
};
