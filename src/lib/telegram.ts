/**
 * Telegram Bot API Utility
 * Used for sending production results and notifications to users.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

export const telegramService = {
  /**
   * Sends a simple text message
   */
  async sendMessage(chatId: string | number, text: string): Promise<TelegramResponse> {
    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const response = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    return await response.json();
  },

  /**
   * Sends a video file via URL
   */
  async sendVideo(chatId: string | number, videoUrl: string, caption?: string): Promise<TelegramResponse> {
    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const response = await fetch(`${API_URL}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        video: videoUrl,
        caption: caption,
        supports_streaming: true,
      }),
    });

    return await response.json();
  },

  /**
   * Sends a document (e.g., manifest or log file)
   */
  async sendDocument(chatId: string | number, documentUrl: string, caption?: string): Promise<TelegramResponse> {
    if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const response = await fetch(`${API_URL}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document: documentUrl,
        caption: caption,
      }),
    });

    return await response.json();
  }
};
