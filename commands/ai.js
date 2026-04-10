const AI_API = "https://resstt-apii.leapcell.app/api/ai/deepaichat";

module.exports = {
  name: "ai",
  aliases: ["ask", "chat", "gpt"],
  author: "Jaymar",
  category: "ai",
  cooldowns: 5,
  description: "Ask the AI a question",
  usage: "/ai <question>",
  role: 0,
  permissions: null,
  noPrefix: true,
  async onCall(api, event, args) {
    if (!args.length) {
      api.sendMessage("Usage: " + this.usage, event.threadID, event.messageID);
      return;
    }

    const question = args.join(" ");

    api.sendMessage("⏳ Searching...", event.threadID, event.messageID);

    try {
      const url = AI_API + "?message=" + encodeURIComponent(question) + "&model=standard";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) throw new Error("AI service error: " + res.status);

      const data = await res.json();
      const reply = (data && (data.data || data.response || data.result || data.answer)) || "No response.";

      api.sendMessage(reply, event.threadID, event.messageID);
    } catch (e) {
      const errMsg = e.name === "AbortError" ? "❌ Request timed out. Please try again." : "❌ Failed to reach AI: " + e.message;
      api.sendMessage(errMsg, event.threadID, event.messageID);
    }
  }
};
