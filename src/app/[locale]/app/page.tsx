import { redirect } from '@/navigation';
import { getLocale } from 'next-intl/server';

export default async function AppPage() {
  const locale = await getLocale();
  redirect({ href: '/app/projects', locale });
}
