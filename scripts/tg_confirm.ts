import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function sendTelegramRequest(message: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: adminId,
    text: `⚠️ <b>Запрос на подтверждение</b>\n\n${message}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Одобрить', callback_data: 'approve' },
          { text: '❌ Отклонить', callback_data: 'cancel' }
        ]
      ]
    }
  };

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answerCallback(callbackQueryId: string, text: string) {
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

export async function deleteMessage(messageId: number) {
  const url = `https://api.telegram.org/bot${token}/deleteMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: adminId,
      message_id: messageId
    })
  });
}

export async function waitForConfirmation(timeoutMinutes = 10) {
  console.log(`📡 Ожидание подтверждения в TG (админ: ${adminId})...`);
  let lastUpdateId = 0;
  const startTime = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  // Инициализируем lastUpdateId, чтобы не ловить старые команды
  try {
    const initialResp = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=1&offset=-1`);
    const initialData = await initialResp.json();
    if (initialData.ok && initialData.result.length > 0) {
      lastUpdateId = initialData.result[0].update_id;
    }
  } catch (e) {
    console.error('Ошибка инициализации обновлений:', e);
  }

  while (Date.now() - startTime < timeoutMs) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`);
      const data = await resp.json();

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          
          // Обработка кнопок
          if (update.callback_query) {
            const cb = update.callback_query;
            const fromId = cb.from.id.toString();
            
            console.log(`🔘 Нажата кнопка: ${cb.data} от ${fromId}`);

            if (fromId === adminId?.toString()) {
              const messageId = cb.message.message_id;
              
              if (cb.data === 'approve') {
                await answerCallback(cb.id, '✅ Одобрено!');
                await deleteMessage(messageId); // Удаляем, чтобы не засорять
                return true;
              }
              if (cb.data === 'cancel') {
                await answerCallback(cb.id, '❌ Отклонено');
                await deleteMessage(messageId); // Удаляем
                return false;
              }
            } else {
              await answerCallback(cb.id, 'У вас нет прав доступа.');
            }
          }

          // Обработка текстовых команд (на случай если кнопки не сработали)
          const text = update.message?.text?.toUpperCase();
          const fromId = update.message?.from?.id.toString();
          
          if (fromId === adminId?.toString()) {
            if (text === 'ДА' || text === '/APPROVE') {
              if (update.message?.message_id) await deleteMessage(update.message.message_id);
              return true;
            }
            if (text === 'НЕТ' || text === '/CANCEL') {
              if (update.message?.message_id) await deleteMessage(update.message.message_id);
              return false;
            }
          }
        }
      }
    } catch (err) {
      console.error('Ошибка в цикле ожидания TG:', err);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('⏰ Таймаут ожидания подтверждения.');
  return false;
}
