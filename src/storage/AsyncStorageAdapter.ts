/**
 * AsyncStorage implementation of StorageAdapter.
 * Wraps React Native AsyncStorage with error handling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from './StorageAdapter';
import { StorageError } from '../core/types/errors';

export class AsyncStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      throw new StorageError(
        `Failed to read key "${key}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      throw new StorageError(
        `Failed to write key "${key}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw new StorageError(
        `Failed to remove key "${key}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getAllKeys(prefix?: string): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      if (prefix) {
        return allKeys.filter((key) => key.startsWith(prefix));
      }
      return [...allKeys];
    } catch (error) {
      throw new StorageError(
        `Failed to get keys: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, string | null> = {};
      for (const [key, value] of pairs) {
        result[key] = value;
      }
      return result;
    } catch (error) {
      throw new StorageError(
        `Failed to multi-get: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async multiSet(entries: Array<[string, string]>): Promise<void> {
    try {
      await AsyncStorage.multiSet(entries);
    } catch (error) {
      throw new StorageError(
        `Failed to multi-set: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      if (prefix) {
        const keys = await this.getAllKeys(prefix);
        if (keys.length > 0) {
          await AsyncStorage.multiRemove(keys);
        }
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      throw new StorageError(
        `Failed to clear storage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
