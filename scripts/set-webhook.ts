import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const token = process.env.TELEGRAM_BOT_TOKEN || "8738398927:AAGzIEb_0cW73KC2LrzHz8qre4b4kgvAgMk";
const url = process.argv[2] || "https://www.virale.uno";

const webhookUrl = `${url}/api/bot`;
const allowedUpdates = ["message", "callback_query", "pre_checkout_query", "chat_member", "my_chat_member"];

async function setWebhook() {
  console.log(`Setting webhook to: ${webhookUrl}`);
  console.log(`Allowed updates:`, allowedUpdates);
  try {
    // Delete existing webhook first to ensure allowed_updates are updated
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: allowedUpdates
      })
    });
    const data = await response.json();
    console.log("Response from Telegram:", data);
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
}

setWebhook();
