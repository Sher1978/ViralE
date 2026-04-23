import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🛠️ Попытка обновить ограничение статусов в таблице projects...');
  
  // SQL to drop and recreate constraint with 'archived' status
  const sql = `
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
    ALTER TABLE projects ADD CONSTRAINT projects_status_check 
    CHECK (status = ANY (ARRAY['idea'::text, 'scripting'::text, 'rendering'::text, 'completed'::text, 'archived'::text]));
  `;

  // Note: Standard Supabase JS client doesn't support raw SQL.
  // We'll try to use the 'rpc' method to call an exec_sql function 
  // (common in many Supabase boilerplates).
  const { data, error } = await (supabase as any).rpc('exec_sql', { sql_query: sql });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
      console.log('⚠️ Функция "exec_sql" не найдена. Не могу изменить схему БД удаленно.');
      console.log('🔄 Перехожу к запасному плану: использование метаданных для архивации.');
      process.exit(2); // Specific code for metadata approach
    } else {
      console.error('❌ Ошибка при выполнении SQL:', error);
      process.exit(1);
    }
  }

  console.log('✅ Ограничение успешно обновлено! Статус "archived" теперь разрешен.');
}

main();
