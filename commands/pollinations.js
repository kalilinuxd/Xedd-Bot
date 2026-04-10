const https = require("https");
const http = require("http");
const { Readable } = require("stream");

function fetchBuffer(url, redirects) {
  redirects = redirects === undefined ? 5 : redirects;
  return new Promise(function (resolve, reject) {
    const client = url.startsWith("https") ? https : http;
    client.get(url, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirects === 0) return reject(new Error("Too many redirects"));
        fetchBuffer(res.headers.location, redirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }
      const chunks = [];
      res.on("data", function (chunk) { chunks.push(chunk); });
      res.on("end", function () { resolve(Buffer.concat(chunks)); });
      res.on("error", reject);
    }).on("error", reject);
  });
}

module.exports = {
  name: "pollinations",
  aliases: ["imagine", "imggen", "generate"],
  author: "Jaymar",
  category: "media",
  cooldowns: 10,
  description: "Generate an image using Pollinations AI",
  usage: "/pollinations <prompt>",
  role: 0,
  permissions: null,
  noPrefix: false,
  async onCall(api, event, args) {
    if (!args.length) {
      api.sendMessage("Usage: " + this.usage, event.threadID, event.messageID);
      return;
    }

    const prompt = args.join(" ");

    api.sendMessage("🎨 Generating image...", event.threadID, event.messageID);

    const seed = Math.floor(Math.random() * 999999);
    const imageUrl =
      "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) +
      "?width=512&height=512&nologo=true&seed=" + seed;

    let buffer;
    try {
      buffer = await fetchBuffer(imageUrl);
    } catch (e) {
      try {
        buffer = await fetchBuffer(imageUrl);
      } catch (e2) {
        api.sendMessage("❌ Failed to generate image: " + e2.message, event.threadID, event.messageID);
        return;
      }
    }

    try {
      const stream = Readable.from(buffer);
      stream.path = "image.jpg";

      api.sendMessage(
        {
          body: "✨ " + prompt,
          attachment: stream,
        },
        event.threadID,
        event.messageID
      );
    } catch (e) {
      api.sendMessage("❌ Failed to send image: " + e.message, event.threadID, event.messageID);
    }
  }
};
