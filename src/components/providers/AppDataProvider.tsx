'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { profileService, Profile } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase';
import { Idea } from '@/components/ideas/IdeaCard';

interface AppDataContextType {
  profile: Profile | null;
  dnaComplete: boolean;
  ideas: Idea[];
  archivedIdeas: Idea[];
  usedIdeas: Idea[];
  loadingIdeas: boolean;
  loadingArchived: boolean;
  loadingUsed: boolean;
  refreshIdeas: (status: 'new' | 'archived' | 'used', category?: string, force?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  moveIdeaLocally: (ideaId: string, fromStatus: string, toStatus: string) => void;
  markIdeaAsUsed: (ideaId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [archivedIdeas, setArchivedIdeas] = useState<Idea[]>([]);
  const [usedIdeas, setUsedIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [loadingUsed, setLoadingUsed] = useState(true);
  const [dnaComplete, setDnaComplete] = useState(false);

  const fetchProfile = useCallback(async () => {
    const prof = await profileService.getOrCreateProfile();
    if (prof) {
      setProfile(prof);
      const answers = (prof as any).dna_answers || {};
      const validAnswersCount = Object.values(answers).filter((v: any) => v && v.toString().length > 2).length;
      const isComplete = validAnswersCount > 0 || (prof.digital_shadow_prompt && prof.digital_shadow_prompt.trim().length > 10);
      setDnaComplete(!!isComplete);
    }
  }, []);

  const fetchIdeas = useCallback(async (status: 'new' | 'archived' | 'used', category?: string, force?: boolean) => {
    try {
      if (status === 'new') setLoadingIdeas(true);
      else if (status === 'archived') setLoadingArchived(true);
      else if (status === 'used') setLoadingUsed(true);

      let url = `/api/ideas?status=${status}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
        if (force) {
          setIdeas(prev => prev.filter(i => (i as any).category !== category));
          url += `&force=true`;
        }
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
        } else if (status === 'archived') {
          setArchivedIdeas(ideasList);
        } else if (status === 'used') {
          setUsedIdeas(ideasList);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${status} ideas:`, err);
    } finally {
      if (status === 'new') setLoadingIdeas(false);
      else if (status === 'archived') setLoadingArchived(false);
      else if (status === 'used') setLoadingUsed(false);
    }
  }, []);

  // 1. Initial Load - Profile & DNA
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // 2. Pre-fetch ideas once profile is ready
  useEffect(() => {
    if (profile) {
      fetchIdeas('new');
      fetchIdeas('archived');
      fetchIdeas('used');
    }
  }, [profile, fetchIdeas]);

  const updateProfileState = (updates: Partial<Profile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const moveIdeaLocally = useCallback((ideaId: string, fromStatus: string, toStatus: string) => {
    if (fromStatus === 'new') {
      // If we are in 'New' tab, just update the status so the star turns gold
      // We don't remove it from the list here anymore to allow the user to see the saved state
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: toStatus as any } : i));
      
      // Also add to archived list for global state consistency
      const ideaToMove = ideas.find(i => i.id === ideaId);
      if (ideaToMove && toStatus === 'archived') {
        setArchivedIdeas(prev => {
          if (prev.find(p => p.id === ideaId)) return prev;
          return [{...ideaToMove, status: 'archived'}, ...prev];
        });
      }
    } else {
      // If we are in 'Archived' tab, removing it and moving back to 'new' is correct
      let ideaToMove: Idea | undefined;
      setArchivedIdeas(prev => {
        ideaToMove = prev.find(i => i.id === ideaId);
        return prev.filter(i => i.id !== ideaId);
      });
      if (ideaToMove) {
        setIdeas(prev => {
          if (prev.find(p => p.id === ideaId)) return prev;
          return [{...ideaToMove!, status: 'new'}, ...prev];
        });
      } else {
        // Fallback for cases where idea came from outside the local state
        fetchIdeas('new');
        fetchIdeas('archived');
      }
    }
  }, [ideas, fetchIdeas]);

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
      ideas,
      archivedIdeas,
      usedIdeas,
      loadingIdeas,
      loadingArchived,
      loadingUsed,
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
