import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function exportAllUsers() {
  console.log('📦 Starting full export of users and profiles...');
  
  try {
    // 1. Fetch all Auth users (contains email, phone, metadata)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    
    if (authError) {
      console.error('❌ Failed to list Auth users via Admin API:', authError.message);
    } else {
      console.log(`✅ Fetched ${authData.users.length} auth users!`);
    }

    // 2. Fetch all public profiles
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
    if (profileError) {
      console.error('❌ Failed to fetch profiles table:', profileError.message);
    } else {
      console.log(`✅ Fetched ${profiles?.length || 0} public profiles!`);
    }

    // 3. Fetch all projects
    const { data: projects, error: projectsError } = await supabase.from('projects').select('*');
    if (projectsError) {
      console.error('❌ Failed to fetch projects table:', projectsError.message);
    } else {
      console.log(`✅ Fetched ${projects?.length || 0} projects!`);
    }

    // 4. Combine into clean export format
    const combinedUsers = (authData?.users || []).map(u => {
      const userProfile = (profiles || []).find(p => p.id === u.id);
      return {
        id: u.id,
        email: u.email || '',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        tier: userProfile?.tier || 'free',
        credits_balance: userProfile?.credits_balance ?? 100,
        telegram_chat_id: userProfile?.telegram_chat_id || '',
        user_metadata: u.user_metadata || {}
      };
    });

    const outputDir = path.join(process.cwd(), 'backup_exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write JSON export
    const jsonPath = path.join(outputDir, 'users_backup.json');
    fs.writeFileSync(jsonPath, JSON.stringify(combinedUsers, null, 2), 'utf-8');
    console.log(`📄 Saved JSON export to: ${jsonPath}`);

    // Write CSV export
    const csvHeader = 'id,email,created_at,last_sign_in_at,tier,credits_balance,telegram_chat_id\n';
    const csvRows = combinedUsers.map(u => 
      `"${u.id}","${u.email}","${u.created_at}","${u.last_sign_in_at || ''}","${u.tier}","${u.credits_balance}","${u.telegram_chat_id}"`
    ).join('\n');

    const csvPath = path.join(outputDir, 'users_emails_backup.csv');
    fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf-8');
    console.log(`📊 Saved CSV export with all emails to: ${csvPath}`);

  } catch (err: any) {
    console.error('💥 Export crashed:', err.message);
  }
}

exportAllUsers();
