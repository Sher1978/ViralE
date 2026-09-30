'use client';

import { useEffect } from 'react';
import { useRouter } from '@/navigation';

export default function AvatarStudioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/app/profile/byok');
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="animate-pulse text-xs font-black uppercase tracking-widest text-white/40">
        Перенаправление в API Ключи (BYOK)...
      </div>
    </div>
  );
}
