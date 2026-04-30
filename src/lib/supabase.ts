import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing. Studio features requiring DATABASE will be disabled.');
}

// Create the client, but guard against empty values if the library allows it, 
// or export a proxied version that handles missing keys gracefully.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        lock: (name, acquireTimeout, fn) => fn()
      }
    })
  : new Proxy({} as any, {
      get: () => {
        throw new Error('Supabase client called without valid NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local file.');
      }
    });

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : new Proxy({} as any, {
      get: () => {
        throw new Error('Supabase admin client called without valid SUPABASE_SERVICE_ROLE_KEY.');
      }
    });
