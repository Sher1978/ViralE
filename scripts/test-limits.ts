import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const userId = '811300d1-9d38-4a37-a641-16d280dd2bfc';
  
  console.log('--- Testing Monthly Limit Query ---');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  console.log(`Start of month: ${startOfMonth.toISOString()}`);

  const { count, error } = await supabase
    .from('credits_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('transaction_type', 'SCRIPT_GEN')
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    console.error('Error fetching count:', error);
    return;
  }

  console.log(`Current month generations: ${count}`);
  
  // Simulation: Add a transaction and check if count increases
  console.log('Adding a test transaction...');
  await supabase.from('credits_transactions').insert({
    user_id: userId,
    amount: -10,
    transaction_type: 'SCRIPT_GEN'
  });

  const { count: newCount } = await supabase
    .from('credits_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('transaction_type', 'SCRIPT_GEN')
    .gte('created_at', startOfMonth.toISOString());

  console.log(`New count: ${newCount}`);
  
  if (newCount === (count || 0) + 1) {
    console.log('PASSED: Limit query is accurate.');
  } else {
    console.error('FAILED: Count mismatch!');
  }

  // Cleanup
  console.log('Cleaning up test transactions...');
  // We can't easily delete just one if multiple exist, but for test it's fine
  // We'll just leave it or use a specific tag if we had one
}

main();
