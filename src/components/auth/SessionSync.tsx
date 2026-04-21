'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function SessionSync() {
  useEffect(() => {
    // 1. Sync initial session to cookie
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const projectRef = supabaseUrl.split('.')[0].split('//')[1];
      const cookieName = `sb-${projectRef}-auth-token`;

      if (session) {
        // Set cookie for 7 days
        document.cookie = `${cookieName}=${session.access_token}; path=/; max-age=604800; SameSite=Lax; pragma=no-cache`;
      } else {
        // Attempt anonymous sign in if no session found (Viral Engine "Shadow" mode)
        const { data: authData, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Anon auth failed:', error);
        } else if (authData.session) {
          document.cookie = `${cookieName}=${authData.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        }
      }
    };

    syncSession();

    // 2. Listen for auth changes and update cookie
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const projectRef = supabaseUrl.split('.')[0].split('//')[1];
      const cookieName = `sb-${projectRef}-auth-token`;

      console.log(`Auth event: ${event}`, session ? 'Session found' : 'No session');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          document.cookie = `${cookieName}=${session.access_token}; path=/; max-age=604800; SameSite=Lax`;
        }
      } else if (event === 'SIGNED_OUT') {
        document.cookie = `${cookieName}=; path=/; max-age=0`;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null; // This is a logic-only component
}
