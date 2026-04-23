import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkIntegrity() {
  console.log('🧐 Starting Database Integrity Check...\n');

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Table Consistency
  const tables = ['profiles', 'projects', 'project_versions', 'ideation_feed', 'avatars'];
  for (const table of tables) {
    const { data, error } = await serviceClient.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table [${table}] check failed:`, error.message);
    } else {
      console.log(`✅ Table [${table}] is healthy.`);
    }
  }

  // 2. RLS Policy Test (Crucial for launch)
  console.log('\n🛡️  Testing RLS Policies...');
  
  // Try to fetch all projects as anon - should return zero or error if not public
  const { data: anonProjects, error: anonError } = await anonClient.from('projects').select('*');
  if (anonProjects && anonProjects.length > 0) {
    console.warn('⚠️  CRITICAL: Anon user can see projects! Check RLS policies.');
  } else {
    console.log('✅ Anon RLS: OK (No data leaked).');
  }

  // 3. Profile Column Verification
  const { data: profile, error: profileError } = await serviceClient.from('profiles').select('*').limit(1);
  if (profile && profile[0]) {
    const columns = Object.keys(profile[0]);
    const required = ['id', 'digital_shadow_prompt', 'onboarding_completed'];
    const missing = required.filter(col => !columns.includes(col));
    
    if (missing.length > 0) {
      console.error('❌ Missing required columns in profiles:', missing.join(', '));
    } else {
      console.log('✅ Profile schema: OK.');
    }
  }

  console.log('\n🏁 Integrity Check Complete.');
}

checkIntegrity().catch(console.error);
