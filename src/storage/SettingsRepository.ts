/**
 * Repository for general application settings.
 */

import { StorageAdapter } from './StorageAdapter';
import { StorageError } from '../core/types/errors';

const SETTINGS_PREFIX = '@saturday/settings/';

export class SettingsRepository {
  constructor(private storage: StorageAdapter) {}

  /** Get a setting value. Returns null if not found. */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.storage.get(`${SETTINGS_PREFIX}${key}`);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new StorageError(`Failed to parse setting "${key}"`);
    }
  }

  /** Set a setting value. */
  async set<T>(key: string, value: T): Promise<void> {
    await this.storage.set(`${SETTINGS_PREFIX}${key}`, JSON.stringify(value));
  }

  /** Remove a setting. */
  async remove(key: string): Promise<void> {
    await this.storage.remove(`${SETTINGS_PREFIX}${key}`);
  }

  /** Clear all settings. */
  async clearAll(): Promise<void> {
    await this.storage.clear(SETTINGS_PREFIX);
  }
}
