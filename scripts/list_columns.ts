import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🧐 Анализирую структуру таблицы projects...');
  
  // Querying information_schema is usually restricted, 
  // so we'll try to get one row and see the keys (or use a RPC if exists)
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Ошибка при чтении таблицы:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Список колонок в таблице projects:');
    console.table(Object.keys(data[0]).map(col => ({ column: col })));
  } else {
    console.log('⚠️ Таблица пуста. Пытаюсь получить структуру через RPC или пустой селект...');
    // Fallback: try to select nothing but check column names in the response if possible
    // In supabase-js, if you select('*'), it usually doesn't give column names if there's no data.
    // We'll try to insert a dummy row and rollback or just assume based on current code.
    console.log('Колонки (из кода): id, user_id, title, status, metadata, created_at, updated_at');
  }
}

main();
