/** @author Jaymar Xedd */

const logger = require("./logger");

/**
 * @typedef {Object} ConfigSchema
 * @property {string} key
 * @property {string} type
 * @property {boolean} required
 * @property {any} [defaultValue]
 */

const schema = [
  { key: "prefix",           type: "string",  required: true                  },
  { key: "admins",           type: "array",   required: true,  defaultValue: [] },
  { key: "botName",          type: "string",  required: false, defaultValue: "Messenger Bot" },
  { key: "language",         type: "string",  required: false, defaultValue: "en" },
  { key: "selfListen",       type: "boolean", required: false, defaultValue: false },
  { key: "threadBlacklist",  type: "array",   required: false, defaultValue: [] },
  { key: "permissionGroups", type: "object",  required: false, defaultValue: {} },
  { key: "autoReply",        type: "array",   required: false, defaultValue: [] }
];

/**
 * @param {Object} config
 * @returns {Object}
 */
function validateConfig(config) {
  let valid = true;

  schema.forEach(function (rule) {
    const value = config[rule.key];
    const missing = value === undefined || value === null;

    if (missing && rule.required) {
      logger.error("CONFIG", "Missing required field: " + rule.key);
      valid = false;
      return;
    }

    if (missing && !rule.required) {
      config[rule.key] = rule.defaultValue;
      logger.warn("CONFIG", "Field \"" + rule.key + "\" not set, using default: " + JSON.stringify(rule.defaultValue));
      return;
    }

    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== rule.type) {
      logger.error("CONFIG", "Field \"" + rule.key + "\" must be " + rule.type + ", got " + actualType);
      valid = false;
    }
  });

  if (!valid) {
    logger.error("CONFIG", "config.json validation failed. Fix the errors above and restart.");
    process.exit(1);
  }

  logger.success("CONFIG", "config.json is valid.");
  return config;
}

module.exports = validateConfig;
