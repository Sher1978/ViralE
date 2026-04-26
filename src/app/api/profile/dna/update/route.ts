import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { updateDnaPersona } from '@/lib/ai/gemini';
import { profileService } from '@/lib/services/profileService';

/**
 * API for enriching the User's Brand DNA with new information.
 * This is the bridge between the chat/AI and the persistent database knowledge.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthContext();
    const { text, type = 'persona' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided to enrich DNA' }, { status: 400 });
    }

    console.log(`[DNA Update] Enriching DNA for user ${user.id} with new data...`);

    // 1. Fetch current profile
    const profile = await profileService.getProfile(user.id);
    if (!profile) throw new Error('Profile not found');

    // 2. Use Gemini to synthesize new knowledge into the existing DNA
    const oldDna = profile.digital_shadow_prompt || '';
    const updatedDna = await updateDnaPersona(oldDna, text);

    // 3. Update Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        digital_shadow_prompt: updatedDna,
        // Also log into a history or separate knowledge base if needed
        knowledge_base_json: {
          ...((profile.knowledge_base_json as object) || {}),
          last_update: new Date().toISOString(),
          enrichment_source: 'ai_assistant'
        }
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: 'Brand DNA successfully updated and synthesized.',
      updatedDna 
    });

  } catch (err: any) {
    console.error('[DNA Update] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
