import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(id: string) {
  console.log(`\nChecking user ID: ${id}...`);
  
  // 1. Get Profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, tier, credits_balance, subscription_status')
    .eq('id', id)
    .single();
    
  if (profileErr) {
    console.log(`❌ Error fetching profile for ${id}:`, profileErr);
    return;
  }
  if (!profile) {
    console.log(`❌ Profile not found for ${id}`);
    return;
  }
  
  console.log(`✅ Profile found: ID: ${profile.id}, Tier: ${profile.tier}, Credits: ${profile.credits_balance}, Subs Status: ${profile.subscription_status}`);
  
  // 2. Get Payments from credits_transactions
  const { data: payments, error: paymentsErr } = await supabase
    .from('credits_transactions')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });
    
  if (paymentsErr) {
    console.log('Error fetching payments:', paymentsErr.message);
  } else if (!payments || payments.length === 0) {
    console.log('⚠️ No transactions found for this user in database.');
  } else {
    console.log(`💰 Transactions found (${payments.length}):`);
    payments.forEach((p: any) => {
      console.log(`  - [${p.created_at}] Amount: ${p.amount}, Type: ${p.transaction_type}, Meta: ${JSON.stringify(p.metadata)}`);
    });
  }
}

async function main() {
  await checkUser('5e98c351-3805-4eaf-ae1a-58a1bc831e06'); // Abdug A
  await checkUser('9559315f-5cb7-4131-95c8-80a7c0fa50b8'); // Мир
}

main().catch(console.error);
