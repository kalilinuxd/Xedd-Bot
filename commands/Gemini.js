const axios = require("axios");

// مفتاح Gemini بصيغة AQ
const GEMINI_API_KEY = "AQ.Ab8RN6I3RgZ9TGWPvGFktaTFB4e4lsmuwyrOX6PnwkCJKX_xTQ";

module.exports = {
  name: "gemini",
  aliases: ["ai2", "جيمني", "vision"],
  author: "أنت",
  category: "ai",
  cooldowns: 5,
  description: "Gemini AI مع دعم تحليل الصور",
  usage: "/gemini <سؤالك> (أرسل صورة أو رد على صورة)",
  role: 0,
  async onCall(api, event, args) {
    const question = args.join(" ");
    
    // التحقق من وجود صورة أو سؤال
    const hasImage = event.attachments?.some(att => att.type === "photo") || 
                     event.messageReply?.attachments?.some(att => att.type === "photo");
    
    if (!question && !hasImage) {
      return api.sendMessage("📝 أرسل صورة مع سؤال مثل: /gemini ما هذه الصورة؟", event.threadID);
    }

    api.sendMessage("🖼️ جارٍ تحليل الصورة والإجابة...", event.threadID, async (err, msgInfo) => {
      try {
        // الحصول على رابط الصورة
        let imageUrl = null;
        let imageBase64 = null;
        
        if (event.attachments?.some(att => att.type === "photo")) {
          const photo = event.attachments.find(att => att.type === "photo");
          imageUrl = photo.url;
        } else if (event.messageReply?.attachments?.some(att => att.type === "photo")) {
          const photo = event.messageReply.attachments.find(att => att.type === "photo");
          imageUrl = photo.url;
        }
        
        // تحويل الصورة إلى Base64 إذا وجدت
        if (imageUrl) {
          const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
          imageBase64 = Buffer.from(imageResponse.data).toString("base64");
        }
        
        // بناء الطلب
        let requestBody = {
          contents: [
            {
              parts: []
            }
          ]
        };
        
        // إضافة النص
        if (question) {
          requestBody.contents[0].parts.push({ text: question });
        } else {
          requestBody.contents[0].parts.push({ text: "ماذا ترى في هذه الصورة؟ صفها بالتفصيل بالعربية" });
        }
        
        // إضافة الصورة إذا وجدت
        if (imageBase64) {
          requestBody.contents[0].parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          });
        }
        
        // محاولة endpoints مختلفة
        const endpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`
        ];
        
        let response = null;
        let lastError = null;
        
        // تجربة كل endpoint
        for (const endpoint of endpoints) {
          try {
            response = await axios.post(endpoint, requestBody, {
              headers: { "Content-Type": "application/json" },
              timeout: 30000
            });
            if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
              break;
            }
          } catch (err) {
            lastError = err;
            continue;
          }
        }
        
        if (!response || !response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw lastError || new Error("لم يتم العثور على رد من Gemini");
        }
        
        const reply = response.data.candidates[0].content.parts[0].text;
        
        if (msgInfo) await api.unsendMessage(msgInfo.messageID);
        
        if (reply.length > 2000) {
          const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
          for (const chunk of chunks) {
            await api.sendMessage(chunk, event.threadID);
          }
        } else {
          await api.sendMessage(reply, event.threadID);
        }
        
      } catch (error) {
        console.error("Gemini Error:", error.response?.data || error.message);
        
        let errorMessage = "❌ فشل تحليل الصورة.\n\n";
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          errorMessage += "🔑 مفتاح API غير صالح.\n";
          errorMessage += "📌 احصل على مفتاح جديد من:\n";
          errorMessage += "https://aistudio.google.com/app/apikey\n\n";
          errorMessage += "💡 نصيحة: استخدم /deepseek بدلاً من ذلك";
        } else if (error.response?.data?.error?.message) {
          errorMessage += `📛 ${error.response.data.error.message}`;
        } else {
          errorMessage += `⚠️ ${error.message || "خطأ غير معروف"}`;
        }
        
        await api.sendMessage(errorMessage, event.threadID);
        if (msgInfo) await api.unsendMessage(msgInfo.messageID);
      }
    });
  }
};
