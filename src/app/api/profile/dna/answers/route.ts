import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    let { data: profile, error } = await authorizedSupabase
      .from('profiles')
      .select('dna_answers')
      .eq('id', userId)
      .single();

    if (error && error.message.includes('dna_answers')) {
      console.warn('dna_answers missing, trying fallback GET');
      const { data: fallback, error: fallbackError } = await authorizedSupabase
        .from('profiles')
        .select('raw_onboarding_data')
        .eq('id', userId)
        .single();
      
      if (!fallbackError) {
        profile = { dna_answers: fallback?.raw_onboarding_data } as any;
      }
    }

    return NextResponse.json({ answers: profile?.dna_answers || {} });
  } catch (error: any) {
    console.error('Fetch DNA answers failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;
    const { answers } = await req.json();

    if (!answers) {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 });
    }

    // First attempt: both columns
    const { error: firstError } = await authorizedSupabase
      .from('profiles')
      .update({
        dna_answers: answers,
        raw_onboarding_data: answers,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (firstError) {
      console.warn('Initial DNA update failed, trying fallback:', firstError.message);
      // Fallback: only raw_onboarding_data
      const { error: secondError } = await authorizedSupabase
        .from('profiles')
        .update({
          raw_onboarding_data: answers,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (secondError) throw secondError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save DNA answers failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
