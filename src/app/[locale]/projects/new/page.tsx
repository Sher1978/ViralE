import { redirect } from 'next/navigation';

export default async function NewProjectRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Redirect to the first step of the wizard: Script Lab
  redirect(`/${locale}/projects/new/script`);
}
