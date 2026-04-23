import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking project table structure and existing statuses...');
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('status')
    .limit(10);

  if (error) {
    console.error('❌ Error fetching projects:', error.message);
    return;
  }

  const existingStatuses = [...new Set(projects.map(p => p.status))];
  console.log('Current statuses in DB:', existingStatuses);

  // Check if we can find constraint info via a dummy update
  console.log('\n🧪 Testing allowed statuses via trial-and-error...');
  const testStatuses = ['ideation', 'scripting', 'storyboard', 'rendering', 'completed', 'archived', 'archive'];
  const results = [];

  const testProject = '9f529484-7cc2-4e59-a708-1847443f2c30'; // Known existing project

  for (const status of testStatuses) {
    const { error: updateError } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', testProject);
    
    if (updateError) {
      results.push({ status, allowed: false, error: updateError.message });
    } else {
      results.push({ status, allowed: true });
    }
  }

  console.table(results);
}

checkSchema().catch(console.error);
