import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function run() {
  console.log('=== INSPECTING NIKOLAI (@Collelion / TG 6874914235) ===');
  const { data: prof } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', '27f1af1a-d7e7-424a-a577-0c9ede3e6d6d')
    .single();

  console.log('Nikolai Profile:', JSON.stringify(prof, null, 2));

  const { data: txs } = await supabase
    .from('credits_transactions')
    .select('*')
    .eq('user_id', '27f1af1a-d7e7-424a-a577-0c9ede3e6d6d');

  console.log('Nikolai Transactions:', JSON.stringify(txs, null, 2));
}

run().catch(console.error);
