import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Unified API Route for BYOK (HeyGen, Anthropic, Groq, Gemini, ElevenLabs, Late.dev) management.
 * Stores extra custom keys inside existing JSONB column `synthetic_training_data`.
 */

export async function GET() {
  try {
    const { user, supabase } = await getAuthContext();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
 
    if (error) throw error;
 
    const mask = (key: string | null) => 
      key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : null;
 
    const syntheticData = profile?.synthetic_training_data as Record<string, any> || {};
    const geminiKey = syntheticData.gemini_api_key || null;
    const latedevKey = syntheticData.latedev_api_key || profile?.latedev_api_key || null;
 
    return NextResponse.json({ 
      credits_balance: profile?.credits_balance || 0,
      heygen: {
        hasKey: !!profile?.heygen_api_key,
        maskedKey: mask(profile?.heygen_api_key)
      },
      anthropic: {
        hasKey: !!profile?.anthropic_api_key,
        maskedKey: mask(profile?.anthropic_api_key)
      },
      groq: {
        hasKey: !!profile?.groq_api_key,
        maskedKey: mask(profile?.groq_api_key)
      },
      gemini: {
        hasKey: !!geminiKey,
        maskedKey: mask(geminiKey)
      },
      elevenlabs: {
        hasKey: !!profile?.elevenlabs_api_key,
        maskedKey: mask(profile?.elevenlabs_api_key)
      },
      latedev: {
        hasKey: !!latedevKey,
        maskedKey: mask(latedevKey)
      }
    });
  } catch (error: any) {
    console.error('Fetch BYOK keys failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
 
export async function POST(req: Request) {
  try {
    const { user, supabase } = await getAuthContext();
    const { heygenKey, anthropicKey, groqKey, geminiKey, elevenlabsKey, latedevKey } = await req.json();
 
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const currentSynthetic = currentProfile?.synthetic_training_data as Record<string, any> || {};

    const updates: any = {
      updated_at: new Date().toISOString()
    };
 
    if (heygenKey !== undefined) updates.heygen_api_key = heygenKey;
    if (anthropicKey !== undefined) updates.anthropic_api_key = anthropicKey;
    if (groqKey !== undefined) updates.groq_api_key = groqKey;
    if (elevenlabsKey !== undefined) updates.elevenlabs_api_key = elevenlabsKey;
    
    let syntheticChanged = false;

    if (latedevKey !== undefined) {
      currentSynthetic.latedev_api_key = latedevKey;
      syntheticChanged = true;
    }

    if (geminiKey !== undefined) {
      currentSynthetic.gemini_api_key = geminiKey;
      syntheticChanged = true;
    }

    if (syntheticChanged) {
      updates.synthetic_training_data = currentSynthetic;
    }
 
    // Use supabaseAdmin to update profile
    const { error, data: updatedRow } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select();
 
    if (error) throw error;
    if (!updatedRow || updatedRow.length === 0) throw new Error('Update failed, profile not found.');
 
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save BYOK keys failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
