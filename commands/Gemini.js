const axios = require("axios");

// مفتاح API (بنفس صيغتك)
const GEMINI_API_KEY = "AQ.Ab8RN6I3RgZ9TGWPvGFktaTFB4e4lsmuwyrOX6PnwkCJKX_xTQ";

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
        let requestBody;

        if (imageUrl) {
          // تحميل الصورة وتحويلها إلى base64
          const imageResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const base64Image = Buffer.from(imageResp.data).toString("base64");
          const mimeType = imageResp.headers["content-type"];

          // بناء الطلب مع الصورة (نفس صيغة curl ولكن مع inlineData)
          requestBody = {
            contents: [
              {
                parts: [
                  { text: question || "ماذا ترى في هذه الصورة؟ صفها بالتفصيل." },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          };
        } else {
          // طلب نص فقط (نفس صيغة curl بالضبط)
          requestBody = {
            contents: [
              {
                parts: [
                  {
                    text: question || "مرحباً، كيف يمكنني مساعدتك؟"
                  }
                ]
              }
            ]
          };
        }

        // نفس طريقة curl بالضبط
        const response = await axios.post(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": GEMINI_API_KEY
            }
          }
        );

        // استخراج النص من الرد
        const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ لا يوجد رد من Gemini";

        // حذف رسالة "جارٍ التحليل"
        if (msgInfo) api.unsendMessage(msgInfo.messageID);

        // تقسيم الرد إذا كان طويلاً
        if (reply.length > 2000) {
          const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
          for (const chunk of chunks) {
            await api.sendMessage(chunk, event.threadID);
          }
        } else {
          api.sendMessage(reply, event.threadID);
        }

      } catch (error) {
        console.error("Gemini error:", error.response?.data || error.message);
        
        let errorMsg = "❌ حدث خطأ: ";
        if (error.response?.data?.error?.message) {
          errorMsg += error.response.data.error.message;
        } else {
          errorMsg += error.message || "غير معروف";
        }
        
        api.sendMessage(errorMsg, event.threadID);
        if (msgInfo) api.unsendMessage(msgInfo.messageID);
      }
    });
  }
};
