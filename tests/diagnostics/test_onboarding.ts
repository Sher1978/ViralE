import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for testing

const TEST_USER_ID = '41b90955-ffbd-4a95-a4d1-8c0e1e148c3b'; 

async function testOnboardingAPI(data: any) {
  console.log('Testing Onboarding API with data:', JSON.stringify(data, null, 2));
  
  // Note: We can't easily call the API route directly from a Node script if it uses Next.js server context (like getAuthContext)
  // Instead, we will simulate the database update directly to verify the logic.
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        digital_shadow_prompt: data.dnaPrompt || null,
        synthetic_training_data: data.dnaPrompt || null,
        raw_onboarding_data: data.answers || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', TEST_USER_ID)
      .select()
      .single();

    if (error) {
      console.error('Database update failed:', error.message);
      return;
    }

    console.log('Profile updated successfully:', profile.id);
    console.log('Onboarding Completed:', profile.onboarding_completed);
  } catch (err: any) {
    console.error('Test failed:', err.message);
  }
}

// Case 1: Full Onboarding
testOnboardingAPI({
  answers: { mode: 'chat', responses: ['tech', 'ironic'] },
  dnaPrompt: 'A tech-savvy and ironic persona...'
});

// Case 2: Skipped DNA
testOnboardingAPI({
  answers: null,
  dnaPrompt: null
});
