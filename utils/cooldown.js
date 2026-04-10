/** @author Jaymar Xedd */

/**
 * @type {Map<string, number>}
 */
const cooldownMap = new Map();

const CLEANUP_INTERVAL_MS = 60 * 1000;

setInterval(function () {
  const now = Date.now();
  cooldownMap.forEach(function (expiry, key) {
    if (now >= expiry) {
      cooldownMap.delete(key);
    }
  });
}, CLEANUP_INTERVAL_MS);

/**
 * @param {string} commandName
 * @param {string} senderID
 * @param {number} seconds
 * @returns {number}
 */
function checkCooldown(commandName, senderID, seconds) {
  const key = commandName + "_" + senderID;
  const now = Date.now();

  if (cooldownMap.has(key)) {
    const expiry = cooldownMap.get(key);
    if (now < expiry) {
      return Math.ceil((expiry - now) / 1000);
    }
  }

  cooldownMap.set(key, now + seconds * 1000);
  return 0;
}

module.exports = { checkCooldown };
