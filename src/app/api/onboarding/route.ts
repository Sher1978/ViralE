import { NextResponse } from 'next/server';
import { synthesizeDigitalShadow } from '@/lib/ai/gemini';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { answers, dnaPrompt, locale = 'en' } = await req.json();

    // Allow missing answers/dnaPrompt for the "Skip" case
    // if (!answers && !dnaPrompt) {
    //   return NextResponse.json({ error: 'Missing answers or DNA prompt' }, { status: 400 });
    // }

    const userId = user.id;

    // 1. Synthesize or Use Provided "DNA" Master Prompt
    let masterPrompt = dnaPrompt;
    if (!masterPrompt && answers) {
      console.log('[Onboarding] Synthesizing DNA for user:', userId);
      masterPrompt = await synthesizeDigitalShadow(answers, locale);
    }

    console.log('[Onboarding] Updating profile for user:', userId);
    
    // 2. Update Profile with DNA and mark onboarding complete
    // We update both the old and new column names for safety during migration
    const { data, error } = await authorizedSupabase
      .from('profiles')
      .update({
        digital_shadow_prompt: masterPrompt,
        synthetic_training_data: masterPrompt, // New column
        raw_onboarding_data: answers,
        onboarding_completed: true
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Onboarding] Database update failed:', error);
      throw error;
    }

    console.log('[Onboarding] Profile updated successfully for user:', userId);

    const response = NextResponse.json({
      success: true,
      dna: masterPrompt,
      profile: data
    });

    response.cookies.set('profile_onboarded', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;

  } catch (error: any) {
    console.error('Onboarding synthesis failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
