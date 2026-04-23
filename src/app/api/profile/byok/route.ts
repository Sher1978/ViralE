import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Unified API Route for BYOK (HeyGen & Anthropic) management.
 */

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('heygen_api_key, anthropic_api_key, groq_api_key')
      .eq('id', user.id)
      .single();
 
    if (error) throw error;
 
    const mask = (key: string | null) => 
      key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : null;
 
    return NextResponse.json({ 
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
      }
    });
  } catch (error: any) {
    console.error('Fetch BYOK keys failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
 
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { heygenKey, anthropicKey, groqKey } = await req.json();
 
    const updates: any = {
      updated_at: new Date().toISOString()
    };
 
    if (heygenKey !== undefined) updates.heygen_api_key = heygenKey;
    if (anthropicKey !== undefined) updates.anthropic_api_key = anthropicKey;
    if (groqKey !== undefined) updates.groq_api_key = groqKey;
 
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
 
    if (error) throw error;
 
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save BYOK keys failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
