import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function performCleanup() {
  console.log('=== Performing DB Cleanup ===');

  // 1. Clear render_jobs to reset render count in admin panel
  const { error: renderErr, count: deletedRenders } = await supabase
    .from('render_jobs')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (renderErr) {
    console.error('Error clearing render_jobs:', renderErr);
  } else {
    console.log(`Successfully cleared render_jobs (deleted ${deletedRenders} records). Render count is now 0.`);
  }

  // 2. Clear archived and used ideas from ideation_feed
  const { error: feedErr, count: deletedFeed } = await supabase
    .from('ideation_feed')
    .delete({ count: 'exact' })
    .in('status', ['archived', 'used']);

  if (feedErr) {
    console.error('Error clearing archived/used ideation_feed:', feedErr);
  } else {
    console.log(`Successfully cleared archived and used ideas (deleted ${deletedFeed} records).`);
  }
}

performCleanup().catch(console.error);
