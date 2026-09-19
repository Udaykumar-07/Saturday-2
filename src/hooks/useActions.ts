/**
 * Hook for managing action execution, confirmation, and history.
 * Bridges ActionService to React components.
 */

import { useState, useEffect, useCallback } from 'react';
import { Action, ActionIntent, ActionResult } from '../core/types/action';
import { getServices } from '../services/container';

export interface UseActionsReturn {
  /** Action currently awaiting user confirmation */
  pendingAction: Action | null;
  /** Recent action history */
  actionHistory: Action[];
  /** Confirm a pending action */
  confirmAction: (actionId: string) => Promise<void>;
  /** Deny a pending action */
  denyAction: (actionId: string) => void;
  /** Execute a single action intent */
  executeIntent: (intent: ActionIntent) => Promise<ActionResult>;
}

export function useActions(): UseActionsReturn {
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [actionHistory, setActionHistory] = useState<Action[]>([]);

  const services = getServices();

  // Subscribe to action state changes
  useEffect(() => {
    const unsubscribe = services.actionService.onStateChange((action) => {
      // Update pending action
      if (action.state === 'AWAITING_PERMISSION') {
        setPendingAction(action);
      } else if (pendingAction?.id === action.id) {
        setPendingAction(null);
      }

      // Update history
      setActionHistory(services.actionService.getRecentActions(20));
    });

    return unsubscribe;
  }, [services, pendingAction]);

  const confirmAction = useCallback(
    async (actionId: string) => {
      await services.actionService.confirmAction(actionId);
      setPendingAction(null);
    },
    [services]
  );

  const denyAction = useCallback(
    (actionId: string) => {
      services.actionService.denyAction(actionId);
      setPendingAction(null);
    },
    [services]
  );

  const executeIntent = useCallback(
    async (intent: ActionIntent): Promise<ActionResult> => {
      return services.actionService.handleIntent(intent);
    },
    [services]
  );

  return {
    pendingAction,
    actionHistory,
    confirmAction,
    denyAction,
    executeIntent,
  };
}
