const axios = require("axios");

module.exports = {
    name: "vision",
    aliases: ["رؤية", "حلل", "وصف"],
    description: "يحلل الصورة ويصف محتواها",
    usage: "/vision <سؤالك> (أرسل صورة أو رد على صورة)",
    role: 0,
    cooldowns: 10,

    async onCall(api, event, args) {
        const question = args.join(" ") || "ماذا ترى في هذه الصورة؟ صفها بالتفصيل بالعربية";
        
        // البحث عن صورة في المرفقات أو الرد
        let imageUrl = null;
        
        if (event.attachments && event.attachments.length > 0) {
            const photo = event.attachments.find(att => att.type === "photo");
            if (photo) imageUrl = photo.url;
        }
        
        if (!imageUrl && event.messageReply && event.messageReply.attachments) {
            const photo = event.messageReply.attachments.find(att => att.type === "photo");
            if (photo) imageUrl = photo.url;
        }
        
        if (!imageUrl) {
            return api.sendMessage("❌ الرجاء إرسال صورة مع الأمر أو الرد على صورة\n📝 مثال: أرسل صورة واكتب /vision ما هذه؟", event.threadID);
        }

        api.sendMessage("🖼️ جاري تحليل الصورة...", event.threadID, async (err, msgInfo) => {
            try {
                // استخدام واجهة vision لتحليل الصورة
                const apiUrl = `https://launa-api.onrender.com/duckai/vision?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(question)}`;
                
                const response = await axios.get(apiUrl, {
                    timeout: 60000,
                    headers: { 'Accept': 'application/json' }
                });
                
                console.log("Vision API Response:", JSON.stringify(response.data, null, 2));
                
                // استخراج الرد (بنفس هيكل الـ API السابق)
                let reply = response.data?.result || response.data?.reply || response.data?.response;
                
                if (!reply) {
                    if (response.data?.status === false) {
                        throw new Error(response.data?.message || "فشل تحليل الصورة");
                    }
                    throw new Error("لم يتم العثور على رد من API");
                }

                if (msgInfo) await api.unsendMessage(msgInfo.messageID);
                
                // تقسيم الرد إذا كان طويلاً
                if (reply.length > 2000) {
                    const chunks = reply.match(/[\s\S]{1,2000}/g) || [];
                    for (const chunk of chunks) {
                        await api.sendMessage(`🖼️ **تحليل الصورة:**\n\n${chunk}`, event.threadID);
                    }
                } else {
                    await api.sendMessage(`🖼️ **تحليل الصورة:**\n\n${reply}`, event.threadID);
                }
                
            } catch (error) {
                console.error("Vision Error:", error.message);
                if (error.response) {
                    console.error("Response data:", error.response.data);
                }
                
                let errorMsg = "❌ فشل تحليل الصورة: ";
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
