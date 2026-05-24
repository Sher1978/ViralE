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

  // If code is missing, it is likely an Implicit Flow redirect (hash parameters like #access_token=...)
  // due to Supabase enforcing Implicit Flow for wildcard preview domains (*.vercel.app).
  // We return a client-side bridge HTML page to extract the hash and set the cookie before redirecting.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authenticating...</title>
      <style>
        body {
          background: #050505;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
        }
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          border-top: 3px solid #06b6d4;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .container {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <div style="font-weight: 600; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #06b6d4;">Вход в Систему</div>
        <div style="color: #666; font-size: 12px; margin-top: 8px; letter-spacing: 0.05em;">Синхронизация сессии...</div>
      </div>
      <script>
        (function() {
          const hash = window.location.hash;
          const params = new URLSearchParams(hash.replace('#', '?'));
          const accessToken = params.get('access_token');
          const next = new URLSearchParams(window.location.search).get('next') || '/app/projects';
          
          if (accessToken) {
            const supabaseUrl = "${supabaseUrl}";
            const match = supabaseUrl.match(/(?:https?:\\/\\/)?([^.]+)/);
            const projectRef = match ? match[1] : '';
            if (projectRef) {
              const cookieName = "sb-" + projectRef + "-auth-token";
              document.cookie = cookieName + "=" + accessToken + "; path=/; max-age=604800; SameSite=Lax; Secure";
            }
            // Delay redirect slightly to ensure iOS Safari persists the cookie before context unload
            setTimeout(function() {
              window.location.replace(window.location.origin + next + hash);
            }, 100);
          } else {
            window.location.replace(window.location.origin + "/auth?error=auth-failure");
          }
        })();
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
