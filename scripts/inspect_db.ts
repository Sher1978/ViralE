import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function listColumns() {
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await serviceClient.from('profiles').select('*').limit(1);
  if (data && data[0]) {
    console.log('Columns in [profiles]:', Object.keys(data[0]));
  } else {
    console.log('No rows in profiles or error:', error?.message);
  }
  
  const { data: tables } = await serviceClient.rpc('get_tables');
  console.log('Tables in DB:', tables);
}

listColumns().catch(console.error);
