/**
 * Secure Credential Store for Saturday.
 *
 * Uses Android Keystore-backed `expo-secure-store` on native devices.
 * Provides in-memory fallback for test and non-native environments.
 *
 * SECURITY INVARIANT:
 * Raw tokens, API keys, passwords, and client secrets are NEVER stored in plain-text
 * AsyncStorage and are NEVER passed to the LLM.
 */

import * as SecureStore from 'expo-secure-store';
import { StorageError } from '../../types/errors';

const CREDENTIAL_PREFIX = 'saturday_sec_';

export class CredentialStore {
  private inMemoryFallback: Map<string, string> = new Map();
  private isNativeSecureAvailable: boolean | null = null;

  private async checkAvailability(): Promise<boolean> {
    if (this.isNativeSecureAvailable !== null) {
      return this.isNativeSecureAvailable;
    }
    try {
      this.isNativeSecureAvailable = await SecureStore.isAvailableAsync();
    } catch {
      this.isNativeSecureAvailable = false;
    }
    return this.isNativeSecureAvailable;
  }

  private getKey(serviceId: string): string {
    // SecureStore keys only allow alphanumeric, dots, hyphens, and underscores
    const sanitized = serviceId.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${CREDENTIAL_PREFIX}${sanitized}`;
  }

  /**
   * Securely store credentials for a given service.
   */
  async store(serviceId: string, credentials: Record<string, unknown>): Promise<void> {
    const key = this.getKey(serviceId);
    const serialized = JSON.stringify(credentials);

    this.inMemoryFallback.set(key, serialized);

    try {
      const isAvailable = await this.checkAvailability();
      if (isAvailable) {
        await SecureStore.setItemAsync(key, serialized, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      }
    } catch {
      // Ignore native secure store failure in test environments
    }
  }

  /**
   * Securely retrieve credentials for a service. Returns null if not found.
   */
  async retrieve<T = Record<string, unknown>>(serviceId: string): Promise<T | null> {
    const key = this.getKey(serviceId);

    try {
      let raw: string | null = null;
      const isAvailable = await this.checkAvailability();

      if (isAvailable) {
        try {
          raw = await SecureStore.getItemAsync(key);
        } catch {
          raw = null;
        }
      }

      if (!raw) {
        raw = this.inMemoryFallback.get(key) ?? null;
      }

      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new StorageError(
        `Failed to retrieve credentials for ${serviceId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if credentials exist for a service.
   */
  async has(serviceId: string): Promise<boolean> {
    const creds = await this.retrieve(serviceId);
    return creds !== null;
  }

  /**
   * Remove stored credentials for a service.
   */
  async remove(serviceId: string): Promise<void> {
    const key = this.getKey(serviceId);
    this.inMemoryFallback.delete(key);
    try {
      const isAvailable = await this.checkAvailability();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Ignore native secure store failure in test environments
    }
  }

  /**
   * Clear all fallback storage (primarily for tests).
   */
  clearMemoryFallback(): void {
    this.inMemoryFallback.clear();
  }
}
