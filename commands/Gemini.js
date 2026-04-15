
const axios = require("axios");

// مفتاح Gemini بصيغة AQ (الخاص بك)
const GEMINI_API_KEY = "AQ.Ab8RN6I3RgZ9TGWPvGFktaTFB4e4lsmuwyrOX6PnwkCJKX_xTQ";

module.exports = {
  name: "gemini",
  aliases: ["ai2", "جيمني"],
  author: "أنت",
  category: "ai",
  cooldowns: 5,
  description: "Gemini AI - محاولة إصلاح مشكلة المصادقة",
  usage: "/gemini <سؤالك>",
  role: 0,
  async onCall(api, event, args) {
    const question = args.join(" ");
    
    if (!question) {
      return api.sendMessage("📝 مثال: /gemini اشرح الذكاء الاصطناعي", event.threadID);
    }

    api.sendMessage("🔄 جارٍ الاتصال بـ Gemini...", event.threadID, async (err, msgInfo) => {
      try {
        // محاولة 1: استخدام API endpoint مختلف
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`;
        
        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: question
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800
          }
        };

        // تجربة طريقة مصادقة مختلفة
        const response = await axios({
          method: "post",
          url: url,
          params: {
            key: GEMINI_API_KEY  // استخدام query parameter بدلاً من header
          },
          data: requestBody,
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 20000
        });

        const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!reply) {
          throw new Error("لم يتم العثور على رد من Gemini");
        }

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
        console.error("Gemini Error Details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        let errorMessage = "❌ فشل الاتصال بـ Gemini.\n\n";
        
        if (error.response?.status === 401) {
          errorMessage += "🔑 مفتاح API غير صالح أو منتهي الصلاحية.\n";
          errorMessage += "📌 الحل: احصل على مفتاح جديد من:\n";
          errorMessage += "https://aistudio.google.com/app/apikey\n\n";
          errorMessage += "💡 نصيحة: استخدم /deepseek بدلاً من ذلك (يعمل حالياً)";
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
