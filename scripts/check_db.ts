import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('--- Checking Profiles Table Structure ---');
  
  // We can query information_schema if we have permissions, 
  // or just attempt a select and catch missing columns.
  const { data, error } = await supabase
    .from('profiles')
    .select('synthetic_training_data, knowledge_base_json')
    .limit(1);

  if (error) {
    if (error.code === '42703') {
      console.error('❌ Columns missing in profiles table!');
      console.log('Required SQL:');
      console.log(`
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS synthetic_training_data TEXT,
        ADD COLUMN IF NOT EXISTS knowledge_base_json JSONB DEFAULT '{}'::jsonb;
      `);
    } else {
      console.error('❌ Database error:', error.message);
    }
  } else {
    console.log('✅ Columns exist in profiles table.');
  }
}

checkSchema();
