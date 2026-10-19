import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app/projects';

  const canonicalOrigin = (origin && origin !== 'null') ? origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.virale.uno');

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
        await cookieStore.set('virale_legal_consent', 'true', {
          path: '/',
          maxAge: 31536000,
          sameSite: 'lax',
          secure: true,
        });
        if (data.session.user?.id) {
          await cookieStore.set(`viral_engine_legal_consent_${data.session.user.id}`, 'true', {
            path: '/',
            maxAge: 31536000,
            sameSite: 'lax',
            secure: true,
          });
        }
        console.log('[AuthCallback] Successfully set raw access token and consent cookie:', cookieName);
      }

      // Synchronize Profile and Notify SuperAdmin on New Registration
      const user = data.session.user;
      if (user) {
        try {
          const { supabaseAdmin } = await import('@/lib/supabase');
          const { notifyNewUserRegistration } = await import('@/lib/telegram');

          const googleName = user.user_metadata?.full_name || user.user_metadata?.name || null;
          const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          const userEmail = user.email || null;

          // Check for referral inviter
          const refCookie = cookieStore.get('viral_ref_code')?.value;
          let inviterId: string | null = null;
          if (refCookie) {
            const { data: inviter } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('referral_code', refCookie.trim().toLowerCase())
              .maybeSingle();
            if (inviter && inviter.id !== user.id) {
              inviterId = inviter.id;
            }
          }

          // Check existing profile
          const { data: existingProf } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          const isNewlyCreated =
            !existingProf ||
            (existingProf.created_at &&
              Date.now() - new Date(existingProf.created_at).getTime() < 30 * 60 * 1000) ||
            (user.created_at &&
              Date.now() - new Date(user.created_at).getTime() < 30 * 60 * 1000);

          if (!existingProf) {
            const cleanId = user.id.replace(/-/g, '');
            const referralCode = `ref_${cleanId.slice(0, 4).toLowerCase()}${cleanId.slice(-4).toLowerCase()}`;
            const newProfileData = {
              id: user.id,
              email: userEmail,
              full_name: googleName || `Media Creator #${parseInt(user.id.slice(0, 4), 16) % 10000}`,
              avatar_url: googleAvatar,
              credits_balance: 0,
              tier: 'free',
              subscription_status: 'active',
              preferred_language: 'ru',
              referral_code: referralCode,
              referred_by_id: inviterId,
              raw_onboarding_data: { registration_notified: false },
            };
            await supabaseAdmin.from('profiles').insert(newProfileData);
            await notifyNewUserRegistration({
              ...newProfileData,
              auth_provider: user.app_metadata?.provider || 'Google OAuth',
              created_at: user.created_at,
            });
          } else {
            const updates: Record<string, any> = {};
            if (userEmail && (!existingProf.email || existingProf.email.includes('anon_'))) {
              updates.email = userEmail;
            }
            if (googleName && (!existingProf.full_name || existingProf.full_name === 'Creator')) {
              updates.full_name = googleName;
            }
            if (googleAvatar && !existingProf.avatar_url) {
              updates.avatar_url = googleAvatar;
            }
            if (inviterId && !existingProf.referred_by_id) {
              updates.referred_by_id = inviterId;
            }

            if (Object.keys(updates).length > 0) {
              await supabaseAdmin.from('profiles').update(updates).eq('id', user.id);
            }

            if (isNewlyCreated && !existingProf.raw_onboarding_data?.registration_notified) {
              await notifyNewUserRegistration({
                ...existingProf,
                ...updates,
                auth_provider: user.app_metadata?.provider || 'Google OAuth',
                created_at: user.created_at || existingProf.created_at,
              });
            }
          }
        } catch (syncErr) {
          console.error('[AuthCallback] Failed to sync profile or notify registration:', syncErr);
        }
      }

      return NextResponse.redirect(`${canonicalOrigin}${next}`);
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
            var projectRef = '';
            try {
              projectRef = new URL(supabaseUrl).hostname.split('.')[0];
            } catch (e) {}
            if (projectRef) {
              const cookieName = "sb-" + projectRef + "-auth-token";
              document.cookie = cookieName + "=" + accessToken + "; path=/; max-age=604800; SameSite=Lax; Secure";
              document.cookie = "virale_legal_consent=true; path=/; max-age=31536000; SameSite=Lax; Secure";
              try {
                localStorage.setItem('virale_legal_consent_done', 'true');
                localStorage.setItem('virale_cookie_consent', 'accepted_' + Date.now());
              } catch (e) {}
            }
            // Delay redirect slightly to ensure iOS Safari persists the cookie before context unload
            const targetOrigin = window.location.origin;
            setTimeout(function() {
              window.location.replace(targetOrigin + next + hash);
            }, 20);
          } else {
            const targetOrigin = window.location.origin;
            window.location.replace(targetOrigin + "/auth?error=auth-failure");
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
