import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkAllProfiles() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profiles, error } = await supabase.from('profiles').select('id, email, user_api_keys, heygen_api_key, anthropic_api_key, elevenlabs_api_key, groq_api_key');
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${profiles?.length || 0} profiles:`);
  for (const p of profiles || []) {
    console.log(`User ID: ${p.id} | Email: ${p.email}`);
    console.log('  user_api_keys:', JSON.stringify(p.user_api_keys));
    console.log('  groq_api_key:', p.groq_api_key);
    console.log('  heygen_api_key:', p.heygen_api_key);
  }
}

checkAllProfiles().catch(console.error);
