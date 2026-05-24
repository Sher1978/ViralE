import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app/projects';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      let projectRef = '';
      const match = supabaseUrl.match(/(?:https?:\/\/)?([^.]+)/);
      if (match && match[1]) {
        projectRef = match[1];
      }

      const cookieName = projectRef ? `sb-${projectRef}-auth-token` : '';
      if (cookieName) {
        // Manually set the cookie as raw access_token to match SessionSync and getAuthContext expectations
        await cookieStore.set(cookieName, data.session.access_token, {
          path: '/',
          maxAge: 604800,
          sameSite: 'lax',
          secure: true,
        });
        console.log('[AuthCallback] Successfully set raw access token cookie:', cookieName);
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error('[AuthCallback] Exchange code error:', error);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth-failure`);
}
