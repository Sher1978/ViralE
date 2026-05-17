import { getAuthContext } from '@/lib/auth';
import { redirect } from '@/navigation';
import { getLocale } from 'next-intl/server';
import { AppDataProvider } from '@/components/providers/AppDataProvider';
import { cookies } from 'next/headers';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  
  const { user, supabase } = await getAuthContext({ skipProfileCheck: true }).catch((e) => {
    console.error('[MainLayout] Auth failed, redirecting to /auth:', e);
    redirect({ href: '/auth', locale });
    // This will never be reached because redirect throws, but TS needs it for narrowing
    throw e;
  });

  const cookieStore = await cookies();
  const isProfileOnboarded = cookieStore.get('profile_onboarded')?.value === 'true';

  if (!isProfileOnboarded) {
    console.log(`[MainLayout] Onboarding cookie missing for ${user.id}, performing DB check`);
    // Fetch profile to check onboarding completion status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    // If fetching fails or onboarding is not completed, redirect to onboarding page
    if (error || !profile?.onboarding_completed) {
      console.log(`[OnboardingGuard] User ${user.id} incomplete, redirecting to /app/onboarding`);
      redirect({ href: '/app/onboarding', locale });
    }
  }

  return (
    <AppDataProvider>
      {children}
    </AppDataProvider>
  );
}
