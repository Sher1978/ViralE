import { NextResponse } from 'next/server';
import { updateDnaPersona } from '@/lib/ai/gemini';
import { getAuthContext } from '@/lib/auth';

export async function GET() {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    const { data, error } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt, visual_style')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      dna: data?.digital_shadow_prompt,
      visualStyle: data?.visual_style 
    });
  } catch (error: any) {
    console.error('Fetch DNA failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;
    const { newData, visualStyle, locale = 'en', resetPrompt = false } = await req.json();
 
    // 1. If only updating visual style
    if (visualStyle && !newData) {
      const { data: currentProfile } = await authorizedSupabase
        .from('profiles')
        .select('visual_dna_config')
        .eq('id', userId)
        .single();

      const existingConfig = currentProfile?.visual_dna_config || {};
      const updatedConfig = { ...existingConfig, stylePreset: visualStyle };

      const { error } = await authorizedSupabase
        .from('profiles')
        .update({ 
          visual_style: visualStyle,
          visual_dna_config: updatedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return NextResponse.json({ success: true, visualStyle });
    }
 
    if (!newData) {
      return NextResponse.json({ error: 'Missing new data' }, { status: 400 });
    }
 
    // 2. Get current DNA
    const { data: profile } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt')
      .eq('id', userId)
      .single();
 
    const oldPersona = resetPrompt ? "" : (profile?.digital_shadow_prompt || "");
 
    // 3. Synthesize new DNA
    const updatedPersona = await updateDnaPersona(oldPersona, newData, locale);

    // 4. Save to database
    const updates: any = {
      digital_shadow_prompt: updatedPersona,
      updated_at: new Date().toISOString()
    };
    if (visualStyle) updates.visual_style = visualStyle;

    const { error } = await authorizedSupabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, dna: updatedPersona, visualStyle });
  } catch (error: any) {
    console.error('Update DNA failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function DELETE() {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const userId = user.id;

    // 1. Wipe all profile DNA, StoryBrand document and onboarding state
    const { error: profileError } = await authorizedSupabase
      .from('profiles')
      .update({
        digital_shadow_prompt: null,
        dna_answers: {},
        raw_onboarding_data: {},
        storybrand_raw_content: null,
        storybrand_filename: null,
        storybrand_file_size: null,
        storybrand_updated_at: null,
        industry_context: null,
        synthetic_training_data: null,
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    // 2. Wipe all ideation feed entries for this user
    const { error: ideasError } = await authorizedSupabase
      .from('ideation_feed')
      .delete()
      .eq('user_id', userId);

    if (ideasError) {
      console.warn('[Profile DNA Reset] Non-critical warning deleting ideas feed:', ideasError.message);
    }

    console.log(`[Profile DNA Reset] Completely wiped DNA, StoryBrand, and Ideas Feed for user ${userId}.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset DNA failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
