'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { profileService, Profile } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import { Idea } from '@/components/ideas/IdeaCard';
import { strategistService } from '@/lib/services/strategistService';

import { useLocale } from 'next-intl';

interface AppDataContextType {
  profile: Profile | null;
  dnaComplete: boolean;
  hasStrategistAccess: boolean;
  ideas: Idea[];
  archivedIdeas: Idea[];
  usedIdeas: Idea[];
  loadingIdeas: boolean;
  loadingArchived: boolean;
  loadingUsed: boolean;
  ideasError: string | null;
  clearIdeasError: () => void;
  refreshIdeas: (status: 'new' | 'archived' | 'used', category?: string, force?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  moveIdeaLocally: (ideaId: string, fromStatus: string, toStatus: string) => void;
  markIdeaAsUsed: (ideaId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [archivedIdeas, setArchivedIdeas] = useState<Idea[]>([]);
  const [usedIdeas, setUsedIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [loadingUsed, setLoadingUsed] = useState(true);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [dnaComplete, setDnaComplete] = useState(false);
  const [hasStrategistAccess, setHasStrategistAccess] = useState(false);

  const clearIdeasError = useCallback(() => {
    setIdeasError(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    const prof = await profileService.getOrCreateProfile();
    if (prof) {
      setProfile(prof);
      const answers = (prof as any).dna_answers || {};
      const validAnswersCount = Object.values(answers).filter((v: any) => v && v.toString().length > 2).length;
      const isComplete = validAnswersCount > 0 || (prof.digital_shadow_prompt && prof.digital_shadow_prompt.trim().length > 10);
      setDnaComplete(!!isComplete);

      // Fetch strategist access status
      strategistService.getAccessStatus(prof.id).then(status => {
        setHasStrategistAccess(status.hasAccess);
      }).catch(err => {
        console.error('Failed to fetch strategist access status:', err);
      });

      // Sync user language preference with active UI locale without forced page redirects
      const preferredLanguage = prof.preferred_language;
      if (!preferredLanguage) {
        // Initialize preferred language in database to match current active UI locale
        supabase.from('profiles').update({ preferred_language: locale }).eq('id', prof.id).then();
      }
    }
  }, [locale]);

  const fetchIdeas = useCallback(async (status: 'new' | 'archived' | 'used', category?: string, force?: boolean) => {
    try {
      if (status === 'new') setLoadingIdeas(true);
      else if (status === 'archived') setLoadingArchived(true);
      else if (status === 'used') setLoadingUsed(true);

      let url = `/api/ideas?status=${status}&locale=${locale}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
        if (force) {
          setIdeas(prev => prev.filter(i => (i as any).category !== category));
          url += `&force=true`;
        }
      } else if (force) {
        url += `&force=true`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const ideasList = Array.isArray(data) ? data : data.ideas || [];

        if (status === 'new') {
          if (category) {
            setIdeas(prev => {
              const filtered = prev.filter(i => (i as any).category !== category);
              return [...filtered, ...ideasList];
            });
          } else {
            setIdeas(ideasList);
          }
          setIdeasError(null);
        } else if (status === 'archived') {
          setArchivedIdeas(ideasList);
        } else if (status === 'used') {
          setUsedIdeas(ideasList);
        }
      } else {
        let errorMsg = locale === 'ru' ? 'Не удалось сгенерировать идеи' : 'Failed to generate ideas';
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (e) {
          try {
            const text = await res.text();
            if (text) errorMsg = text;
          } catch (e2) {}
        }
        console.error(`[AppDataProvider] Error fetching ${status} ideas:`, errorMsg);
        if (status === 'new') {
          setIdeasError(errorMsg);
          const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
          fetch('/api/report-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'Client Ideas Generation',
              error: errorMsg,
              url: win ? win.location.href : '',
            }),
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error(`Failed to fetch ${status} ideas:`, err);
      if (status === 'new') {
        const errorText = err?.message || (locale === 'ru' ? 'Ошибка сети при генерации идей' : 'Network error during idea generation');
        setIdeasError(errorText);
        const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
        fetch('/api/report-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'Client Ideas Exception',
            error: errorText,
            url: win ? win.location.href : '',
          }),
        }).catch(() => {});
      }
    } finally {
      if (status === 'new') setLoadingIdeas(false);
      else if (status === 'archived') setLoadingArchived(false);
      else if (status === 'used') setLoadingUsed(false);
    }
  }, [locale]);

  // Global Session Unhandled Error Listener -> Sends Admin Alert to Telegram
  useEffect(() => {
    const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
    if (!win) return;

    const handleWindowError = (event: any) => {
      const errorMsg = event.error?.message || event.message || 'Unhandled Window Error';
      const stack = event.error?.stack;

      fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Client Unhandled Exception',
          error: `${errorMsg} (${event.filename}:${event.lineno})`,
          url: win.location.href,
          extra: { stack }
        }),
      }).catch(() => {});
    };

    const handleUnhandledRejection = (event: any) => {
      const reason = event.reason;
      const errorMsg = typeof reason === 'string' ? reason : reason?.message || JSON.stringify(reason);

      fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Client Unhandled Promise Rejection',
          error: errorMsg,
          url: win.location.href,
          extra: { stack: reason?.stack }
        }),
      }).catch(() => {});
    };

    win.addEventListener('error', handleWindowError);
    win.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      win.removeEventListener('error', handleWindowError);
      win.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const hasFetchedIdeasRef = React.useRef(false);

  // 1. Initial Load - Profile & DNA
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // 2. Pre-fetch ideas once profile is ready (only once per session)
  useEffect(() => {
    if (profile?.id && !hasFetchedIdeasRef.current) {
      hasFetchedIdeasRef.current = true;
      fetchIdeas('new');
      fetchIdeas('archived');
      fetchIdeas('used');
    }
  }, [profile?.id, fetchIdeas]);

  const updateProfileState = (updates: Partial<Profile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const moveIdeaLocally = useCallback((ideaId: string, fromStatus: string, toStatus: string) => {
    let foundIdea: Idea | undefined = 
      ideas.find(i => i.id === ideaId) || 
      archivedIdeas.find(i => i.id === ideaId) || 
      usedIdeas.find(i => i.id === ideaId);

    if (!foundIdea) {
      fetchIdeas('new');
      fetchIdeas('archived');
      fetchIdeas('used');
      return;
    }

    const updatedIdea = { ...foundIdea, status: toStatus as any };

    // Remove or update in the source list
    if (fromStatus === 'new') {
      setIdeas(prev => prev.map(i => i.id === ideaId ? updatedIdea : i));
    } else if (fromStatus === 'archived') {
      setArchivedIdeas(prev => prev.filter(i => i.id !== ideaId));
    } else if (fromStatus === 'used') {
      setUsedIdeas(prev => prev.filter(i => i.id !== ideaId));
    }

    // Add or update in the target list
    if (toStatus === 'new') {
      setIdeas(prev => {
        if (prev.find(p => p.id === ideaId)) {
          return prev.map(i => i.id === ideaId ? updatedIdea : i);
        }
        return [updatedIdea, ...prev];
      });
    } else if (toStatus === 'archived') {
      setArchivedIdeas(prev => {
        if (prev.find(p => p.id === ideaId)) return prev;
        return [updatedIdea, ...prev];
      });
    } else if (toStatus === 'used') {
      setUsedIdeas(prev => {
        if (prev.find(p => p.id === ideaId)) return prev;
        return [updatedIdea, ...prev];
      });
    }
  }, [ideas, archivedIdeas, usedIdeas, fetchIdeas]);

  const markIdeaAsUsed = useCallback(async (ideaId: string) => {
    // 1. Instantly move in local state for zero-latency UX
    let ideaToMove: Idea | undefined;
    
    setIdeas(prev => {
      ideaToMove = prev.find(i => i.id === ideaId);
      return prev.filter(i => i.id !== ideaId);
    });
    
    setArchivedIdeas(prev => {
      if (!ideaToMove) ideaToMove = prev.find(i => i.id === ideaId);
      return prev.filter(i => i.id !== ideaId);
    });

    if (ideaToMove) {
      const updatedIdea = { ...ideaToMove, status: 'used' as const };
      setUsedIdeas(prev => {
        if (prev.find(p => p.id === ideaId)) return prev;
        return [updatedIdea, ...prev];
      });
    }

    // 2. Persist to Supabase via API
    try {
      await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, status: 'used' }),
      });
    } catch (err) {
      console.error('Failed to mark idea as used:', err);
    }
  }, [ideas]);

  return (
    <AppDataContext.Provider value={{
      profile,
      dnaComplete,
      hasStrategistAccess,
      ideas,
      archivedIdeas,
      usedIdeas,
      loadingIdeas,
      loadingArchived,
      loadingUsed,
      ideasError,
      clearIdeasError,
      refreshIdeas: fetchIdeas,
      updateProfile: updateProfileState,
      moveIdeaLocally,
      markIdeaAsUsed
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
