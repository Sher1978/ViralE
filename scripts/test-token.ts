
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const d = await r.json();
  console.log(JSON.stringify(d, null, 2));
}
check();
