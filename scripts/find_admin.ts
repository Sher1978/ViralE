import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findAdmin() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Available users:');
  data.forEach(u => console.log(`ID: ${u.id}, Name: ${u.full_name}, Email: ${u.email}`));
}

findAdmin();
