/**
 * useExternalProviders Hook
 * 
 * Manages external AI provider connections (OpenAI, Anthropic, Google Gemini).
 * Provides methods to connect, disconnect, and test provider API keys.
 */

import { useState, useEffect } from 'react';
import { getServices } from '../services/container';

export interface ExternalProviderStatus {
  id: string;
  name: string;
  connected: boolean;
  valid: boolean;
  models: string[];
}

export const useExternalProviders = () => {
  const [providers, setProviders] = useState<ExternalProviderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const services = getServices();
  const credentialStore = services.credentialStore;
  const externalRegistry = services.externalRegistry;

  // Provider definitions with metadata
  const providerDefinitions = [
    {
      id: 'openai_provider',
      name: 'OpenAI',
      models: ['GPT-4', 'GPT-4o', 'o1'],
    },
    {
      id: 'anthropic_provider',
      name: 'Anthropic Claude',
      models: ['Claude 3.5 Sonnet', 'Claude 3 Opus'],
    },
    {
      id: 'google_gemini_provider',
      name: 'Google Gemini',
      models: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash'],
    },
  ];

  // Load provider connection status
  const loadProviders = async () => {
    try {
      const statuses = await Promise.all(
        providerDefinitions.map(async (def) => {
          const connected = await credentialStore.has(def.id);
          return {
            id: def.id,
            name: def.name,
            connected,
            valid: connected, // Assume valid if connected; test can verify
            models: def.models,
          };
        })
      );
      setProviders(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  /**
   * Connect a provider by storing its API key.
   */
  const connectProvider = async (id: string, apiKey: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const provider = externalRegistry.get(id);
      if (!provider) {
        throw new Error(`Provider ${id} not found in registry`);
      }

      // Validate API key before storing
      const isValid = await (provider as any).validateApiKey(apiKey);
      if (!isValid) {
        setError('Invalid API key. Please check your key and try again.');
        setLoading(false);
        return false;
      }

      // Store the API key
      await credentialStore.store(id, { apiKey });

      // Reload provider statuses
      await loadProviders();

      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return false;
    }
  };

  /**
   * Disconnect a provider by removing its stored credentials.
   */
  const disconnectProvider = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await credentialStore.remove(id);
      await loadProviders();
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  /**
   * Test the connection to a provider by validating its stored API key.
   */
  const testConnection = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const provider = externalRegistry.get(id);
      if (!provider) {
        throw new Error(`Provider ${id} not found in registry`);
      }

      const credentials = await credentialStore.retrieve<{ apiKey: string }>(id);
      if (!credentials || !credentials.apiKey) {
        setError('No API key found. Please connect first.');
        setLoading(false);
        return false;
      }

      const isValid = await (provider as any).validateApiKey(credentials.apiKey);

      if (!isValid) {
        setError('API key validation failed. The key may be invalid or expired.');
      }

      // Update provider status
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, valid: isValid } : p))
      );

      setLoading(false);
      return isValid;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return false;
    }
  };

  return {
    providers,
    connectProvider,
    disconnectProvider,
    testConnection,
    loading,
    error,
  };
};
