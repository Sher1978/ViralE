import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downgradeUsers() {
  console.log('==================================================');
  console.log('🔄 DOWNGRADING USERS TO FREE TIER');
  console.log('==================================================');

  // 1. Find Maks Brekhov
  const { data: maksUsers, error: maksErr } = await supabase
    .from('profiles')
    .select('*')
    .or('email.ilike.%mpravvn@gmail.com%,full_name.ilike.%Maks Brekhov%');

  console.log('Maks Brekhov Query Result:', maksUsers, maksErr);

  // 2. Find Творец
  const { data: creatorUsers, error: creatorErr } = await supabase
    .from('profiles')
    .select('*')
    .or('email.ilike.%anon_afee8a4e-ad82-4c37-b5eb-1d88547fbfc1%,full_name.ilike.%Творец%');

  console.log('Творец Query Result:', creatorUsers, creatorErr);

  const targets = [...(maksUsers || []), ...(creatorUsers || [])];

  if (targets.length === 0) {
    console.log('❌ No matching users found in DB profiles table!');
    return;
  }

  for (const user of targets) {
    console.log(`\nUpdating User: ID=${user.id}, Name=${user.full_name}, Email=${user.email}, Current Tier=${user.plan || user.tier || user.subscription_tier}`);

    // Update profiles table fields
    const updates: any = {};
    if ('plan' in user) updates.plan = 'free';
    if ('tier' in user) updates.tier = 'free';
    if ('subscription_tier' in user) updates.subscription_tier = 'free';
    if ('subscription_status' in user) updates.subscription_status = 'canceled';
    if ('is_pro' in user) updates.is_pro = false;

    // Fallback if none of the above specific fields matched
    if (Object.keys(updates).length === 0) {
      updates.plan = 'free';
      updates.tier = 'free';
      updates.subscription_tier = 'free';
    }

    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select();

    if (updateErr) {
      console.error(`❌ Failed to update user ${user.id}:`, updateErr);
    } else {
      console.log(`✅ Successfully downgraded ${user.full_name || user.email} to FREE tier! Updated record:`, updated);
    }
  }
}

downgradeUsers();
