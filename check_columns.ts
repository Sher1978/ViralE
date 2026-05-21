
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const { error: elError } = await supabase.from('profiles').select('elevenlabs_api_key').limit(1);
  console.log('elevenlabs_api_key column exists?', !elError);
  if (elError) console.error('  -> Error:', elError.message);

  const { error: hgError } = await supabase.from('profiles').select('heygen_api_key').limit(1);
  console.log('heygen_api_key column exists?', !hgError);
  if (hgError) console.error('  -> Error:', hgError.message);
}

check();
