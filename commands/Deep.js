const axios = require("axios");
const fs = require("fs");
const path = require("path");

// مفتاح DeepSeek API
const DEEPSEEK_API_KEY = "sk-81b08cd086084e4489b7ecb5061eaf4c";

module.exports = {
  name: "deepseek",
  aliases: ["ds", "ai", "اسال"],
  author: "أنت",
  category: "ai",
  cooldowns: 3,
  description: "اسأل DeepSeek AI مع دعم تحليل الصور (يحول الصورة إلى نص أولاً)",
  usage: "/deepseek <سؤالك> (أرسل صورة أو رد على صورة)",
  role: 0,
  async onCall(api, event, args) {
    const question = args.join(" ");
    
    // التحقق من وجود صورة أو سؤال
    const hasImage = event.attachments?.some(att => att.type === "photo") || 
                     event.messageReply?.attachments?.some(att => att.type === "photo");
    
    if (!question && !hasImage) {
      return api.sendMessage("📝 مثال: /deepseek ما هذه الصورة؟ (مع إرفاق صورة)\nأو: /deepseek ما هي عاصمة مصر؟", event.threadID);
    }

    api.sendMessage("🤖 جارٍ تحليل الصورة والإجابة...", event.threadID, async (err, msgInfo) => {
      try {
        let finalQuestion = question || "ماذا ترى في هذه الصورة؟ صفها بالتفصيل.";
        let imageDescription = "";
        
        // معالجة الصورة إذا وجدت
        if (hasImage) {
          // الحصول على رابط الصورة
          let imageUrl = null;
          
          if (event.attachments?.some(att => att.type === "photo")) {
            const photo = event.attachments.find(att => att.type === "photo");
            imageUrl = photo.url;
          } else if (event.messageReply?.attachments?.some(att => att.type === "photo")) {
            const photo = event.messageReply.attachments.find(att => att.type === "photo");
            imageUrl = photo.url;
          }
          
          if (imageUrl) {
            api.sendMessage("📸 جارٍ تحميل وتحليل الصورة...", event.threadID);
            
            // تحميل الصورة وتحويلها إلى Base64
            const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
            const base64Image = Buffer.from(imageResponse.data).toString("base64");
            
            // استخدام خدمة مجانية لوصف الصورة (OCR + AI)
            try {
              // محاولة 1: استخدام Gemini لوصف الصورة (إذا كان المفتاح يعمل)
              const description = await describeImageWithGemini(base64Image);
              if (description) {
                imageDescription = `\n[وصف الصورة المستخرجة]: ${description}\n\n`;
              }
            } catch (err) {
              // إذا فشل Gemini، استخدم وصف بسيط
              imageDescription = "\n[ملاحظة]: تم استلام صورة، يرجى وصف ما تراه فيها.\n\n";
            }
          }
        }
        
        // إرسال الطلب إلى DeepSeek
        const response = await axios.post(
          "https://api.deepseek.com/v1/chat/completions",
          {
            model: "deepseek-chat",
            messages: [
              {
                role: "user",
                content: imageDescription + finalQuestion
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
            timeout: 60000
          }
        );

        let reply = response.data.choices[0]?.message?.content || "⚠️ عذراً، لم أتمكن من الإجابة.";
        
        // حذف رسالة "جارٍ التحليل"
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

// وظيفة مساعدة لوصف الصورة باستخدام Gemini (اختياري)
async function describeImageWithGemini(base64Image) {
  const GEMINI_API_KEY = "AQ.Ab8RN6I3RgZ9TGWPvGFktaTFB4e4lsmuwyrOX6PnwkCJKX_xTQ";
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: "صف هذه الصورة بالتفصيل باللغة العربية" },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000
      }
    );
    
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.log("Gemini vision failed:", error.message);
    return null;
  }
}
