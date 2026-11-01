import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authCtx = await getAuthContext().catch(() => null);
    if (!authCtx || !authCtx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('raw_onboarding_data')
      .eq('id', authCtx.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawData = (profile?.raw_onboarding_data as Record<string, any>) || {};
    return NextResponse.json({
      hasConsent: Boolean(rawData.consent_given_at),
      consent_given_at: rawData.consent_given_at || null,
      legal_consent_version: rawData.legal_consent_version || null,
      legal_consents: rawData.legal_consents || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext().catch(() => null);
    if (!authCtx || !authCtx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authCtx.user.id;
    const body = await req.json().catch(() => ({}));
    const { consents, legal_consent_version } = body;

    const nowIso = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { data: existingProf } = await supabaseAdmin
      .from('profiles')
      .select('raw_onboarding_data')
      .eq('id', userId)
      .maybeSingle();
    const rawData = (existingProf?.raw_onboarding_data as Record<string, any>) || {};

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        raw_onboarding_data: {
          ...rawData,
          consent_given_at: nowIso,
          legal_consent_version: legal_consent_version || '2026.1',
          legal_consents: {
            ...(consents || {}),
            timestamp: nowIso,
            user_agent: userAgent
          }
        },
        updated_at: nowIso
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('[Consent API] Failed to update consent in DB:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      consent_given_at: nowIso
    });
  } catch (err: any) {
    console.error('[Consent API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
