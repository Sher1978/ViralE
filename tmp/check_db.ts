import { supabase } from '../src/lib/supabase';

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching columns:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in profiles table:', Object.keys(data[0]));
  } else {
    console.log('No data in profiles table to check columns.');
  }
}

check();
