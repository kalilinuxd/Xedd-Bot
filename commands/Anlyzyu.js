const axios = require("axios");

module.exports = {
    name: "vision",
    aliases: ["رؤية", "حلل", "وصف"],
    description: "يحلل الصورة ويصف محتواها باستخدام DuckAI",
    usage: "/vision <سؤالك> (أرسل صورة أو رد على صورة)",
    role: 0,
    cooldowns: 10,

    async onCall(api, event, args) {
        // 1. السؤال من المستخدم
        const question = args.join(" ") || "ماذا ترى في هذه الصورة؟ صفها بالتفصيل بالعربية";
        
        // 2. الحصول على رابط الصورة
        let imageUrl = null;
        
        // هل أرسل صورة مع الأمر؟
        if (event.attachments && event.attachments.length > 0) {
            const photo = event.attachments.find(att => att.type === "photo");
            if (photo) imageUrl = photo.url;
        }
        
        // هل هو رد على رسالة بها صورة؟
        if (!imageUrl && event.messageReply && event.messageReply.attachments) {
            const photo = event.messageReply.attachments.find(att => att.type === "photo");
            if (photo) imageUrl = photo.url;
        }
        
        if (!imageUrl) {
            return api.sendMessage("❌ الرجاء إرسال صورة مع الأمر أو الرد على صورة.\n📝 مثال: أرسل صورة واكتب /vision ما هذا؟", event.threadID);
        }

        // 3. إرسال رسالة "جارٍ التحليل"
        api.sendMessage("🖼️ جاري تحليل الصورة، انتظر قليلاً...", event.threadID, async (err, msgInfo) => {
            try {
                // 4. الاتصال بـ API تحليل الصور (بدون أي مفاتيح!)
                const apiUrl = `https://launa-api.onrender.com/duckai/vision?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(question)}`;
                
                const response = await axios.get(apiUrl, { timeout: 60000 });
                
                // 5. استخراج الرد (حسب الهيكل اللي جربناه)
                let reply = response.data?.result || response.data?.reply || response.data?.response;
                
                if (!reply) {
                    throw new Error(response.data?.message || "لم يتم العثور على رد من API");
                }

                // 6. حذف رسالة "جارٍ التحليل" وإرسال الرد
                if (msgInfo) await api.unsendMessage(msgInfo.messageID);
                await api.sendMessage(`🖼️ **نتيجة التحليل:**\n\n${reply}`, event.threadID);
                
            } catch (error) {
                console.error("Vision Error:", error.response?.data || error.message);
                let errorMsg = "❌ فشل تحليل الصورة: ";
                if (error.response?.data?.message) {
                    errorMsg += error.response.data.message;
                } else {
                    errorMsg += error.message;
                }
                await api.sendMessage(errorMsg, event.threadID);
                if (msgInfo) await api.unsendMessage(msgInfo.messageID);
            }
        });
    }
};
