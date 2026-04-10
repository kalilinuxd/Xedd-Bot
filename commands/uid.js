module.exports = {
  name: "uid",
  aliases: ["id", "myid"],
  author: "Jaymar",
  category: "utility",
  cooldowns: 5,
  description: "Shows your UID or the UID of a mentioned user",
  usage: "/uid [@mention]",
  role: 0,
  permissions: null,
  noPrefix: false,
  async onCall(api, event, args) {
    const mentions = event.mentions && Object.keys(event.mentions);

    if (mentions && mentions.length > 0) {
      let message = "User IDs:\n";
      mentions.forEach(function (uid) {
        message += "\n" + event.mentions[uid] + ": " + uid;
      });
      api.sendMessage(message, event.threadID, event.messageID);
      return;
    }

    api.sendMessage("Your UID: " + event.senderID, event.threadID, event.messageID);
  }
};
