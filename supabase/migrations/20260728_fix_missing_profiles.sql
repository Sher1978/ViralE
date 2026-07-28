-- Fix: Insert missing profiles for users who registered but have no profile row
-- This prevents foreign key constraint violations (projects_user_id_fkey)
INSERT INTO public.profiles (id, email, full_name, credits_balance, onboarding_completed, tier, subscription_status, preferred_language)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Media Creator #' || (abs(hashtext(au.id::text)) % 10000)::text),
  0,
  false,
  'free',
  'active',
  'ru'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
