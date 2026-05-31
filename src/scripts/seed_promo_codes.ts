import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const promoCodes = [
  { code: 'CREATOR100', tier: 'creator', credits_bonus: 100, is_used: false },
  { code: 'PRO500', tier: 'pro', credits_bonus: 500, is_used: false },
  { code: 'PREMIUM1000', tier: 'pro', credits_bonus: 1000, is_used: false }
];

async function seed() {
  const supabase = createClient(supabaseUrl, anonKey);

  console.log('Seeding promo codes...');
  for (const promo of promoCodes) {
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promo.code)
      .maybeSingle();

    if (existing) {
      console.log(`Promo code ${promo.code} already exists.`);
    } else {
      const { data, error } = await supabase
        .from('promo_codes')
        .insert([promo])
        .select();

      if (error) {
        console.error(`Error inserting ${promo.code}:`, error.message);
      } else {
        console.log(`Successfully seeded ${promo.code}:`, data);
      }
    }
  }
}

seed().catch(console.error);
