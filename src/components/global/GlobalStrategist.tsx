'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { profileService, Profile } from '@/lib/services/profileService';
import { StrategistChat } from '@/components/studio/StrategistChat';

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
  const isExcluded = typeof window !== 'undefined' && (
    window.location.pathname.includes('/onboarding') || 
    window.location.pathname.includes('/auth') ||
    window.location.pathname.includes('/studio') ||
    window.location.pathname.includes('/dna')
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
