import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceKey);

async function testRead() {
  const tables = ['profiles', 'projects', 'project_versions', 'ideas', 'credits_transactions'];
  
  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(5);

      if (error) {
        console.error(`❌ Table [${table}] Error:`, error.message, 'Code:', error.code, 'Details:', error.details);
      } else {
        console.log(`✅ Table [${table}]: READABLE! Total count: ${count}, fetched sample rows: ${data?.length}`);
      }
    } catch (err: any) {
      console.error(`💥 Exception reading [${table}]:`, err.message);
    }
  }
}

testRead();
