/**
 * Generic Authentication Manager for Saturday.
 *
 * Coordinates authentication sessions across OAuth, API keys, and device auth.
 * Manages token lifecycle, refresh, revocation, and connected services metadata.
 * Emits state changes for real-time UI synchronization.
 */

import {
  AuthSession,
  AuthProviderType,
  ConnectedService,
} from '../../types/external';
import {
  AuthenticationRequiredError,
  AuthenticationExpiredError,
  SaturdayError,
} from '../../types/errors';
import { CredentialStore } from './CredentialStore';

export interface AuthenticationProvider {
  readonly id: string;
  readonly name: string;
  readonly type: AuthProviderType;
  readonly description?: string;
  readonly scopes?: string[];
  authenticate(): Promise<AuthSession>;
  refreshSession?(session: AuthSession): Promise<AuthSession>;
  revokeSession?(session: AuthSession): Promise<void>;
}

export type AuthStateChangeCallback = (serviceId: string, isConnected: boolean) => void;

export class AuthenticationManager {
  private providers: Map<string, AuthenticationProvider> = new Map();
  private stateListeners: Set<AuthStateChangeCallback> = new Set();

  constructor(private credentialStore: CredentialStore) {}

  /**
   * Register an authentication provider for a service.
   */
  registerProvider(provider: AuthenticationProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister an authentication provider.
   */
  unregisterProvider(serviceId: string): void {
    this.providers.delete(serviceId);
  }

  /**
   * Check if a service currently has valid, unexpired credentials.
   */
  async isAuthenticated(serviceId: string): Promise<boolean> {
    const session = await this.getSession(serviceId);
    if (!session) return false;

    // Check expiration if expiresAt is provided
    if (session.expiresAt && Date.now() >= session.expiresAt) {
      // Try refreshing if provider supports it
      const provider = this.providers.get(serviceId);
      if (provider?.refreshSession) {
        try {
          await this.refreshSession(serviceId);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Get the stored session for a service.
   */
  async getSession(serviceId: string): Promise<AuthSession | null> {
    return this.credentialStore.retrieve<AuthSession>(serviceId);
  }

  /**
   * Initiate authentication for a service.
   */
  async authenticate(serviceId: string): Promise<AuthSession> {
    const provider = this.providers.get(serviceId);
    if (!provider) {
      throw new AuthenticationRequiredError(
        serviceId,
        `No authentication provider registered for "${serviceId}".`
      );
    }

    try {
      const session = await provider.authenticate();
      await this.credentialStore.store(serviceId, session as unknown as Record<string, unknown>);
      this.notifyListeners(serviceId, true);
      return session;
    } catch (error) {
      throw new SaturdayError(
        `Authentication failed for ${serviceId}: ${error instanceof Error ? error.message : String(error)}`,
        'AUTHENTICATION_FAILED',
        true
      );
    }
  }

  /**
   * Manually store a session (e.g. from tests or API key entry).
   */
  async saveSession(serviceId: string, session: AuthSession): Promise<void> {
    await this.credentialStore.store(serviceId, session as unknown as Record<string, unknown>);
    this.notifyListeners(serviceId, true);
  }

  /**
   * Refresh an expired session.
   */
  async refreshSession(serviceId: string): Promise<AuthSession> {
    const provider = this.providers.get(serviceId);
    const session = await this.getSession(serviceId);

    if (!session) {
      throw new AuthenticationRequiredError(serviceId);
    }

    if (!provider?.refreshSession) {
      throw new AuthenticationExpiredError(
        serviceId,
        `Session for "${serviceId}" expired and cannot be refreshed automatically.`
      );
    }

    try {
      const refreshed = await provider.refreshSession(session);
      await this.credentialStore.store(serviceId, refreshed as unknown as Record<string, unknown>);
      return refreshed;
    } catch (error) {
      await this.disconnect(serviceId);
      throw new AuthenticationExpiredError(
        serviceId,
        `Failed to refresh session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect and clear credentials for a service.
   */
  async disconnect(serviceId: string): Promise<void> {
    const session = await this.getSession(serviceId);
    const provider = this.providers.get(serviceId);

    if (session && provider?.revokeSession) {
      try {
        await provider.revokeSession(session);
      } catch {
        // Continue clearing credentials even if remote revoke fails
      }
    }

    await this.credentialStore.remove(serviceId);
    this.notifyListeners(serviceId, false);
  }

  /**
   * Get metadata list of all connected and available services for the UI.
   */
  async getConnectedServices(): Promise<ConnectedService[]> {
    const list: ConnectedService[] = [];

    for (const [id, provider] of this.providers.entries()) {
      const isAuthed = await this.isAuthenticated(id);
      const session = await this.getSession(id);

      list.push({
        id,
        name: provider.name,
        description: provider.description || `${provider.name} integration`,
        status: isAuthed ? 'connected' : 'disconnected',
        authType: provider.type,
        permissions: provider.scopes || [],
        userEmail: session?.userEmail,
        lastSync: session?.expiresAt ? Date.now() : undefined,
      });
    }

    return list;
  }

  /**
   * Subscribe to auth state changes.
   */
  onAuthStateChanged(callback: AuthStateChangeCallback): () => void {
    this.stateListeners.add(callback);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  private notifyListeners(serviceId: string, isConnected: boolean): void {
    for (const listener of this.stateListeners) {
      try {
        listener(serviceId, isConnected);
      } catch {
        // Don't let listener error break auth loop
      }
    }
  }
}
