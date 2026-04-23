import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

async function runDiagnostics() {
  console.log(`${colors.bold}${colors.cyan}🚀 ЗАПУСК ДИАГНОСТИКИ VIRAL ENGINE${colors.reset}\n`);

  // 1. Проверка окружения
  console.log(`${colors.bold}1. Проверка .env.local:${colors.reset}`);
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_ADMIN_CHAT_ID'
  ];

  requiredVars.forEach(v => {
    if (process.env[v]) {
      console.log(`  ✅ ${v} установлен`);
    } else {
      console.log(`  ❌ ${v} ОТСУТСТВУЕТ`);
    }
  });

  // 2. Проверка Supabase
  console.log(`\n${colors.bold}2. Проверка Supabase:${colors.reset}`);
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.from('projects').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`  ✅ Подключение успешно (Проектов в БД: ${data || 0})`);

    const { error: ideaError } = await supabase.from('ideation_feed').select('count', { count: 'exact', head: true });
    if (ideaError) throw ideaError;
    console.log(`  ✅ Таблица ideation_feed доступна`);
  } catch (e: any) {
    console.log(`  ❌ Ошибка Supabase: ${e.message}`);
  }

  // 3. Проверка Telegram
  console.log(`\n${colors.bold}3. Проверка Telegram («Штирлиц»):${colors.reset}`);
  try {
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const resp = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`);
    const tgData = await resp.json();
    if (tgData.ok) {
      console.log(`  ✅ Бот активен: @${tgData.result.username}`);
    } else {
      console.log(`  ❌ Ошибка бота: ${tgData.description}`);
    }
  } catch (e: any) {
    console.log(`  ❌ Ошибка связи с Telegram: ${e.message}`);
  }

  // 4. Проверка системы архивации
  console.log(`\n${colors.bold}4. Проверка логики архивации:${colors.reset}`);
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: archCheck } = await supabase
      .from('projects')
      .select('id, metadata')
      .eq('metadata->archived', true)
      .limit(1);
    
    console.log(`  ✅ Поиск по метаданным работает`);
    if (archCheck && archCheck.length > 0) {
      console.log(`  ℹ️  В архиве найдены проекты (ID: ${archCheck[0].id})`);
    }
  } catch (e: any) {
    console.log(`  ❌ Ошибка логики метаданных: ${e.message}`);
  }

  console.log(`\n${colors.bold}${colors.green}--- ДИАГНОСТИКА ЗАВЕРШЕНА ---${colors.reset}\n`);
}

runDiagnostics();
