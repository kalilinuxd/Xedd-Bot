const axios = require("axios");

// مفتاح DeepSeek API
const DEEPSEEK_API_KEY = "sk-81b08cd086084e4489b7ecb5061eaf4c";

module.exports = {
  name: "deepseek",
  aliases: ["ds", "ai", "اسال"],
  author: "أنت",
  category: "ai",
  cooldowns: 3,
  description: "اسأل DeepSeek AI - ذكاء اصطناعي قوي ومجاني",
  usage: "/deepseek <سؤالك>",
  role: 0,
  async onCall(api, event, args) {
    const question = args.join(" ");
    
    if (!question) {
      return api.sendMessage("📝 مثال: /deepseek ما هي عاصمة مصر؟", event.threadID);
    }

    api.sendMessage("🤖 جارٍ التفكير...", event.threadID, async (err, msgInfo) => {
      try {
        const response = await axios.post(
          "https://api.deepseek.com/v1/chat/completions",
          {
            model: "deepseek-chat",
            messages: [
              {
                role: "user",
                content: question
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
            },
            timeout: 30000
          }
        );

        let reply = response.data.choices[0]?.message?.content || "⚠️ عذراً، لم أتمكن من الإجابة.";
        
        // حذف رسالة "جارٍ التفكير"
        if (msgInfo) await api.unsendMessage(msgInfo.messageID);
        
        // تقسيم الرد إذا كان طويلاً
        if (reply.length > 2000) {
          const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
          for (const chunk of chunks) {
            await api.sendMessage(chunk, event.threadID);
          }
        } else {
          await api.sendMessage(reply, event.threadID);
        }
        
      } catch (error) {
        console.error("DeepSeek Error:", error.response?.data || error.message);
        
        let errorMsg = "❌ خطأ: ";
        if (error.response?.data?.error?.message) {
          errorMsg += error.response.data.error.message;
        } else if (error.code === "ECONNABORTED") {
          errorMsg += "انتهى وقت الاتصال، حاول مرة أخرى.";
        } else {
          errorMsg += error.message || "حدث خطأ غير متوقع";
        }
        
        await api.sendMessage(errorMsg, event.threadID);
        if (msgInfo) await api.unsendMessage(msgInfo.messageID);
      }
    });
  }
};
