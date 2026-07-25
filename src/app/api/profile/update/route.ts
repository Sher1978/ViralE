import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext().catch(() => null);
    if (!authCtx || !authCtx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authCtx.user.id;
    const body = await req.json();

    // Whitelist allowable fields for client update
    const allowedFields = ['full_name', 'avatar_url', 'preferred_language', 'digital_shadow_prompt'];
    const updates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Profile Update API] Database update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    console.error('[Profile Update API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
