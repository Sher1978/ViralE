import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const adminSupabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('🚀 Seeding SCALE50K promo code into database...');

  const promoData = {
    code: 'SCALE50K',
    tier: 'scale',
    credits_bonus: 50000,
    is_used: false
  };

  const { data, error } = await adminSupabase
    .from('promo_codes')
    .upsert(promoData, { onConflict: 'code' })
    .select();

  if (error) {
    console.error('❌ Error seeding promo code:', error.message);
  } else {
    console.log('✅ Promo code SCALE50K successfully inserted:', data);
  }
}

main().catch(console.error);
