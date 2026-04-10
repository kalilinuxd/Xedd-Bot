/** @author Jaymar Xedd */

/**
 * @typedef {Object} BotState
 * @property {number} startTime
 * @property {string} prefix
 * @property {Object|null} config
 * @property {boolean} online
 * @property {Map<string, Object>} prefixCommands
 * @property {Map<string, Object>} noPrefixCommands
 * @property {Array<Object>} events
 */

const state = {
  startTime: Date.now(),
  prefix: "/", /** @Default prefix @You can change it, okay? */
  config: null,
  online: false,
  prefixCommands: new Map(),
  noPrefixCommands: new Map(),
  events: []
};

module.exports = state;
