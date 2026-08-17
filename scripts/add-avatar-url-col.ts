import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const adminSupabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('Ensuring avatar_url column on profiles...');
  const { data, error } = await adminSupabase.from('profiles').select('avatar_url').limit(1);
  if (error) {
    console.error('Column avatar_url check result:', error.message);
  } else {
    console.log('✅ Column avatar_url is already present and queryable in public.profiles!');
  }
}

main().catch(console.error);
