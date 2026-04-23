import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function testAuthLogic() {
  console.log('--- Testing Auth Logic ---');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase keys');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('1. Attempting Anonymous Sign In...');
  const { data, error } = await supabase.auth.signInAnonymously();
  
  if (error) {
    console.error('❌ Anon Sign In Failed:', error.message);
    if (error.message.includes('not enabled')) {
      console.log('💡 TIP: Enable "Allow Anonymous Sign-ins" in Supabase Auth Settings.');
    }
  } else {
    console.log('✅ Anon Sign In Success! User ID:', data.user?.id);
    
    console.log('2. Verifying Profile Creation Logic...');
    // We can't easily test the server-side profile creation here without the token in a request,
    // but we can check if a profile ALREADY exists for this anon user (it shouldn't unless it was created).
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user?.id)
      .single();
      
    if (profile) {
      console.log('✅ Profile found for anon user.');
      console.log('   Onboarding Completed:', profile.onboarding_completed);
    } else {
      console.log('ℹ️ No profile found (as expected for brand new anon user before first app access).');
    }
  }
}

testAuthLogic();
