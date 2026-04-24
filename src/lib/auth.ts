import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Server-side helper to get the authenticated context (user + authorized client).
 * This ensures that API routes can query data that respects RLS.
 */
export async function getAuthContext() {
  const cookieStore = await cookies();
  
  // Extract project ref from URL for cookie naming
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let projectRef = '';
  try {
    projectRef = supabaseUrl.split('.')[0].split('//')[1];
  } catch (e) {
    console.error('Failed to parse Supabase URL for projectRef:', supabaseUrl);
  }
  
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : '';
  const token = cookieName 
    ? (cookieStore.get(cookieName)?.value || cookieStore.get(`${cookieName}.0`)?.value)
    : undefined;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
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
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      console.log('[Auth] Creating missing profile for user:', user.id);
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || `anon_${user.id}@viral.engine`,
        credits_balance: 100
      });
    }
  } catch (err) {
    console.warn('[Auth] Failed to ensure profile:', err);
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
