/** @author Jaymar Xedd */


const logger = require("../utils/logger");

/** @type {{ name: string, onEvent: Function }} */
module.exports = {
  name: "Welcome",
  /**
   * @param {any} api
   * @param {any} event
   */
  onEvent(api, event) {
    if (event.type !== "event") return;
    if (event.logMessageType !== "log:subscribe") return;

    const added = event.logMessageData && event.logMessageData.addedParticipants;
    if (!Array.isArray(added)) return;

    const botID = api.getCurrentUserID();

    added.forEach(function (user) {
      const userID = user.userFbId || user.id || user.userID;
      if (String(userID) === String(botID)) return;

      const name = user.fullName || "there";
      logger.info("Welcome", "New member joined: " + name);
      api.sendMessage("Welcome, " + name + "! 👋 Type /help to see available commands.", event.threadID);
    });
  }
};
