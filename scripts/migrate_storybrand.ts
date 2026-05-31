import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Supabase credentials missing in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  
  console.log('🚀 Running database migration: Add StoryBrand columns to profiles...');
  
  const migrationSql = `
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS storybrand_raw_content TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS storybrand_filename TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS storybrand_file_size INT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS storybrand_updated_at TIMESTAMPTZ DEFAULT NULL;

    COMMENT ON COLUMN public.profiles.storybrand_raw_content IS 'Raw parsed text of the uploaded StoryBrand document';
    COMMENT ON COLUMN public.profiles.storybrand_filename IS 'Original name of the uploaded StoryBrand file';
    COMMENT ON COLUMN public.profiles.storybrand_file_size IS 'Size of the uploaded StoryBrand file in bytes';
    COMMENT ON COLUMN public.profiles.storybrand_updated_at IS 'Timestamp of the last StoryBrand file upload/update';
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });

  if (error) {
    console.warn('⚠️ RPC exec_sql failed, trying direct select to verify column presence...');
    const { error: queryError } = await supabase.from('profiles').select('storybrand_raw_content').limit(1);
    if (queryError) {
      console.error('❌ storybrand_raw_content column missing and could not be added automatically.', queryError.message);
      console.info('💡 Please copy and run the SQL migration manually in your Supabase SQL Editor.');
    } else {
      console.log('✅ storybrand_raw_content column already exists.');
    }
  } else {
    console.log('✅ Database migration applied successfully!');
  }
}

migrate();
