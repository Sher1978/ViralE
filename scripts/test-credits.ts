import { createClient } from '@supabase/supabase-js';
import { deductCredits, checkBalance } from '../src/lib/credits';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const userId = '811300d1-9d38-4a37-a641-16d280dd2bfc';
  
  console.log('--- Testing Atomic Credit Deduction ---');
  
  const initialBalance = await checkBalance(supabase, userId);
  console.log(`Initial Balance: ${initialBalance}`);

  try {
    console.log('Attempting to deduct 10 credits...');
    await deductCredits(supabase, userId, 10, 'TEST_DEDUCTION');
    const newBalance = await checkBalance(supabase, userId);
    console.log(`Success! New Balance: ${newBalance}`);
    
    if (newBalance !== initialBalance - 10) {
      console.error('FAILED: Balance mismatch!');
    } else {
      console.log('PASSED: Atomic deduction verified.');
    }
  } catch (err: any) {
    console.error('Deduction failed:', err.message);
  }

  try {
    console.log('Testing insufficient credits (deducting 100000)...');
    await deductCredits(supabase, userId, 100000, 'TEST_OVERDRAW');
    console.error('FAILED: Overdraw should have failed!');
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      console.log('PASSED: Insufficient credits correctly handled.');
    } else {
      console.error('FAILED: Unexpected error:', err.message);
    }
  }

  // Restore balance (optional)
  await supabase.from('profiles').update({ credits_balance: initialBalance }).eq('id', userId);
  console.log('Balance restored.');
}

main();
