import { supabaseAdmin } from './src/lib/supabase';

async function main() {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', '0451611@gmail.com')
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  console.log('--- USER PROFILE ---');
  console.log('ID:', profile.id);
  console.log('Email:', profile.email);
  console.log('digital_shadow_prompt:', profile.digital_shadow_prompt);
  console.log('dna_answers:', profile.dna_answers);
  console.log('storybrand_filename:', profile.storybrand_filename);
  console.log('storybrand_raw_content length:', profile.storybrand_raw_content ? profile.storybrand_raw_content.length : 0);
  if (profile.storybrand_raw_content) {
    console.log('storybrand_raw_content preview:', profile.storybrand_raw_content.substring(0, 300));
  }

  const { data: ideas } = await supabaseAdmin
    .from('ideation_feed')
    .select('id, topic_title, category, status')
    .eq('user_id', profile.id);

  console.log('--- IDEAS COUNT ---', ideas?.length || 0);
  if (ideas && ideas.length > 0) {
    console.log('Sample ideas:', ideas.slice(0, 5));
  }
}

main().catch(console.error);
