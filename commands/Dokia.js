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
        // التحقق من وجود args
        if (!args || !Array.isArray(args)) {
            return api.sendMessage("❌ حدث خطأ في قراءة الأمر", event.threadID);
        }

        const prompt = args.join(" ");
        
        if (!prompt) {
            return api.sendMessage("❌ الرجاء إدخال نص السؤال\n📝 مثال: /duckai مرحبا كيف حالك؟", event.threadID);
        }

        // نرسل رسالة "جاري المعالجة..."
        api.sendMessage("🤖 جاري التفكير...", event.threadID, async (err, msgInfo) => {
            try {
                // استخدام معرف المستخدم كـ session ID
                const sessionId = `user_${event.senderID}`;
                const apiUrl = `https://launa-api.onrender.com/duckai/chat/session?prompt=${encodeURIComponent(prompt)}&session=${sessionId}&model=gpt5`;

                const response = await axios.get(apiUrl, {
                    timeout: 60000 // 60 ثانية كحد أقصى
                });
                
                // استخراج الرد من مختلف الاحتمالات
                let reply = response.data?.reply || 
                           response.data?.response || 
                           response.data?.message ||
                           response.data?.text;
                
                if (!reply) {
                    throw new Error("لم يتم العثور على رد من الـ API");
                }

                // حذف رسالة "جاري المعالجة..."
                if (msgInfo) {
                    await api.unsendMessage(msgInfo.messageID);
                }
                
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
                
                if (error.code === "ECONNABORTED") {
                    errorMsg += "انتهى وقت الاتصال، حاول مرة أخرى.";
                } else if (error.response?.status === 404) {
                    errorMsg += "الخدمة غير متاحة حالياً، حاول لاحقاً.";
                } else if (error.response?.status === 500) {
                    errorMsg += "خطأ في الخادم، حاول مرة أخرى.";
                } else if (error.message.includes("timeout")) {
                    errorMsg += "الخدمة بطيئة جداً، حاول لاحقاً.";
                } else {
                    errorMsg += error.message || "خطأ غير معروف";
                }
                
                await api.sendMessage(errorMsg, event.threadID);
                if (msgInfo) {
                    await api.unsendMessage(msgInfo.messageID);
                }
            }
        });
    }
};
