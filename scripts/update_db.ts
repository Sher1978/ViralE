import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role to bypass RLS for schema changes

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Database Migration...');

  // We can't run ALTER TABLE directly via the JS client unless we use a function or the SQL API is enabled.
  // However, we can check if columns exist and potentially use an RPC if defined.
  // For this environment, we'll try to use the 'rpc' method if a generic 'exec_sql' exists, 
  // or just inform the user to run it in the dashboard.
  
  // STRATEGY: Try to query the table to see if it works.
  const { error } = await supabase
    .from('profiles')
    .select('synthetic_training_data')
    .limit(1);

  if (error && error.message.includes('column "synthetic_training_data" does not exist')) {
    console.log('📝 Columns missing. Please run the following SQL in your Supabase Dashboard:');
    console.log(`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS synthetic_training_data TEXT,
      ADD COLUMN IF NOT EXISTS knowledge_base_json JSONB DEFAULT '{}'::jsonb;
    `);
  } else if (error) {
    console.error('❌ Error checking schema:', error.message);
  } else {
    console.log('✅ Columns already exist or migration successful.');
  }
}

runMigration();
