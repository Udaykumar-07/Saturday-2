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
  modelMap?: Record<string, string>; // displayName -> technicalName mapping
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
          
          // For connected Gemini provider, try to load actual available models
          let models = def.models;
          let modelMap: Record<string, string> = {};
          
          if (connected && def.id === 'google_gemini_provider') {
            try {
              const credentials = await credentialStore.retrieve<{ apiKey: string }>(def.id);
              if (credentials?.apiKey) {
                const provider = externalRegistry.get(def.id);
                if (provider && (provider as any).listAvailableModels) {
                  const fetchedModels = await (provider as any).listAvailableModels(credentials.apiKey);
                  if (fetchedModels && fetchedModels.length > 0) {
                    models = fetchedModels.map((m: any) => m.displayName);
                    // Create mapping from display name to technical name
                    fetchedModels.forEach((m: any) => {
                      modelMap[m.displayName] = m.name;
                    });
                  }
                }
              }
            } catch (err) {
              console.error('Error loading Gemini models:', err);
              // Fall back to default models
            }
          }
          
          return {
            id: def.id,
            name: def.name,
            connected,
            valid: connected, // Assume valid if connected; test can verify
            models,
            modelMap,
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
   * Connect a provider by storing its API key and optionally a model.
   */
  const connectProvider = async (id: string, apiKey: string, model?: string): Promise<boolean> => {
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

      // Store the API key and model (if provided)
      const credentials: any = { apiKey };
      if (model) {
        credentials.model = model;
      }
      await credentialStore.store(id, credentials);

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
   * Fetch available models for a provider (currently only Gemini).
   * Returns list of models that can be selected by the user.
   */
  const fetchAvailableModels = async (id: string, apiKey: string): Promise<Array<{
    name: string;
    displayName: string;
    description: string;
  }>> => {
    try {
      const provider = externalRegistry.get(id);
      if (!provider) {
        return [];
      }

      // Only Gemini supports fetching models via API
      if (id === 'google_gemini_provider' && (provider as any).listAvailableModels) {
        const models = await (provider as any).listAvailableModels(apiKey);
        return models;
      }

      return [];
    } catch (err) {
      console.error('Error fetching models:', err);
      return [];
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

  /**
   * Switch to a different model for a connected provider.
   */
  const switchModel = async (id: string, modelName: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const credentials = await credentialStore.retrieve<{ apiKey: string; model?: string }>(id);
      if (!credentials || !credentials.apiKey) {
        setError('Provider not connected. Please connect first.');
        setLoading(false);
        return false;
      }

      // Update the stored model
      await credentialStore.store(id, {
        ...credentials,
        model: modelName,
      });

      setLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return false;
    }
  };

  /**
   * Get the currently selected model for a provider.
   */
  const getCurrentModel = async (id: string): Promise<string | null> => {
    try {
      const credentials = await credentialStore.retrieve<{ apiKey: string; model?: string }>(id);
      return credentials?.model || null;
    } catch {
      return null;
    }
  };

  return {
    providers,
    connectProvider,
    disconnectProvider,
    testConnection,
    fetchAvailableModels,
    switchModel,
    getCurrentModel,
    loading,
    error,
  };
};
