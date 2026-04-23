import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const sql = `
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS synthetic_training_data TEXT,
    ADD COLUMN IF NOT EXISTS knowledge_base_json JSONB DEFAULT '{}'::jsonb;
  `;

  console.log('🚀 Attempting to apply SQL migration via RPC...');
  // Using the 'exec_sql' RPC which is commonly used to run raw SQL in Supabase projects during development
  const { data, error } = await (supabase as any).rpc('exec_sql', { sql_query: sql });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
      console.error('❌ Failed: "exec_sql" RPC function is missing on the remote Supabase instance.');
      console.log('📝 Please run the following SQL manually in the Supabase Dashboard SQL Editor:');
      console.log(sql);
    } else {
      console.error('❌ Failed to run SQL via RPC:', error.message);
    }
    process.exit(1);
  } else {
    console.log('✅ Migration applied successfully via RPC!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
