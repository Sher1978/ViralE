import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data, error } = await s.from('profiles').select('id, email, onboarding_completed').limit(5);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
