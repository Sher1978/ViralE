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
  const projectRef = supabaseUrl.split('.')[0].split('//')[1];
  
  const token = cookieStore.get(`sb-${projectRef}-auth-token`)?.value;

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
  let authError = null;

  try {
    const { data: { user: foundUser }, error } = await supabase.auth.getUser(token);
    user = foundUser;
    authError = error;
  } catch (err) {
    authError = err;
  }

  if (authError || !user) {
    console.error('Auth failed in getAuthContext:', { 
      hasToken: !!token, 
      error: authError
    });
    throw new Error('Unauthorized');
  }

  if (user) {
    console.log(`✓ Auth context established for user: ${user.id}`);
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
