// scripts/get-telegram-id.js
const axios = require('axios');

// Default to the provided token if env var not set
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8062945491:AAEEqdCc2YeT07bRKbHAJBanpIi_GIgyqTk';

async function getChatId() {
    console.log('🤖 Checking for Telegram updates...');
    console.log(`Token: ${TOKEN.substring(0, 10)}...`);
    
    try {
        const url = `https://api.telegram.org/bot${TOKEN}/getUpdates`;
        const response = await axios.get(url);
        
        const updates = response.data.result;
        
        if (updates.length === 0) {
            console.log('\n⚠️  No updates found.');
            console.log('👉 Action required: Send a message (e.g., "/start") to @Sgomarket_bot in Telegram, then run this script again.');
            return;
        }
        
        const lastMessage = updates[updates.length - 1].message;
        if (!lastMessage) {
             console.log('\n⚠️  Found updates but no message object. Try sending a text message.');
             return;
        }

        const chatId = lastMessage.chat.id;
        const name = lastMessage.chat.first_name;
        
        console.log('\n✅ Success! Found Chat ID.');
        console.log('------------------------------------------------');
        console.log(`👤 User: ${name}`);
        console.log(`🆔 Chat ID: ${chatId}`);
        console.log('------------------------------------------------');
        console.log('\n📝 Add this to your .env file:');
        console.log(`TELEGRAM_CHAT_ID=${chatId}`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response) {
            console.error('API Response:', err.response.data);
        }
    }
}

getChatId();
