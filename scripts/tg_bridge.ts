import { sendTelegramRequest, waitForConfirmation } from './tg_confirm';
import { execSync } from 'child_process';
import fs from 'fs';

async function main() {
  if (!fs.existsSync('.tg_command')) {
    console.log('Нет команд в очереди.');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync('.tg_command', 'utf-8'));
    const { command, message } = data;
    
    console.log(`📡 Отправка запроса в Telegram: ${message}`);
    await sendTelegramRequest(message);
    const approved = await waitForConfirmation();

    if (approved) {
      console.log(`✅ Одобрено. Выполняю: ${command}`);
      execSync(command, { stdio: 'inherit' });
    } else {
      console.log('🚫 Отклонено пользователем через Telegram.');
    }
  } catch (e) {
    console.error('❌ Ошибка моста:', e);
  } finally {
    if (fs.existsSync('.tg_command')) fs.unlinkSync('.tg_command');
  }
}

main();
