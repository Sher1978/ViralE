import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const adminSupabase = createClient(supabaseUrl, serviceKey);

async function autoMigrate() {
  console.log('🔄 Checking database columns in profiles table...');

  // Helper check: try selecting columns
  const requiredCols = [
    'raw_onboarding_data',
    'storybrand_raw_content',
    'storybrand_filename',
    'storybrand_file_size',
    'storybrand_updated_at',
    'dna_answers',
    'partner_balance_usd',
    'onboarding_completed',
    'digital_shadow_prompt',
    'industry_context',
    'knowledge_base_json',
    'full_name',
    'email',
    'avatar_url',
    'telegram_id'
  ];

  const selectStr = requiredCols.join(', ');
  const { error } = await adminSupabase.from('profiles').select(selectStr).limit(1);

  if (error) {
    console.log('⚠️ Column check status:', error.message);
  } else {
    console.log('✅ ALL profile columns are present and queryable in Supabase!');
  }
}

autoMigrate().catch(console.error);
