
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const { data, error } = await supabase.from('render_jobs').select('*').limit(1);
  if (error) {
    console.error('Error fetching render_jobs:', error.message);
  } else if (data && data.length > 0) {
    console.log('Successfully fetched render_jobs row! Columns:', Object.keys(data[0]));
  } else {
    console.log('No rows in render_jobs table.');
  }
}

check();
