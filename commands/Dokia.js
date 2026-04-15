const axios = require("axios");

module.exports = {
    name: "duckai",
    aliases: ["ai", "ذكاء"], 
    description: "دردش مع DuckAI",
    usage: "duckai <نص سؤالك>",
    role: 0,
    cooldowns: 5,

    async onCall({ api, event, args }) {
        const prompt = args.join(" ");
        if (!prompt) {
            return api.sendMessage("❌ الرجاء إدخال نص السؤال", event.threadID);
        }

        // نرسل رسالة "جاري المعالجة..."
        api.sendMessage("🤖 جاري التفكير...", event.threadID, async (err, msgInfo) => {
            try {
                // هنا نستخدم معرف المستخدم (userID) كـ session ID عشان البوت يفتكر كل مستخدم لحاله
                const sessionId = `user_${event.senderID}`;
                // استخدمنا model=gpt5 بناءً على تجربتك
                const apiUrl = `https://launa-api.onrender.com/duckai/chat/session?prompt=${encodeURIComponent(prompt)}&session=${sessionId}&model=gpt5`;

                const response = await axios.get(apiUrl);
                
                // حسب الرد اللي جربناه، النتيجة بتظهر تحت مفتاح "reply"
                let reply = response.data?.reply;
                
                // اذا ما حصلنا رد، بنعرض الخطأ
                if (!reply) {
                    throw new Error("لم يتم العثور على رد من الـ API");
                }

                // نحذف رسالة "جاري المعالجة..." ونرسل الرد
                if (msgInfo) await api.unsendMessage(msgInfo.messageID);
                await api.sendMessage(reply, event.threadID);
            } catch (error) {
                console.error("DuckAI Error:", error);
                let errorMsg = "❌ حدث خطأ: ";
                if (error.response) {
                    errorMsg += `الخادم رد بـ ${error.response.status}`;
                } else if (error.request) {
                    errorMsg += "لم يتم تلقي رد من الخادم";
                } else {
                    errorMsg += error.message;
                }
                await api.sendMessage(errorMsg, event.threadID);
                if (msgInfo) await api.unsendMessage(msgInfo.messageID);
            }
        });
    }
};
