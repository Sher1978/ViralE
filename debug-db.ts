import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE credentials in .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  console.log('Checking columns for table: profiles');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  
  if (error) {
    console.error('Error fetching profile:', error);
  } else {
    console.log('Columns found:', Object.keys(data[0] || {}));
  }
}

checkSchema().catch(console.error);
