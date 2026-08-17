import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function importUsers() {
  const csvPath = path.join(process.cwd(), 'users_import.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    console.error('Please save your downloaded CSV file as "users_import.csv" in the root directory of the project.');
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length <= 1) {
    console.error('❌ CSV file is empty or only contains header.');
    return;
  }

  // Parse header
  const header = lines[0].replace(/"/g, '').split(',');
  console.log('Parsed CSV Columns:', header);

  const emailIdx = header.findIndex(h => h.toLowerCase().includes('email'));
  const idIdx = header.findIndex(h => h.toLowerCase() === 'id');
  const creditsIdx = header.findIndex(h => h.toLowerCase().includes('credits'));
  const tierIdx = header.findIndex(h => h.toLowerCase().includes('tier'));
  const tgIdx = header.findIndex(h => h.toLowerCase().includes('telegram'));

  if (emailIdx === -1) {
    console.error('❌ Could not find "email" column in CSV header.');
    return;
  }

  console.log(`🚀 Starting import of ${lines.length - 1} users into new Supabase project...`);

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV parser handling quotes
    const cols = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(c => c.replace(/^"|"$/g, '')) || rawLine.split(',');

    const email = cols[emailIdx]?.trim();
    if (!email) continue;

    const originalId = idIdx !== -1 ? cols[idIdx]?.trim() : undefined;
    const credits = creditsIdx !== -1 ? parseInt(cols[creditsIdx]) || 100 : 100;
    const tier = tierIdx !== -1 ? cols[tierIdx]?.trim() || 'free' : 'free';
    const tgId = tgIdx !== -1 ? cols[tgIdx]?.trim() : '';

    try {
      // 1. Create auth user via admin API
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { imported: true }
      });

      if (createErr) {
        if (createErr.message.includes('already exists')) {
          console.log(`[${i}/${lines.length - 1}] ⚠️ User ${email} already exists, skipping create.`);
          skippedCount++;
        } else {
          console.error(`[${i}/${lines.length - 1}] ❌ Failed creating ${email}:`, createErr.message);
          failCount++;
        }
        continue;
      }

      const userId = newUser.user.id;

      // 2. Upsert profile with original credits & tier
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          credits_balance: credits,
          tier: tier,
          telegram_chat_id: tgId || null,
          created_at: new Date().toISOString()
        });

      if (profileErr) {
        console.warn(`[${i}/${lines.length - 1}] ⚠️ Profile creation warning for ${email}:`, profileErr.message);
      }

      successCount++;
      console.log(`[${i}/${lines.length - 1}] ✅ Imported: ${email} (ID: ${userId})`);
    } catch (err: any) {
      console.error(`[${i}/${lines.length - 1}] 💥 Exception for ${email}:`, err.message);
      failCount++;
    }
  }

  console.log(`\n🎉 Import Complete!`);
  console.log(`- Successfully imported: ${successCount}`);
  console.log(`- Skipped (already exist): ${skippedCount}`);
  console.log(`- Failed: ${failCount}`);
}

importUsers();
