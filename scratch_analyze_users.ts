import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectUserBreakdown() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, credits_balance, onboarding_completed, telegram_id, created_at');

  if (!profiles) return;

  const { data: projects } = await supabase
    .from('projects')
    .select('user_id');

  const projectCounts: Record<string, number> = {};
  (projects || []).forEach(p => {
    projectCounts[p.user_id] = (projectCounts[p.user_id] || 0) + 1;
  });

  let usersWith0Projects = 0;
  let usersWithProjects = 0;

  profiles.forEach(p => {
    const pCount = projectCounts[p.id] || 0;
    if (pCount === 0) usersWith0Projects++;
    else usersWithProjects++;
  });

  console.log(`=== Total Profiles: ${profiles.length} ===`);
  console.log(`- Users with 0 projects: ${usersWith0Projects} (${Math.round((usersWith0Projects / profiles.length) * 100)}%)`);
  console.log(`- Users with >=1 projects: ${usersWithProjects} (${Math.round((usersWithProjects / profiles.length) * 100)}%)`);

  // Show balance distribution
  const balances = profiles.map(p => p.credits_balance || 0);
  console.log('Balance min:', Math.min(...balances), 'max:', Math.max(...balances));
  console.log('Sample profiles with 0 projects:');
  profiles.slice(0, 5).forEach(p => {
    console.log(`- ${p.email} (${p.full_name}): ${p.credits_balance} CR, ${projectCounts[p.id] || 0} projects`);
  });
}

inspectUserBreakdown().catch(console.error);
