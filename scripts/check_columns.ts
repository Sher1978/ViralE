import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch one row to see columns
  const { data, error } = await supabase.from('ideation_feed').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in ideation_feed:', Object.keys(data[0]));
  } else {
    console.log('Table is empty. Checking table definitions via RPC or another way is harder without a schema tool. Trying to insert a dummy row to see failure?');
  }
}

checkSchema();
