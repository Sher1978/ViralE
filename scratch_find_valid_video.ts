import { supabaseAdmin } from './src/lib/supabase';

async function main() {
  console.log('Querying Supabase for recently uploaded video assets...');
  const { data, error } = await supabaseAdmin
    .from('media_assets')
    .select('id, public_url, file_path, created_at')
    .eq('asset_type', 'video')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching assets:', error);
    return;
  }

  console.log('Found assets:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
