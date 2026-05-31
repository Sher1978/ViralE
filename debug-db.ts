import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing SUPABASE credentials in .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);
  
  console.log('Checking columns for table: profiles');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching profile:', error);
  } else {
    console.log('Columns found:', Object.keys(data[0] || {}));
  }
}

checkSchema().catch(console.error);
