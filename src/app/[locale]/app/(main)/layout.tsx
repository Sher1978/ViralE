import { getAuthContext } from '@/lib/auth';
import { redirect } from '@/navigation';
import { getLocale } from 'next-intl/server';
import { AppDataProvider } from '@/components/providers/AppDataProvider';
import { cookies } from 'next/headers';

import { SubscriptionWarning } from '@/components/ui/SubscriptionWarning';
import { TelegramGateModal } from '@/components/ui/TelegramGateModal';

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
    console.log(`[MainLayout] Onboarding status check for user ${user.id}`);
  }

  return (
    <AppDataProvider>
      <TelegramGateModal />
      <SubscriptionWarning />
      {children}
    </AppDataProvider>
  );
}
