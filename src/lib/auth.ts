import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { notifyNewUserRegistration } from '@/lib/telegram';

/**
 * Server-side helper to get the authenticated context (user + authorized client).
 * This ensures that API routes can query data that respects RLS.
 */
export async function getAuthContext({ skipProfileCheck = false }: { skipProfileCheck?: boolean } = {}) {
  const cookieStore = await cookies();
  
  // Extract project ref from URL for cookie naming
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let projectRef = '';
  try {
    projectRef = supabaseUrl.split('.')[0].split('//')[1] || '';
  } catch (e) {
    console.error('Failed to parse Supabase URL for projectRef:', supabaseUrl);
  }
  
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : '';
  const token = cookieName 
    ? (cookieStore.get(cookieName)?.value || cookieStore.get(`${cookieName}.0`)?.value)
    : undefined;

  const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      db: {
        schema
      },
      global: token ? {
        headers: {
          Authorization: `Bearer ${token}`
        }
      } : undefined
    }
  );

  let user = null;
  let authError: any = null;

  if (!token) {
    console.warn('[Auth] No token found in cookies:', cookieName);
  } else {
    try {
      const { data: { user: foundUser }, error } = await supabase.auth.getUser(token);
      user = foundUser;
      authError = error;
    } catch (err) {
      authError = err;
    }
  }

  if (authError || !user) {
    console.error('[Auth] Context establishment failed:', { 
      hasToken: !!token, 
      cookieName,
      error: authError?.message || authError
    });
    throw new Error('Unauthorized');
  }

  console.log(`✓ [Auth] Context established for user: ${user.id} (${user.aud})`);

  // Ensure profile exists in DB to prevent foreign key violations (projects_user_id_fkey)
  if (!skipProfileCheck) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        console.log('[Auth] Creating missing profile for user:', user.id);
        const stableNum = parseInt(user.id.slice(0, 4), 16) % 10000;
        const defaultName = `Media Creator #${stableNum}`;
        
        const cleanId = user.id.replace(/-/g, '');
        const userRefCode = `ref_${cleanId.slice(0, 4).toLowerCase()}${cleanId.slice(-4).toLowerCase()}`;
        
        let inviterId: string | null = null;
        try {
          const refCookie = cookieStore.get('viral_ref_code')?.value;
          if (refCookie) {
            const { data: inviter } = await supabase
              .from('profiles')
              .select('id')
              .eq('referral_code', refCookie.trim().toLowerCase())
              .single();
            if (inviter && inviter.id !== user.id) {
              inviterId = inviter.id;
            }
          }
        } catch (e) {
          console.warn('[Auth] Could not resolve inviter:', e);
        }

        const profileData = {
          id: user.id,
          email: user.email || `anon_${user.id}@viral.engine`,
          full_name: user.user_metadata?.full_name || defaultName,
          avatar_url: user.user_metadata?.avatar_url || null,
          credits_balance: 0,
          digital_shadow_prompt: null,
          industry_context: null,
          onboarding_completed: false,
          tier: 'free',
          subscription_status: 'active',
          preferred_language: 'ru',
          referral_code: userRefCode,
          referred_by_id: inviterId,
          partner_balance_usd: 0.00
        };
        const { error: insertErr } = await supabase.from('profiles').insert(profileData);
        if (insertErr) throw insertErr;
        
        notifyNewUserRegistration(profileData).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[Auth] Failed to ensure profile:', err);
      try {
        const { notifyAdminError } = await import('@/lib/telegram');
        notifyAdminError({
          source: 'Auth:EnsureProfile',
          error: err,
          userId: user.id,
          userEmail: user.email,
          extra: { action: 'insert_profile' }
        }).catch(() => {});
      } catch (e) {
        console.error('Failed to notify admin of auth error:', e);
      }
    }
  }

  return { user, supabase };
}

/**
 * Legacy wrapper for getAuthenticatedUser.
 */
export async function getAuthenticatedUser() {
  const { user } = await getAuthContext();
  return user;
}
