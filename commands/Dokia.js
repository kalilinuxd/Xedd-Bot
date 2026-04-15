const axios = require("axios");

module.exports = {
    name: "duckai",
    aliases: ["ai", "ذكاء"],
    author: "أنت",
    category: "ai",
    description: "دردش مع DuckAI",
    usage: "/duckai <سؤالك>",
    role: 0,
    cooldowns: 5,

    async onCall(api, event, args) {
        if (!args || args.length === 0) {
            return api.sendMessage("❌ الرجاء إدخال نص السؤال\n📝 مثال: /duckai مرحبا كيف حالك؟", event.threadID);
        }

        const prompt = args.join(" ");
        
        api.sendMessage("🤖 جاري التفكير...", event.threadID, async (err, msgInfo) => {
            try {
                const sessionId = `user_${event.senderID}`;
                // ملاحظة: لا تقم بتشفير prompt هنا، لأن API يتعامل معه بشكل مختلف
                const apiUrl = `https://launa-api.onrender.com/duckai/chat/session?prompt=${encodeURIComponent(prompt)}&session=${sessionId}&model=gpt5`;

                const response = await axios.get(apiUrl, {
                    timeout: 60000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                // استخراج الرد من مفتاح "result"
                let reply = response.data?.result;
                
                if (!reply) {
                    // محاولة مفتاحات أخرى إذا لم يوجد result
                    reply = response.data?.reply || response.data?.response || response.data?.message;
                }
                
                if (!reply) {
                    throw new Error("لم يتم العثور على رد من API");
                }

                // حذف رسالة "جاري التفكير"
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
                console.error("DuckAI Error:", error.message);
                
                let errorMsg = "❌ حدث خطأ: ";
                if (error.response?.data?.message) {
                    errorMsg += error.response.data.message;
                } else if (error.message) {
                    errorMsg += error.message;
                } else {
                    errorMsg += "غير معروف";
                }
                
                await api.sendMessage(errorMsg, event.threadID);
                if (msgInfo) await api.unsendMessage(msgInfo.messageID);
            }
        });
    }
};
