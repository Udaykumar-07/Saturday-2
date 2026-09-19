/**
 * Hook for managing Local AI model selection, mode, and health status.
 */

import { useState, useEffect, useCallback } from 'react';
import { getServices } from '../services/container';
import { LocalModelInfo } from '../core/ai/LocalAIModelRegistry';
import { InferenceMode } from '../core/ai/LocalInferenceEngine';
import { LocalAISettings } from '../services/LocalAIService';

export interface UseLocalAIReturn {
  activeModel: LocalModelInfo;
  allModels: LocalModelInfo[];
  settings: LocalAISettings;
  isCheckingEndpoint: boolean;
  endpointReachable: boolean | null;
  selectModel: (modelId: string) => Promise<boolean>;
  setMode: (mode: InferenceMode) => Promise<void>;
  setEndpointUrl: (url: string) => Promise<void>;
  checkEndpoint: () => Promise<boolean>;
  testInference: (prompt?: string) => Promise<string>;
}

export function useLocalAI(): UseLocalAIReturn {
  const container = getServices();
  const service = container.localAIService;

  const [activeModel, setActiveModel] = useState<LocalModelInfo>(() => service.getActiveModel());
  const [allModels] = useState<LocalModelInfo[]>(() => service.getAllModels());
  const [settings, setSettings] = useState<LocalAISettings>({
    activeModelId: activeModel.id,
    mode: 'auto',
    endpointUrl: 'http://10.0.2.2:11434',
    enabled: true,
  });
  const [isCheckingEndpoint, setIsCheckingEndpoint] = useState(false);
  const [endpointReachable, setEndpointReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    service.getSettings().then((s) => {
      if (isMounted) {
        setSettings(s);
        setActiveModel(service.getActiveModel());
      }
    });
    return () => {
      isMounted = false;
    };
  }, [service]);

  const selectModel = useCallback(
    async (modelId: string) => {
      const ok = await service.selectModel(modelId);
      if (ok) {
        setActiveModel(service.getActiveModel());
        setSettings((prev) => ({ ...prev, activeModelId: modelId }));
      }
      return ok;
    },
    [service]
  );

  const setMode = useCallback(
    async (mode: InferenceMode) => {
      await service.setMode(mode);
      setSettings((prev) => ({ ...prev, mode }));
    },
    [service]
  );

  const setEndpointUrl = useCallback(
    async (endpointUrl: string) => {
      await service.setEndpointUrl(endpointUrl);
      setSettings((prev) => ({ ...prev, endpointUrl }));
    },
    [service]
  );

  const checkEndpoint = useCallback(async () => {
    setIsCheckingEndpoint(true);
    try {
      const health = await service.checkEndpointHealth();
      setEndpointReachable(health.reachable);
      return health.reachable;
    } finally {
      setIsCheckingEndpoint(false);
    }
  }, [service]);

  const testInference = useCallback(
    async (prompt?: string) => {
      return service.testInference(prompt);
    },
    [service]
  );

  return {
    activeModel,
    allModels,
    settings,
    isCheckingEndpoint,
    endpointReachable,
    selectModel,
    setMode,
    setEndpointUrl,
    checkEndpoint,
    testInference,
  };
}
