import { getAuthContext } from '@/lib/auth';
import { redirect } from '@/navigation';
import { getLocale } from 'next-intl/server';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  
  let user, supabase;
  try {
    const auth = await getAuthContext();
    user = auth.user;
    supabase = auth.supabase;
  } catch (e) {
    console.error('[MainLayout] Auth failed, redirecting to /auth:', e);
    redirect({ href: '/auth', locale });
  }

  // Fetch profile to check onboarding completion status
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  // If fetching fails or onboarding is not completed, redirect to onboarding page
  // We don't need to check the path here because this layout is only active
  // for routes inside the (main) folder group.
  if (error || !profile?.onboarding_completed) {
    console.log(`[OnboardingGuard] User ${user.id} incomplete, redirecting to /app/onboarding`);
    redirect({ href: '/app/onboarding', locale });
  }

  return <>{children}</>;
}
