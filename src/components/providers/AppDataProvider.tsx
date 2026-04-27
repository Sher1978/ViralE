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
  loadingIdeas: boolean;
  loadingArchived: boolean;
  refreshIdeas: (status: 'new' | 'archived', category?: string, force?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [archivedIdeas, setArchivedIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [dnaComplete, setDnaComplete] = useState(false);

  const fetchProfile = useCallback(async () => {
    const prof = await profileService.getOrCreateProfile();
    if (prof) {
      setProfile(prof);
      const answers = (prof as any).dna_answers || {};
      const isComplete = Object.values(answers).filter((v: any) => v && v.toString().length > 2).length >= 7;
      setDnaComplete(isComplete);
    }
  }, []);

  const fetchIdeas = useCallback(async (status: 'new' | 'archived', category?: string, force?: boolean) => {
    try {
      if (status === 'new') setLoadingIdeas(true);
      else setLoadingArchived(true);

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
        } else {
          setArchivedIdeas(ideasList);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${status} ideas:`, err);
    } finally {
      if (status === 'new') setLoadingIdeas(false);
      else setLoadingArchived(false);
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
    }
  }, [profile, fetchIdeas]);

  const updateProfileState = (updates: Partial<Profile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AppDataContext.Provider value={{
      profile,
      dnaComplete,
      ideas,
      archivedIdeas,
      loadingIdeas,
      loadingArchived,
      refreshIdeas: fetchIdeas,
      updateProfile: updateProfileState
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
