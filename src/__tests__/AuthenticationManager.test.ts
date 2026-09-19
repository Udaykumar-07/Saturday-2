/**
 * Tests for AuthenticationManager and CredentialStore.
 */

import { AuthenticationManager, AuthenticationProvider } from '../core/external/authentication/AuthenticationManager';
import { CredentialStore } from '../core/external/authentication/CredentialStore';
import { AuthSession } from '../core/types/external';

describe('AuthenticationManager & CredentialStore', () => {
  let credentialStore: CredentialStore;
  let authManager: AuthenticationManager;

  beforeEach(() => {
    credentialStore = new CredentialStore();
    credentialStore.clearMemoryFallback();
    authManager = new AuthenticationManager(credentialStore);
  });

  test('reports unauthenticated when no session exists', async () => {
    const isAuthed = await authManager.isAuthenticated('gmail');
    expect(isAuthed).toBe(false);
  });

  test('authenticates via registered provider and stores session', async () => {
    const mockProvider: AuthenticationProvider = {
      id: 'gmail',
      name: 'Gmail',
      type: 'oauth',
      authenticate: jest.fn().mockResolvedValue({
        serviceId: 'gmail',
        accessToken: 'token_123',
        expiresAt: Date.now() + 3600000,
        scopes: ['gmail.readonly'],
        userEmail: 'test@example.com',
      } as AuthSession),
    };

    authManager.registerProvider(mockProvider);

    const session = await authManager.authenticate('gmail');
    expect(session.accessToken).toBe('token_123');

    const isAuthed = await authManager.isAuthenticated('gmail');
    expect(isAuthed).toBe(true);

    const stored = await authManager.getSession('gmail');
    expect(stored?.userEmail).toBe('test@example.com');
  });

  test('reports unauthenticated when session is expired', async () => {
    // Session expired 10 minutes ago
    await authManager.saveSession('service_expired', {
      serviceId: 'service_expired',
      accessToken: 'old_token',
      expiresAt: Date.now() - 600000,
      scopes: [],
    });

    const isAuthed = await authManager.isAuthenticated('service_expired');
    expect(isAuthed).toBe(false);
  });

  test('disconnects and clears credentials', async () => {
    const revokeMock = jest.fn().mockResolvedValue(undefined);
    authManager.registerProvider({
      id: 'test_svc',
      name: 'Test Service',
      type: 'api_key',
      authenticate: jest.fn(),
      revokeSession: revokeMock,
    });

    await authManager.saveSession('test_svc', {
      serviceId: 'test_svc',
      accessToken: 'secret_key',
      scopes: [],
    });

    expect(await authManager.isAuthenticated('test_svc')).toBe(true);

    await authManager.disconnect('test_svc');

    expect(await authManager.isAuthenticated('test_svc')).toBe(false);
    expect(await authManager.getSession('test_svc')).toBeNull();
    expect(revokeMock).toHaveBeenCalled();
  });

  test('lists connected services for UI', async () => {
    authManager.registerProvider({
      id: 'gmail',
      name: 'Google Gmail',
      type: 'oauth',
      authenticate: jest.fn(),
    });

    authManager.registerProvider({
      id: 'calendar',
      name: 'Google Calendar',
      type: 'oauth',
      authenticate: jest.fn(),
    });

    await authManager.saveSession('gmail', {
      serviceId: 'gmail',
      accessToken: 'token_abc',
      userEmail: 'me@gmail.com',
      scopes: ['gmail.readonly'],
    });

    const services = await authManager.getConnectedServices();
    expect(services).toHaveLength(2);

    const gmail = services.find((s) => s.id === 'gmail');
    const calendar = services.find((s) => s.id === 'calendar');

    expect(gmail?.status).toBe('connected');
    expect(gmail?.userEmail).toBe('me@gmail.com');
    expect(calendar?.status).toBe('disconnected');
  });
});
