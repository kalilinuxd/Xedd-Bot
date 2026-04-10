/** @author Jaymar Xedd */

const fs = require("fs");
const logger = require("./logger");

const SEND_DELAY_MIN = 1000;
const SEND_DELAY_MAX = 3000;
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW = 5 * 60 * 1000;
const APPSTATE_SAVE_INTERVAL = 30 * 60 * 1000;

const messageQueue = [];
let processing = false;

const messageTimestamps = [];

/**
 * Returns a random integer between min and max (inclusive) btw.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/**
 * @returns {boolean}
 */
function isRateLimited() {
  const now = Date.now();
  while (messageTimestamps.length && now - messageTimestamps[0] > RATE_LIMIT_WINDOW) {
    messageTimestamps.shift();
  }
  return messageTimestamps.length >= RATE_LIMIT_MAX;
}

/**
 * @returns {Promise<void>}
 */
async function processQueue() {
  if (processing) return;
  processing = true;

  while (messageQueue.length > 0) {
    if (isRateLimited()) {
      logger.warn("Protection", "Rate limit reached. Pausing message queue for 30s.");
      await sleep(30 * 1000);
      continue;
    }

    const task = messageQueue.shift();
    messageTimestamps.push(Date.now());

    try {
      await task();
    } catch (e) {
      logger.error("Protection", "Queue task error: " + e.message);
    }

    if (messageQueue.length > 0) {
      const delay = randomBetween(SEND_DELAY_MIN, SEND_DELAY_MAX);
      await sleep(delay);
    }
  }

  processing = false;
}

/**
 * Wraps api.sendMessage, api.editMessage, and api.unsendMessage
 * with a queue, random delays, typing indicator, and rate limiting.
 * @param {any} api
 * @returns {void}
 */
function applyProtection(api) {
  const originalSend = api.sendMessage.bind(api);
  const originalEdit = api.editMessage.bind(api);

  /**
   * @param {string|Object} message
   * @param {string} threadID
   * @param {Function} [callback]
   * @param {string} [messageID]
   * @returns {Promise<any>}
   */
  api.sendMessage = function (message, threadID, callback, messageID) {
    if (typeof callback === "string") {
      messageID = callback;
      callback = undefined;
    }
    return new Promise(function (resolve, reject) {
      messageQueue.push(async function () {
        try {
          try { await api.sendTypingIndicator(true, threadID); } catch (_) {}
          const typingDelay = randomBetween(500, 1500);
          await sleep(typingDelay);

          const result = await new Promise(function (res, rej) {
            originalSend(message, threadID, function (err, info) {
              if (err) return rej(err);
              res(info);
            }, messageID);
          });

          if (typeof callback === "function") callback(null, result);
          resolve(result);
        } catch (e) {
          if (typeof callback === "function") callback(e);
          reject(e);
        }
      });

      processQueue();
    });
  };

  /**
   * Queued editMessage with a small delay.
   * @param {string} text
   * @param {string} messageID
   * @param {Function} [callback]
   * @returns {Promise<void>}
   */
  api.editMessage = function (text, messageID, callback) {
    return new Promise(function (resolve, reject) {
      messageQueue.push(async function () {
        try {
          await sleep(randomBetween(500, 1200));
          await new Promise(function (res, rej) {
            originalEdit(text, messageID, function (err) {
              if (err) return rej(err);
              res();
            });
          });
          if (typeof callback === "function") callback(null);
          resolve();
        } catch (e) {
          if (typeof callback === "function") callback(e);
          reject(e);
        }
      });

      processQueue();
    });
  };

  logger.success("Protection", "Message queue and rate limiter active.");
}

/**
 * Starts auto-saving the appstate on a set interval.
 * @param {any} api
 * @param {string} appstatePath
 * @returns {void}
 */
function startAppstateSaver(api, appstatePath) {
  setInterval(function () {
    try {
      const state = api.getAppState();
      fs.writeFileSync(appstatePath, JSON.stringify(state, null, 2));
      logger.info("Protection", "Appstate auto-saved.");
    } catch (e) {
      logger.warn("Protection", "Failed to auto-save appstate: " + e.message);
    }
  }, APPSTATE_SAVE_INTERVAL);

  logger.success("Protection", "Appstate auto-saver started (every 30 min).");
}

module.exports = { applyProtection, startAppstateSaver };
