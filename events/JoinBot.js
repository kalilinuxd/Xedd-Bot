/** @author Jaymar Xedd */

const state = require("../utils/state");
const logger = require("../utils/logger");

module.exports = {
  name: "JoinBot",
  async onEvent(api, event) {
    if (event.type !== "event") return;
    if (event.logMessageType !== "log:subscribe") return;

    const added = event.logMessageData && event.logMessageData.addedParticipants;
    if (!Array.isArray(added)) return;

    const botID = api.getCurrentUserID();
    const wasAdded = added.some(user => user.userFbId && user.userFbId.toString() === botID.toString());
    if (!wasAdded) return;

    logger.info("JoinBot", "Bot was added to thread: " + event.threadID);

    const prefix = state.prefix;
    const config = state.config || {};
    const botName = config.botName || "Xedd Bot";

    const message = [
      `👋 Thank you for adding me to this group!`,
      ``,
      `📌 Bot Info`,
      `• Name: ${botName}`,
      `• Prefix: ${prefix}`,
      `• Bot UID: ${botID}`,
      `• Thread ID: ${event.threadID}`,
      ``,
      `Type ${prefix}help to see all available commands.`
    ].join("\n");

    api.sendMessage(message, event.threadID);
  }
};
