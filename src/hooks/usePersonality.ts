/**
 * Hook for managing Saturday's personality settings.
 */

import { useState, useEffect, useCallback } from 'react';
import { PersonalityProfile, DEFAULT_PERSONALITY } from '../core/types/personality';
import { getServices } from '../services/container';

export interface UsePersonalityReturn {
  personality: PersonalityProfile;
  isLoading: boolean;
  updatePersonality: (updates: Partial<PersonalityProfile>) => Promise<void>;
  resetPersonality: () => Promise<void>;
}

export function usePersonality(): UsePersonalityReturn {
  const [personality, setPersonality] = useState<PersonalityProfile>(DEFAULT_PERSONALITY);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const services = getServices();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const profile = await services.personalityService.getProfile();
        if (isMounted) {
          setPersonality(profile);
        }
      } catch (err) {
        console.error('Failed to load personality:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [services]);

  const updatePersonality = useCallback(
    async (updates: Partial<PersonalityProfile>) => {
      try {
        const updated = await services.personalityService.updateProfile(updates);
        setPersonality(updated);
      } catch (err) {
        console.error('Failed to update personality:', err);
        throw err;
      }
    },
    [services]
  );

  const resetPersonality = useCallback(async () => {
    try {
      const def = await services.personalityService.reset();
      setPersonality(def);
    } catch (err) {
      console.error('Failed to reset personality:', err);
      throw err;
    }
  }, [services]);

  return {
    personality,
    isLoading,
    updatePersonality,
    resetPersonality,
  };
}
