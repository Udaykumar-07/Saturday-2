/**
 * Gmail OAuth Authentication Provider for Saturday.
 *
 * Implements AuthenticationProvider for Google OAuth 2.0.
 * Uses `expo-auth-session` for secure browser-based OAuth with PKCE.
 * Scopes are restricted strictly to read-only (`gmail.readonly`).
 *
 * Tokens are securely stored in CredentialStore and NEVER exposed to the LLM.
 */

import * as AuthSession from 'expo-auth-session';
import { AuthenticationProvider } from '../../authentication/AuthenticationManager';
import { AuthSession as SaturdayAuthSession, AuthProviderType } from '../../../types/external';
import { SaturdayError } from '../../../types/errors';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Configuration placeholder for Google Cloud OAuth Client ID
export interface GmailAuthConfig {
  clientId?: string;
  redirectUri?: string;
}

export class GmailAuth implements AuthenticationProvider {
  readonly id = 'gmail';
  readonly name = 'Google Gmail';
  readonly type: AuthProviderType = 'oauth';
  readonly description = 'Access and summarize recent emails securely';
  readonly scopes = GMAIL_SCOPES;

  constructor(private config: GmailAuthConfig = {}) {}

  /**
   * Initiate Google OAuth 2.0 flow.
   * If running in test or without configured Client ID, provides an explicit simulated session.
   */
  async authenticate(): Promise<SaturdayAuthSession> {
    const clientId = this.config.clientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

    // Test / Dev fallback when no Client ID is configured yet
    if (!clientId) {
      return {
        serviceId: this.id,
        accessToken: `gmail_mock_access_${Date.now()}`,
        refreshToken: `gmail_mock_refresh_${Date.now()}`,
        expiresAt: Date.now() + 3600 * 1000,
        scopes: this.scopes,
        userEmail: 'user@example.com',
      };
    }

    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'saturday',
        path: 'auth/gmail',
      });

      const discovery: AuthSession.DiscoveryDocument = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
      };

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: this.scopes,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        // Exchange code for token
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            code: result.params.code,
            extraParams: { code_verifier: request.codeVerifier || '' },
            redirectUri,
          },
          discovery
        );

        return {
          serviceId: this.id,
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          expiresAt: tokenResponse.issuedAt
            ? (tokenResponse.issuedAt + (tokenResponse.expiresIn || 3600)) * 1000
            : Date.now() + 3600 * 1000,
          scopes: this.scopes,
          userEmail: 'user@gmail.com',
        };
      }

      throw new SaturdayError('Google authentication was cancelled or failed.', 'AUTH_CANCELLED', true);
    } catch (error) {
      if (error instanceof SaturdayError) throw error;
      throw new SaturdayError(
        `Google OAuth failed: ${error instanceof Error ? error.message : String(error)}`,
        'OAUTH_ERROR',
        true
      );
    }
  }

  /**
   * Refresh an expired Google OAuth access token using the refresh token.
   */
  async refreshSession(session: SaturdayAuthSession): Promise<SaturdayAuthSession> {
    const clientId = this.config.clientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

    if (!session.refreshToken) {
      throw new SaturdayError('No refresh token available to renew Gmail session.', 'TOKEN_REFRESH_FAILED', true);
    }

    if (!clientId) {
      // Mock refresh in dev/test
      return {
        ...session,
        accessToken: `gmail_mock_access_refreshed_${Date.now()}`,
        expiresAt: Date.now() + 3600 * 1000,
      };
    }

    try {
      const discovery: AuthSession.DiscoveryDocument = {
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const refreshed = await AuthSession.refreshAsync(
        {
          clientId,
          refreshToken: session.refreshToken,
        },
        discovery
      );

      return {
        ...session,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || session.refreshToken,
        expiresAt: refreshed.issuedAt
          ? (refreshed.issuedAt + (refreshed.expiresIn || 3600)) * 1000
          : Date.now() + 3600 * 1000,
      };
    } catch (error) {
      throw new SaturdayError(
        `Failed to refresh Gmail token: ${error instanceof Error ? error.message : String(error)}`,
        'TOKEN_REFRESH_FAILED',
        true
      );
    }
  }

  /**
   * Revoke Gmail OAuth access token.
   */
  async revokeSession(session: SaturdayAuthSession): Promise<void> {
    if (!session.accessToken) return;
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(session.accessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // Ignored on revoke
    }
  }
}
