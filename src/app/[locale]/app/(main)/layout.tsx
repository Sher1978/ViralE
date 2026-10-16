import { getAuthContext } from '@/lib/auth';
import { redirect } from '@/navigation';
import { getLocale } from 'next-intl/server';
import { AppDataProvider } from '@/components/providers/AppDataProvider';
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  
  await getAuthContext({ skipProfileCheck: true }).catch((e) => {
    console.error('[MainLayout] Auth failed, redirecting to /auth:', e);
    redirect({ href: '/auth', locale });
    // This will never be reached because redirect throws, but TS needs it for narrowing
    throw e;
  });

  return (
    <AppDataProvider>
      {children}
    </AppDataProvider>
  );
}
