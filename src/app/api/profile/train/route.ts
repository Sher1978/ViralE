import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { distillSyntheticKnowledge, updateDnaPersona } from '@/lib/ai/gemini';

export async function POST(req: Request) {
  try {
    const { user, supabase } = await getAuthContext();
    const { rawData, locale = 'en' } = await req.json();

    if (!rawData) {
      return NextResponse.json({ error: 'Raw data is required' }, { status: 400 });
    }

    // 1. Fetch current DNA
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('digital_shadow_prompt, synthetic_training_data')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // 2. Distill the raw data into fragments
    const distilledFragments = await distillSyntheticKnowledge(rawData, locale);

    // 3. Update the DNA persona using synthesis
    const currentDna = profile.digital_shadow_prompt || '';
    const updatedDna = await updateDnaPersona(currentDna, distilledFragments, locale);

    // 4. Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        digital_shadow_prompt: updatedDna,
        synthetic_training_data: (profile.synthetic_training_data || '') + '\n---\n' + rawData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      dna: updatedDna,
      fragments: distilledFragments
    });

  } catch (error: any) {
    console.error('[TrainAPI] Failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
