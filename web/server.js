/** @author Jaymar Xedd */

const express = require("express");
const fs = require("fs");
const path = require("path");
const state = require("../utils/state");

/** @type {express.Application} */
const app = express();

/** @type {number} */
const PORT = 5000;

/** @type {string} */
const logFile = path.join(__dirname, "../logs/bot.log");

app.use(express.static(path.join(__dirname, "public")));

/**
 * @param {number} ms
 * @returns {string}
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (days > 0) parts.push(days + "d");
  if (hours > 0) parts.push(hours + "h");
  if (minutes > 0) parts.push(minutes + "m");
  parts.push(seconds + "s");
  return parts.join(" ");
}

app.get("/api/status", function (req, res) {
  const ms = Date.now() - state.startTime;
  res.json({
    online: state.online,
    botName: state.config ? state.config.botName : "Bot",
    prefix: state.prefix,
    uptime: formatUptime(ms),
    uptimeMs: ms,
    commandCount: state.prefixCommands.size + state.noPrefixCommands.size,
    eventCount: state.events.length
  });
});

app.get("/api/commands", function (req, res) {
  /** @type {Object[]} */
  const list = [];
  const seen = new Set();

  state.prefixCommands.forEach(function (cmd) {
    if (!seen.has(cmd.name)) {
      seen.add(cmd.name);
      list.push({
        name: cmd.name,
        aliases: cmd.aliases || [],
        author: cmd.author || "",
        category: cmd.category || "",
        description: cmd.description || "",
        usage: cmd.usage || "",
        cooldowns: cmd.cooldowns || 1,
        role: cmd.role || 0,
        permissions: cmd.permissions || null,
        noPrefix: false
      });
    }
  });

  state.noPrefixCommands.forEach(function (cmd) {
    if (!seen.has(cmd.name)) {
      seen.add(cmd.name);
      list.push({
        name: cmd.name,
        aliases: cmd.aliases || [],
        author: cmd.author || "",
        category: cmd.category || "",
        description: cmd.description || "",
        usage: cmd.usage || "",
        cooldowns: cmd.cooldowns || 1,
        role: cmd.role || 0,
        permissions: cmd.permissions || null,
        noPrefix: true
      });
    }
  });

  res.json(list.sort(function (a, b) { return a.name.localeCompare(b.name); }));
});

app.get("/api/events", function (req, res) {
  res.json(state.events.map(function (e) { return { name: e.name }; }));
});

app.get("/api/logs", function (req, res) {
  if (!fs.existsSync(logFile)) {
    res.json({ lines: [] });
    return;
  }

  const content = fs.readFileSync(logFile, "utf8");
  const lines = content.trim().split("\n").filter(Boolean);
  const last = lines.slice(-100).reverse();
  res.json({ lines: last });
});

app.listen(PORT, function () {
  const logger = require("../utils/logger");
  logger.success("WEBVIEW", "Dashboard running on port " + PORT);
});

module.exports = app;
