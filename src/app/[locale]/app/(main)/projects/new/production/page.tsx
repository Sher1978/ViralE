'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { projectService } from '@/lib/services/projectService';
import { profileService } from '@/lib/services/profileService';

function ProductionRedirector() {
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

        // Create a skeleton project for immediate Montage/B-roll entry
        const project = await projectService.createProject({
          title: locale === 'ru' ? 'Новый Продакшн' : 'New Production',
          userId: profile.id
        });

        if (project) {
          // Stage 3 entry point: Studio -> Assembly (Montage)
          router.replace(`/app/projects/${project.id}/studio?tab=assembly`);
        } else {
          router.push('/app/projects');
        }
      } catch (err) {
        console.error('Failed to initialize production project:', err);
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
        {locale === 'ru' ? 'Инициализация Продакшна...' : 'Initializing Production...'}
      </p>
    </div>
  );
}

export default function NewProductionPage() {
  return (
    <Suspense fallback={null}>
      <ProductionRedirector />
    </Suspense>
  );
}
