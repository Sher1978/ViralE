const token = "8738398927:AAGzIEb_0cW73KC2LrzHz8qre4b4kgvAgMk"; // From .env
const url = process.argv[2];

if (!url) {
  console.log("Usage: npx tsx scripts/set-webhook.ts <your-app-url>");
  console.log("Example: npx tsx scripts/set-webhook.ts https://viral-engine.com");
  process.exit(1);
}

const webhookUrl = `${url}/api/bot`;

async function setWebhook() {
  console.log(`Setting webhook to: ${webhookUrl}`);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await response.json();
    console.log("Response from Telegram:", data);
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
}

setWebhook();
