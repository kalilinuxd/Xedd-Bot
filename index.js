/** @author Jaymar Xedd */

const login = require("./fca");
const fs = require("fs");
const path = require("path");

const logger = require("./utils/logger");
const validateConfig = require("./utils/validateConfig");
const { checkCooldown } = require("./utils/cooldown");
const { hasPermission } = require("./utils/permissions");
const { applyProtection, startAppstateSaver } = require("./utils/protection");
const state = require("./utils/state");

require("./web/server");

logger.banner();

const appstatePath = "./appstate.json";
const configPath = "./config.json";

if (!fs.existsSync(appstatePath)) {
  logger.error("BOOT", "appstate.json not found. Please provide your Facebook appstate.");
  process.exit(1);
}

if (!fs.existsSync(configPath)) {
  logger.error("BOOT", "config.json not found.");
  process.exit(1);
}

const appstate = JSON.parse(fs.readFileSync(appstatePath, "utf8"));
const config = validateConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));

state.config = config;
state.prefix = typeof config.prefix === "string" ? config.prefix : "/";

const commandsDir = path.join(__dirname, "commands");
const eventsDir = path.join(__dirname, "events");

if (fs.existsSync(eventsDir)) {
  fs.readdirSync(eventsDir).forEach(function (file) {
    if (!file.endsWith(".js")) return;
    const handler = require(path.join(eventsDir, file));
    state.events.push(handler);
    logger.success("LOADER", "[EVENT] " + handler.name);
  });
}

fs.readdirSync(commandsDir).forEach(function (file) {
  if (!file.endsWith(".js")) return;

  const command = require(path.join(commandsDir, file));
  const map = command.noPrefix ? state.noPrefixCommands : state.prefixCommands;

  map.set(command.name.toLowerCase(), command);

  if (Array.isArray(command.aliases)) {
    command.aliases.forEach(function (alias) {
      map.set(alias.toLowerCase(), command);
    });
  }

  logger.success(
    "LOADER",
    "[" + (command.noPrefix ? "NO PREFIX" : "PREFIX") + "] " + command.name +
    (command.aliases && command.aliases.length ? " | Aliases: " + command.aliases.join(", ") : "") +
    (command.permissions ? " | Perm: " + command.permissions : "")
  );
});

/**
 * @param {any} api
 * @param {any} event
 * @param {Object} command
 * @param {string[]} args
 */
function runCommand(api, event, command, args) {
  if (!hasPermission(config, command.role, command.permissions || null, event.senderID)) {
    api.sendMessage("You don't have permission to use this command.", event.threadID, event.messageID);
    return;
  }

  const wait = checkCooldown(command.name, event.senderID, command.cooldowns || 1);
  if (wait > 0) {
    api.sendMessage("Please wait " + wait + "s before using " + (command.noPrefix ? "" : state.prefix) + command.name + " again.", event.threadID, event.messageID);
    return;
  }

  Promise.resolve(command.onCall(api, event, args)).catch(function (e) {
    logger.error("COMMAND", command.name + " | " + e.message);
    api.sendMessage("[ERROR] " + e.message, event.threadID, event.messageID);
  });
}

/**
 * @param {any} api
 * @param {any} event
 */
function runEvents(api, event) {
  state.events.forEach(function (handler) {
    if (typeof handler.onEvent !== "function") return;
    Promise.resolve(handler.onEvent(api, event, config)).catch(function (e) {
      logger.error("EVENT", handler.name + " | " + e.message);
    });
  });
}

login({ appState: appstate }, function (err, api) {
  if (err) {
    logger.error("LOGIN", err.error || err.message || String(err));
    state.online = false;
    return;
  }

  state.online = true;
  logger.success("BOT", "Logged in successfully as " + (config.botName || "Bot"));

  fs.writeFileSync(appstatePath, JSON.stringify(api.getAppState(), null, 2));

  const botID = api.getCurrentUserID();

  applyProtection(api);
  startAppstateSaver(api, appstatePath);

  api.setOptions({ listenEvents: true, selfListen: true });

  const handledMessages = new Set();

  api.listenMqtt(function (err, event) {
    if (err) {
      logger.error("LISTEN", err.message || String(err));
      state.online = false;
      return;
    }

    /** @type {string[]} */
    const blacklist = Array.isArray(config.threadBlacklist) ? config.threadBlacklist.map(String) : [];
    if (event.threadID && blacklist.includes(String(event.threadID))) return;

    runEvents(api, event);

    if (event.type !== "message" && event.type !== "message_reply") return;
    if (String(event.senderID) === String(botID)) return;

    if (event.messageID) {
      if (handledMessages.has(event.messageID)) return;
      handledMessages.add(event.messageID);
      if (handledMessages.size > 500) {
        const first = handledMessages.values().next().value;
        handledMessages.delete(first);
      }
    }

    const body = event.body ? event.body.trim() : "";
    if (!body) return;

    if (body.startsWith(state.prefix)) {
      const afterPrefix = body.slice(state.prefix.length).trim();

      if (!afterPrefix) {
        api.sendMessage(`Yes, that's my prefix, type ${state.prefix}help to see all commands`, event.threadID, event.messageID);
        return;
      }

      const args = afterPrefix.split(/\s+/);
      const commandName = args.shift().toLowerCase();
      if (!state.prefixCommands.has(commandName)) {
        if (state.noPrefixCommands.has(commandName)) {
          api.sendMessage(`This ${commandName} doesn't need a prefix.`, event.threadID, event.messageID);
        } else {
          api.sendMessage(`Invalid command please type ${state.prefix}help to see available commands`, event.threadID, event.messageID);
        }
        return;
      }
      runCommand(api, event, state.prefixCommands.get(commandName), args);
      return;
    }

    const args = body.trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (!state.noPrefixCommands.has(commandName)) {
      if (state.prefixCommands.has(commandName)) {
        api.sendMessage(`This ${commandName} need a prefix.`, event.threadID, event.messageID);
      }
      return;
    }
    runCommand(api, event, state.noPrefixCommands.get(commandName), args);
  });
});
