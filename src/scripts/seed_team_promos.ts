import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const teamPromoCodes = [
  {
    code: 'SCALE-TEAM-VIP',
    tier: 'scale',
    credits_bonus: 10000,
    is_used: false,
    used_by: null,
  },
  {
    code: 'SCALE-TEAM-2026',
    tier: 'scale',
    credits_bonus: 10000,
    is_used: false,
    used_by: null,
  },
  {
    code: 'TEAM-50000-CREDITS',
    tier: 'free',
    credits_bonus: 50000,
    is_used: false,
    used_by: null,
  },
  {
    code: 'TEAM-50K-CREDITS',
    tier: 'free',
    credits_bonus: 50000,
    is_used: false,
    used_by: null,
  }
];

async function seed() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase URL or Service Role Key is missing');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  console.log('🚀 Seeding team non-expiring multi-use promo codes...');

  for (const promo of teamPromoCodes) {
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('*')
      .ilike('code', promo.code)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('promo_codes')
        .update({
          tier: promo.tier,
          credits_bonus: promo.credits_bonus,
          is_used: false,
          used_by: null
        })
        .eq('id', existing.id)
        .select();

      if (error) {
        console.error(`❌ Error updating ${promo.code}:`, error.message);
      } else {
        console.log(`✅ Updated existing team promo code ${promo.code}:`, data);
      }
    } else {
      const { data, error } = await supabase
        .from('promo_codes')
        .insert([promo])
        .select();

      if (error) {
        console.error(`❌ Error inserting ${promo.code}:`, error.message);
      } else {
        console.log(`✅ Successfully seeded team promo code ${promo.code}:`, data);
      }
    }
  }
}

seed().catch(console.error);
