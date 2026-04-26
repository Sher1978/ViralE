import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  console.log('Running migration: ADD dna_answers TO profiles');
  const { error } = await supabase.rpc('exec_sql', { 
    sql: 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dna_answers JSONB DEFAULT \'{}\'::jsonb;' 
  });

  if (error) {
    // If rpc exec_sql doesn't exist, we might have to use another way or just skip if it's already there
    console.warn('RPC exec_sql failed, trying direct query if possible (Note: service role might not have raw sql access via client)');
    const { error: queryError } = await supabase.from('profiles').select('dna_answers').limit(1);
    if (queryError) {
        console.error('dna_answers column missing and could not be added automatically. Please run the migration in Supabase SQL Editor.');
    } else {
        console.log('dna_answers column already exists.');
    }
  } else {
    console.log('Migration successful!');
  }
}

migrate();
