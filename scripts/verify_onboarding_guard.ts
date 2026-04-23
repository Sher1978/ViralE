import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyOnboardingGuard() {
  console.log('🛡️ Verifying Onboarding Guard Logic...\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local (Service role required)');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Fetch users to verify onboarding status
  console.log('🔍 Fetching top 5 profiles to check onboarding state...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, onboarding_completed')
    .limit(5);

  if (error) {
    console.error('❌ Failed to fetch profiles:', error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('ℹ️ No profiles found in the database. Please create a user first.');
    return;
  }

  console.table(profiles);

  const completed = profiles.filter(p => p.onboarding_completed);
  const incomplete = profiles.filter(p => !p.onboarding_completed);

  console.log(`\n📊 Summary:`);
  console.log(`✅ Completed Onboarding: ${completed.length}`);
  console.log(`🚧 Incomplete: ${incomplete.length}`);

  if (incomplete.length > 0) {
    console.log('\n💡 These users SHOULD be redirected by the Onboarding Guard in /app/(main) routes.');
  }

  // 2. Logic Check: Verify if the layout query would work
  const testUser = profiles[0];
  console.log(`\n🧪 Testing simulation for user: ${testUser.id}`);
  
  const { data: profileCheck, error: checkError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', testUser.id)
    .single();

  if (checkError) {
    console.error('❌ Query failed:', checkError.message);
  } else {
    console.log(`✅ Query successful. status: ${profileCheck.onboarding_completed}`);
    if (profileCheck.onboarding_completed) {
      console.log('🚀 Result: User would be ALLOWED to access main app.');
    } else {
      console.log('🛑 Result: User would be REDIRECTED to /onboarding.');
    }
  }

  console.log('\n🏁 Verification Complete.');
}

verifyOnboardingGuard().catch(console.error);
