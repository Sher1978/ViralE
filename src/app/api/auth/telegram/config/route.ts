import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const defaultBotUsername = 'Viralengin_bot';

  if (!token) {
    return NextResponse.json({ botId: '', botUsername: defaultBotUsername });
  }

  // Extract bot_id from token (before the colon)
  const botId = token.split(':')[0];
  
  // Fetch bot username from Telegram
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    if (data.ok && data.result?.username) {
      return NextResponse.json({ botId, botUsername: data.result.username });
    }
  } catch (error) {
    console.error('Error fetching bot info:', error);
  }
  
  return NextResponse.json({ botId, botUsername: defaultBotUsername });
}
