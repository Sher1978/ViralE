import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await s
    .from('profiles')
    .select('id, email, full_name, heygen_api_key, anthropic_api_key')
    .not('heygen_api_key', 'is', null);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Profiles with HeyGen key:', data.map(p => ({
      id: p.id,
      email: p.email,
      name: p.full_name,
      heygen_key: p.heygen_api_key ? `${p.heygen_api_key.substring(0, 8)}...` : null
    })));
  }
}

run();
