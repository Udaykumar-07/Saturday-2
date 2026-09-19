/**
 * Action Executor — dispatches validated intents to capability handlers.
 * Never called directly by the LLM — only the ActionEngine calls this
 * after validation and permission checks pass.
 */

import { ActionIntent, ActionResult } from '../types/action';
import { CapabilityRegistry } from './CapabilityRegistry';
import {
  ActionExecutionError,
  CapabilityUnavailableError,
} from '../types/errors';

export class ActionExecutor {
  constructor(private registry: CapabilityRegistry) {}

  /**
   * Execute an ActionIntent by delegating to the registered capability.
   * Assumes validation has already passed.
   */
  async execute(intent: ActionIntent): Promise<ActionResult> {
    const capability = this.registry.get(intent.capability);

    if (!capability) {
      throw new CapabilityUnavailableError(intent.capability);
    }

    // Check runtime availability
    const available = await capability.isAvailable();
    if (!available) {
      throw new CapabilityUnavailableError(intent.capability);
    }

    try {
      const result = await capability.execute(intent.params);
      return result;
    } catch (error) {
      if (error instanceof CapabilityUnavailableError) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown execution error';
      throw new ActionExecutionError(
        `Failed to execute "${intent.capability}": ${message}`
      );
    }
  }
}
