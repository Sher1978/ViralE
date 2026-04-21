import { NextResponse } from 'next/server';
import { synthesizeDigitalShadow } from '@/lib/ai/gemini';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { answers, dnaPrompt, locale = 'en' } = await req.json();

    if (!answers && !dnaPrompt) {
      return NextResponse.json({ error: 'Missing answers or DNA prompt' }, { status: 400 });
    }

    const userId = user.id;

    // 1. Synthesize or Use Provided "DNA" Master Prompt
    let masterPrompt = dnaPrompt;
    if (!masterPrompt && answers) {
      masterPrompt = await synthesizeDigitalShadow(answers, locale);
    }

    // 2. Update Profile with DNA and mark onboarding complete
    const { data, error } = await authorizedSupabase
      .from('profiles')
      .update({
        digital_shadow_prompt: masterPrompt,
        raw_onboarding_data: answers,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      dna: masterPrompt,
      profile: data
    });

  } catch (error: any) {
    console.error('Onboarding synthesis failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
