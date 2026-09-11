import { PersonalityRepository } from '../src/storage/PersonalityRepository';
import { PersonalityService } from '../src/services/PersonalityService';
import { DEFAULT_PERSONALITY, PersonalityProfile } from '../src/core/types/personality';
import { StorageAdapter } from '../src/storage/StorageAdapter';

class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
  async multiGet(keys: string[]) {
    const res: Record<string, string | null> = {};
    for (const key of keys) res[key] = this.store.get(key) ?? null;
    return res;
  }
  async multiSet(entries: Array<[string, string]>) {
    for (const [k, v] of entries) this.store.set(k, v);
  }
  async clear() {
    this.store.clear();
  }
}

describe('Personality Foundation & Service', () => {
  let storage: MemoryStorageAdapter;
  let repo: PersonalityRepository;
  let service: PersonalityService;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    repo = new PersonalityRepository(storage);
    service = new PersonalityService(repo);
  });

  test('loads default personality when no profile is saved', async () => {
    const profile = await service.getProfile();
    expect(profile).toEqual(DEFAULT_PERSONALITY);
    expect(profile.verbosity).toBe('concise');
    expect(profile.tone).toBe('neutral');
    expect(profile.initiative).toBe('balanced');
  });

  test('updates personality profile and persists changes', async () => {
    const updated = await service.updateProfile({
      verbosity: 'detailed',
      tone: 'casual',
      userName: 'Alex',
    });

    expect(updated.verbosity).toBe('detailed');
    expect(updated.tone).toBe('casual');
    expect(updated.userName).toBe('Alex');

    // Create fresh service instance to verify persistence
    const freshService = new PersonalityService(repo);
    const loaded = await freshService.getProfile();
    expect(loaded.verbosity).toBe('detailed');
    expect(loaded.userName).toBe('Alex');
  });

  test('generates system prompt adhering to personality settings', async () => {
    await service.updateProfile({
      verbosity: 'concise',
      tone: 'professional',
      initiative: 'high',
      userName: 'Sarah',
    });

    const prompt = await service.generateSystemPrompt();
    expect(prompt).toContain('Saturday');
    expect(prompt).toContain('Keep responses brief');
    expect(prompt).toContain('polished, professional tone');
    expect(prompt).toContain('Sarah');
    expect(prompt).toContain('Never pretend an action was completed');
  });

  test('resets personality to default', async () => {
    await service.updateProfile({ verbosity: 'detailed', tone: 'casual' });
    const reset = await service.reset();

    expect(reset.verbosity).toBe(DEFAULT_PERSONALITY.verbosity);
    expect(reset.tone).toBe(DEFAULT_PERSONALITY.tone);
  });
});
