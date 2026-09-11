/**
 * Repository for personality profile persistence.
 */

import { PersonalityProfile, DEFAULT_PERSONALITY } from '../core/types/personality';
import { StorageAdapter } from './StorageAdapter';
import { StorageError } from '../core/types/errors';

const PERSONALITY_KEY = '@saturday/personality';

export class PersonalityRepository {
  constructor(private storage: StorageAdapter) {}

  /** Load the personality profile. Returns default if none saved. */
  async load(): Promise<PersonalityProfile> {
    const raw = await this.storage.get(PERSONALITY_KEY);
    if (!raw) return { ...DEFAULT_PERSONALITY };

    try {
      return JSON.parse(raw) as PersonalityProfile;
    } catch {
      throw new StorageError('Failed to parse personality profile');
    }
  }

  /** Save the personality profile. */
  async save(profile: PersonalityProfile): Promise<void> {
    await this.storage.set(PERSONALITY_KEY, JSON.stringify(profile));
  }

  /** Reset personality to default. */
  async reset(): Promise<PersonalityProfile> {
    const defaultProfile = { ...DEFAULT_PERSONALITY };
    await this.save(defaultProfile);
    return defaultProfile;
  }
}
