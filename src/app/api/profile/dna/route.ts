import { NextResponse } from 'next/server';
import { updateDnaPersona } from '@/lib/ai/gemini';
import { getAuthContext } from '@/lib/auth';

export async function GET() {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { data, error } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return NextResponse.json({ dna: data?.digital_shadow_prompt });
  } catch (error: any) {
    console.error('Fetch DNA failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;
    const { newData, locale = 'en' } = await req.json();

    if (!newData) {
      return NextResponse.json({ error: 'Missing new data' }, { status: 400 });
    }

    // 1. Get current DNA
    const { data: profile } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt')
      .eq('id', userId)
      .single();

    const oldPersona = profile?.digital_shadow_prompt || "";

    // 2. Synthesize new DNA
    const updatedPersona = await updateDnaPersona(oldPersona, newData, locale);

    // 3. Save to database
    const { error } = await authorizedSupabase
      .from('profiles')
      .update({
        digital_shadow_prompt: updatedPersona,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, dna: updatedPersona });
  } catch (error: any) {
    console.error('Update DNA failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { error } = await authorizedSupabase
      .from('profiles')
      .update({
        digital_shadow_prompt: null,
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset DNA failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
