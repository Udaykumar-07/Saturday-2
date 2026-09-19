/**
 * Integration Service for Saturday.
 *
 * Provides a high-level API for managing connected third-party integrations
 * (Gmail, Calendar, Maps, External AI models) and their permissions.
 * Bridges AuthenticationManager to the UI.
 */

import { ConnectedService, AuthSession } from '../core/types/external';
import { AuthenticationManager, AuthStateChangeCallback } from '../core/external/authentication/AuthenticationManager';

export class IntegrationService {
  constructor(private authManager: AuthenticationManager) {}

  /**
   * List all configured integrations with their connection statuses and permissions.
   */
  async getConnectedServices(): Promise<ConnectedService[]> {
    return this.authManager.getConnectedServices();
  }

  /**
   * Check if a specific service is currently connected and authenticated.
   */
  async isConnected(serviceId: string): Promise<boolean> {
    return this.authManager.isAuthenticated(serviceId);
  }

  /**
   * Connect and authenticate a service (triggers OAuth or interactive flow).
   */
  async connectService(serviceId: string): Promise<AuthSession> {
    return this.authManager.authenticate(serviceId);
  }

  /**
   * Disconnect and revoke access for a service.
   */
  async disconnectService(serviceId: string): Promise<void> {
    await this.authManager.disconnect(serviceId);
  }

  /**
   * Refresh session credentials for a service.
   */
  async refreshService(serviceId: string): Promise<AuthSession> {
    return this.authManager.refreshSession(serviceId);
  }

  /**
   * Subscribe to connection state changes.
   */
  onStateChange(callback: AuthStateChangeCallback): () => void {
    return this.authManager.onAuthStateChanged(callback);
  }
}
