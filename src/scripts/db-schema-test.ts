import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase Url or service role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testSchema() {
  console.log('Querying one row from render_jobs...');
  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying render_jobs:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Successfully fetched a row! Existing columns are:', Object.keys(data[0]));
  } else {
    console.log('No rows in render_jobs. Querying columns through another method...');
    const { data: cols, error: colError } = await supabase
      .from('render_jobs')
      .insert({ status: 'pending', progress: 0, render_type: 'preview' })
      .select();
    
    if (colError) {
      console.error('Insert dry-run failed:', colError);
    } else {
      console.log('Dry-run insert succeeded! Columns are:', Object.keys(cols[0]));
    }
  }
}

testSchema();
