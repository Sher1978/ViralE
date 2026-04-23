import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const table = 'credits_transactions';
  console.log(`🧐 Анализирую структуру таблицы ${table}...`);
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Ошибка при чтении таблицы:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Список колонок в таблице ${table}:`);
    console.table(Object.keys(data[0]).map(col => ({ column: col })));
  } else {
    console.log(`⚠️ Таблица ${table} пуста. Пытаюсь получить структуру через пустую вставку...`);
  }
}

main();
