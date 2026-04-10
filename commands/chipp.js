const CHIPP_API = "https://resstt-apii.leapcell.app/api/ai/chipp";
const logger = require("../utils/logger");

function findAttachment(event) {
  const attachments = event.attachments || [];
  for (const att of attachments) {
    if (att.type === "photo" || att.type === "animated_image") {
      return att;
    }
  }
  const replied = event.messageReply;
  if (replied) {
    for (const att of (replied.attachments || [])) {
      if (att.type === "photo" || att.type === "animated_image") {
        return att;
      }
    }
  }
  return null;
}

async function getPublicImageUrl(att) {
  const sourceUrl = att.largePreviewUrl || att.url || att.previewUrl || att.thumbnailUrl;
  if (!sourceUrl) return null;

  try {
    const imgRes = await fetch(sourceUrl);
    if (!imgRes.ok) throw new Error("HTTP " + imgRes.status);

    const buffer = await imgRes.arrayBuffer();
    const blob = new Blob([buffer], { type: imgRes.headers.get("content-type") || "image/jpeg" });
    const ext = (imgRes.headers.get("content-type") || "image/jpeg").includes("png") ? "png" : "jpg";

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("userhash", "");
    form.append("fileToUpload", blob, "image." + ext);

    const upload = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: form
    });

    if (!upload.ok) throw new Error("Upload failed: " + upload.status);

    const publicUrl = (await upload.text()).trim();
    if (!publicUrl.startsWith("http")) throw new Error("Invalid upload response: " + publicUrl);

    logger.info("CHIPP", "Uploaded to public URL: " + publicUrl);
    return publicUrl;
  } catch (e) {
    logger.warn("CHIPP", "Upload failed, using original URL: " + e.message);
    return sourceUrl;
  }
}

module.exports = {
  name: "chipp",
  aliases: ["describe", "seephoto", "vision"],
  author: "Jaymar",
  category: "ai",
  cooldowns: 10,
  description: "Describe or analyze a photo using Chipp AI",
  usage: "chipp [prompt] — send or reply to a photo",
  role: 0,
  permissions: null,
  noPrefix: true,
  async onCall(api, event, args) {
    const att = findAttachment(event);

    if (!att) {
      api.sendMessage(
        "📷 Please send a photo or reply to a photo for me to analyze.\nUsage: " + this.usage,
        event.threadID,
        event.messageID
      );
      return;
    }

    const prompt = args.length ? args.join(" ") : "Describe this photo";

    api.sendMessage("⏳ Analyzing image...", event.threadID, event.messageID);

    try {
      const photoUrl = await getPublicImageUrl(att);
      if (!photoUrl) throw new Error("Could not get photo URL.");

      const url = CHIPP_API + "?message=" + encodeURIComponent(prompt) + "&url=" + encodeURIComponent(photoUrl);
      logger.info("CHIPP", "Calling API: " + url);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) throw new Error("API error: " + res.status);

      const data = await res.json();
      logger.info("CHIPP", "API response: " + JSON.stringify(data));

      let reply = (typeof data.response === "string" && data.response.trim())
        || (typeof data.data === "string" && data.data.trim())
        || data.result || data.answer || data.text || data.message || null;

      if (!reply) reply = "Chipp AI could not describe this image. Try a clearer photo.";
      if (typeof reply === "object") reply = JSON.stringify(reply);

      api.sendMessage(reply, event.threadID, event.messageID);
    } catch (e) {
      logger.error("CHIPP", e.message);
      const errMsg = e.name === "AbortError"
        ? "❌ Request timed out. Please try again."
        : "❌ " + e.message;
      api.sendMessage(errMsg, event.threadID, event.messageID);
    }
  }
};
