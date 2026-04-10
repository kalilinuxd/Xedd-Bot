/** @author Jaymar Xedd */

const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "../logs");

const logFile = path.join(logDir, "bot.log");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const R = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

const LEVELS = {
  INFO:  "\x1b[36m",
  WARN:  "\x1b[33m",
  ERROR: "\x1b[31m",
  OK:    "\x1b[32m",
};

/**
 * @returns {string}
 */
function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

/**
 * @param {string} raw
 * @returns {void}
 */
function write(raw) {
  fs.appendFileSync(logFile, raw + "\n", "utf8");
}

/**
 * @param {string} level
 * @param {string} tag
 * @param {...any} args
 * @returns {void}
 */
function log(level, tag, ...args) {
  const message = args.map(function (a) {
    return typeof a === "object" ? JSON.stringify(a) : String(a);
  }).join(" ");

  const color = LEVELS[level] || LEVELS.INFO;
  const ts  = DIM + timestamp() + R;
  const lvl = BOLD + color + level.padEnd(5) + R;
  const tg  = "\x1b[35m" + "[" + tag + "]" + R;

  console.log(ts + "  " + lvl + "  " + tg + "  " + message);

  write("[" + timestamp() + "] [" + level + "] [" + tag + "] " + message);
}

const logger = {
  info(tag, ...args)    { log("INFO",  tag, ...args); },
  warn(tag, ...args)    { log("WARN",  tag, ...args); },
  error(tag, ...args)   { log("ERROR", tag, ...args); },
  success(tag, ...args) { log("OK",    tag, ...args); },
  banner() {
    console.log("\x1b[35m\x1b[1m  JX-Bot\x1b[0m\x1b[2m  │  Facebook Bot Messenger\x1b[0m");
    console.log("\x1b[2m  ─────────────────────────────\x1b[0m");
  },
};

module.exports = logger;
