// help command btw
/** @author: Jaymar Xedd  */

const fs = require("fs");
const path = require("path");

const CATEGORY_META = {
  ai:            { emoji: "🤖", label: "AI" },
  utility:       { emoji: "🔧", label: "UTILITY" },
  admin:         { emoji: "👑", label: "ADMIN" },
  noprefix:      { emoji: "📁", label: "QUICK" },
  fun:           { emoji: "🎉", label: "FUN" },
  media:         { emoji: "🖼", label: "MEDIA" },
  music:         { emoji: "🎧", label: "MUSIC" },
  education:     { emoji: "📖", label: "EDUCATION" },
  uncategorized: { emoji: "📦", label: "OTHERS" },
};

const SEP = "━━━━━━━━━━━━━━";
const BOX_TOP = "╭─╼━━━━━━━━╾─╮";
const BOX_BOT = "╰─━━━━━━━━━╾─╯";

module.exports = {
  name: "help",
  aliases: ["h", "cmds"],
  author: "Jaymar",
  category: "utility",
  cooldowns: 5,
  description: "Shows all available commands",
  usage: "help [command]",
  role: 0,
  permissions: null,
  noPrefix: false,
  async onCall(api, event, args) {
    const commandsDir = path.join(__dirname);
    const files = fs.readdirSync(commandsDir).filter(function (f) {
      return f.endsWith(".js");
    });

    if (args.length) {
      const target = args[0].toLowerCase();
      let found = null;

      files.forEach(function (file) {
        const cmd = require(path.join(commandsDir, file));
        if (cmd.name === target || (cmd.aliases && cmd.aliases.includes(target))) {
          found = cmd;
        }
      });

      if (!found) {
        api.sendMessage("Command \"" + target + "\" not found.", event.threadID, event.messageID);
        return;
      }

      const prefix = found.noPrefix ? "" : "/";
      const info =
        SEP + "\n" +
        "Command: " + prefix + found.name + "\n" +
        ":Aliases: " + (found.aliases && found.aliases.length ? found.aliases.join(", ") : "none") + "\n" +
        "Category: " + (found.category || "uncategorized") + "\n" +
        "Cooldown: " + found.cooldowns + "s\n" +
        "Permission: " + (found.permissions || "everyone") + "\n" +
        "Description: " + found.description + "\n" +
        "Usage: " + found.usage + "\n" +
        SEP;

      api.sendMessage(info, event.threadID, event.messageID);
      return;
    }

    const categories = {};

    files.forEach(function (file) {
      const cmd = require(path.join(commandsDir, file));
      const cat = (cmd.category || "uncategorized").toLowerCase();
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.name);
    });

    let message = SEP + "\nAvailable Commands\n";

    Object.keys(categories).forEach(function (cat) {
      const meta = CATEGORY_META[cat] || { emoji: "📦", label: cat };
      message += BOX_TOP + "\n";
      message += "│ " + meta.emoji + " | " + meta.label + "\n";
      categories[cat].forEach(function (name) {
        message += "│ - " + name + "\n";
      });
      message += BOX_BOT + "\n";
    });

    message += "help [name]\nto see command details.\n" + SEP;

    api.sendMessage(message, event.threadID, event.messageID);
  }
};
