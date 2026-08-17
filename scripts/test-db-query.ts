import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testManagementApi() {
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  console.log('Project Ref:', projectRef);

  // Try calling Supabase Management API query endpoint if service key or token works
  const sqlQuery = `
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS raw_onboarding_data JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storybrand_raw_content TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storybrand_filename TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storybrand_file_size INTEGER;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storybrand_updated_at TIMESTAMPTZ;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dna_answers JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_balance_usd NUMERIC DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
  `;

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ query: sqlQuery })
    });

    console.log('Management API status:', res.status);
    const text = await res.text();
    console.log('Management API response:', text);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

testManagementApi();
