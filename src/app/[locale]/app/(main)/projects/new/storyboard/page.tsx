'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { projectService } from '@/lib/services/projectService';
import { profileService } from '@/lib/services/profileService';

function RecordingRedirector() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    async function initializeAndRedirect() {
      try {
        const profile = await profileService.getOrCreateProfile();
        if (!profile) {
          router.push('/auth');
          return;
        }

        // Create a skeleton project for immediate Recording (Stage 2)
        const project = await projectService.createProject({
          title: locale === 'ru' ? 'Новая Запись' : 'New Recording',
          userId: profile.id
        });

        if (project) {
          // Stage 2 entry point: Studio -> Teleprompter
          router.replace(`/app/projects/${project.id}/studio?tab=teleprompter`);
        } else {
          router.push('/app/projects');
        }
      } catch (err) {
        console.error('Failed to initialize recording project:', err);
        router.push('/app/projects');
      }
    }

    initializeAndRedirect();
  }, [router, locale]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-2 border-purple-500/10 rounded-full" />
        <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 animate-pulse">
        {locale === 'ru' ? 'Подготовка Студии Записи...' : 'Preparing Recording Hub...'}
      </p>
    </div>
  );
}

export default function NewRecordingPage() {
  return (
    <Suspense fallback={null}>
      <RecordingRedirector />
    </Suspense>
  );
}
