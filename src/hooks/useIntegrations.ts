/**
 * Hook for managing third-party integrations and privacy controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { ConnectedService } from '../core/types/external';
import { DataBoundaryPolicy } from '../core/external/execution/DataBoundaryManager';
import { getServices } from '../services/container';

export interface UseIntegrationsReturn {
  services: ConnectedService[];
  privacyPolicy: DataBoundaryPolicy;
  loadingServiceId: string | null;
  updatePrivacyPolicy: (updates: Partial<DataBoundaryPolicy>) => void;
  connectService: (serviceId: string) => Promise<void>;
  disconnectService: (serviceId: string) => Promise<void>;
  refreshServices: () => Promise<void>;
}

export function useIntegrations(): UseIntegrationsReturn {
  const [services, setServices] = useState<ConnectedService[]>([]);
  const [privacyPolicy, setPrivacyPolicy] = useState<DataBoundaryPolicy>(() =>
    getServices().dataBoundary.getPolicy()
  );
  const [loadingServiceId, setLoadingServiceId] = useState<string | null>(null);

  const container = getServices();

  const refreshServices = useCallback(async () => {
    try {
      const list = await container.integrationService.getConnectedServices();
      setServices(list);
    } catch {
      // Fallback
    }
  }, [container]);

  useEffect(() => {
    refreshServices();
    const unsubscribe = container.integrationService.onStateChange(() => {
      refreshServices();
    });
    return unsubscribe;
  }, [container, refreshServices]);

  const connectService = useCallback(
    async (serviceId: string) => {
      setLoadingServiceId(serviceId);
      try {
        await container.integrationService.connectService(serviceId);
        await refreshServices();
      } finally {
        setLoadingServiceId(null);
      }
    },
    [container, refreshServices]
  );

  const disconnectService = useCallback(
    async (serviceId: string) => {
      setLoadingServiceId(serviceId);
      try {
        await container.integrationService.disconnectService(serviceId);
        await refreshServices();
      } finally {
        setLoadingServiceId(null);
      }
    },
    [container, refreshServices]
  );

  const updatePrivacyPolicy = useCallback(
    (updates: Partial<DataBoundaryPolicy>) => {
      container.dataBoundary.updatePolicy(updates);
      setPrivacyPolicy(container.dataBoundary.getPolicy());
    },
    [container]
  );

  return {
    services,
    privacyPolicy,
    loadingServiceId,
    updatePrivacyPolicy,
    connectService,
    disconnectService,
    refreshServices,
  };
}
