const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// ⚠️ مفتاح API (غير آمن للتشارك أو الرفع على GitHub)
const GEMINI_API_KEY = "AQ.Ab8RN6J_l0NiM2jYR53yDLZM7aYJSnmsHQSIIkH1ZRPK8qm1jQ";

module.exports = {
  name: "gemini",
  aliases: ["ai", "ask"],
  author: "أنت",
  category: "ai",
  cooldowns: 5,
  description: "اسأل Gemini AI مع دعم تحليل الصور",
  usage: "/gemini <سؤالك> (أرسل صورة أو رد على صورة أو رابط صورة)",
  role: 0,
  async onCall(api, event, args) {
    if (!GEMINI_API_KEY) {
      return api.sendMessage("❌ مفتاح Gemini غير موجود في الكود", event.threadID);
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const question = args.join(" ");

    if (!question && !event.attachments?.length && !event.messageReply) {
      return api.sendMessage("📝 الرجاء كتابة سؤال أو إرفاق صورة أو الرد على صورة", event.threadID);
    }

    // استخراج رابط الصورة من المرفقات أو النص أو الرد
    let imageUrl = null;
    if (event.attachments?.[0]?.type === "photo" && event.attachments[0].url) {
      imageUrl = event.attachments[0].url;
    } else if (event.attachments?.[0]?.type === "sticker") {
      imageUrl = event.attachments[0].url;
    } else if (question) {
      const match = question.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|webp|gif))/i);
      if (match) imageUrl = match[0];
    } else if (event.messageReply?.attachments?.[0]?.url) {
      imageUrl = event.messageReply.attachments[0].url;
    }

    api.sendMessage("🤖 جارٍ تحليل طلبك مع Gemini...", event.threadID, async (err, msgInfo) => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        let parts = [];

        if (imageUrl) {
          const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const base64 = Buffer.from(imgRes.data).toString("base64");
          parts = [
            { text: question || "ماذا ترى في هذه الصورة؟ صفها بالتفصيل." },
            { inlineData: { mimeType: imgRes.headers["content-type"], data: base64 } }
          ];
        } else {
          parts = [{ text: question || "مرحباً، كيف يمكنني مساعدتك؟" }];
        }

        const result = await model.generateContent({ contents: [{ role: "user", parts }] });
        const reply = result.response.text();

        if (reply.length > 2000) {
          const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
          for (const chunk of chunks) await api.sendMessage(chunk, event.threadID);
        } else {
          api.sendMessage(reply, event.threadID);
        }
        if (msgInfo) api.unsendMessage(msgInfo.messageID);
      } catch (error) {
        console.error(error);
        api.sendMessage("❌ خطأ: " + (error.message || "غير معروف"), event.threadID);
        if (msgInfo) api.unsendMessage(msgInfo.messageID);
      }
    });
  }
};
