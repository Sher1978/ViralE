'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { profileService, Profile } from '@/lib/services/profileService';
import dynamic from 'next/dynamic';
const StrategistChat = dynamic(() => import('@/components/studio/StrategistChat').then(m => m.StrategistChat), { 
  ssr: false,
  loading: () => null 
});

export function GlobalStrategist() {
  const params = useParams();
  const projectId = params?.id as string | undefined;
  const locale = params?.locale as string || 'en';
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const p = await profileService.ensureProfile();
        setProfile(p);
      } catch (err) {
        console.error('[GlobalStrategist] Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (isLoading || !profile) return null;

  // We don't render the strategist on onboarding or auth pages
  const win = (globalThis as any).window;
  const isExcluded = typeof win !== 'undefined' && (
    win.location.pathname.includes('/onboarding') || 
    win.location.pathname.includes('/auth') ||
    win.location.pathname.includes('/studio') ||
    win.location.pathname.includes('/dna') ||
    win.location.pathname.includes('/projects/new/script') ||
    win.location.pathname.endsWith('/projects') ||
    win.location.pathname.endsWith('/projects/')
  );

  if (isExcluded) return null;

  return (
    <StrategistChat 
      projectId={projectId || 'global'}
      userId={profile.id}
      locale={locale}
      context={projectId ? 'studio' : 'production'}
    />
  );
}
