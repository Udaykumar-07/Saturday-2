/**
 * Action Engine — the central coordinator for the action lifecycle.
 * Drives actions through the state machine:
 *   PLANNED → VALIDATING → AWAITING_PERMISSION → EXECUTING → VERIFYING → COMPLETED/FAILED
 *
 * Security invariant: the LLM NEVER directly controls Android.
 * Flow is always: LLM → structured ActionIntent → Validator → PermissionManager
 *   → CapabilityRegistry → Native Execution → Verification → Result
 */

import {
  Action,
  ActionIntent,
  ActionResult,
  ActionState,
  ActionStateCallback,
} from '../types/action';
import { ActionValidator } from './ActionValidator';
import { ActionExecutor } from './ActionExecutor';
import { ActionVerifier } from './ActionVerifier';
import { PermissionManager } from './PermissionManager';
import { ActionPlanner } from './ActionPlanner';
import { CapabilityRegistry } from './CapabilityRegistry';

export class ActionEngine {
  private actions: Map<string, Action> = new Map();
  private listeners: ActionStateCallback[] = [];

  readonly validator: ActionValidator;
  readonly executor: ActionExecutor;
  readonly verifier: ActionVerifier;
  readonly permissionManager: PermissionManager;
  readonly planner: ActionPlanner;
  readonly registry: CapabilityRegistry;

  constructor(registry: CapabilityRegistry) {
    this.registry = registry;
    this.validator = new ActionValidator(registry);
    this.executor = new ActionExecutor(registry);
    this.verifier = new ActionVerifier(registry);
    this.permissionManager = new PermissionManager();
    this.planner = new ActionPlanner();
  }

  // ---------------------------------------------------------------------------
  // State Machine
  // ---------------------------------------------------------------------------

  /**
   * Plan an action from an intent. Creates it in PLANNED state.
   */
  planAction(intent: ActionIntent): Action {
    const action: Action = {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      intent,
      state: 'PLANNED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.actions.set(action.id, action);
    this.notifyListeners(action);
    return action;
  }

  /**
   * Execute a planned action through the full state machine.
   * Returns the final ActionResult.
   */
  async executeAction(actionId: string): Promise<ActionResult> {
    const action = this.actions.get(actionId);
    if (!action) {
      return { success: false, error: `Action "${actionId}" not found.` };
    }

    // PLANNED → VALIDATING
    this.transition(action, 'VALIDATING');

    const validation = this.validator.validate(action.intent);
    if (!validation.valid) {
      this.transition(action, 'FAILED');
      action.error = `Validation failed: ${validation.errors.join('; ')}`;
      this.notifyListeners(action);
      return { success: false, error: action.error };
    }

    // VALIDATING → AWAITING_PERMISSION
    this.transition(action, 'AWAITING_PERMISSION');

    const needsConfirmation = this.permissionManager.requiresConfirmation(
      action.intent
    );
    if (needsConfirmation) {
      // Action stays in AWAITING_PERMISSION until confirmAction() is called
      this.notifyListeners(action);
      return {
        success: false,
        error: 'Action requires user confirmation.',
        data: { awaitingConfirmation: true },
      };
    }

    // Permission granted — proceed to execution
    return this.proceedExecution(action);
  }

  /**
   * Confirm a pending action (user approved).
   * Resumes execution from AWAITING_PERMISSION.
   */
  async confirmAction(actionId: string): Promise<ActionResult> {
    const action = this.actions.get(actionId);
    if (!action) {
      return { success: false, error: `Action "${actionId}" not found.` };
    }
    if (action.state !== 'AWAITING_PERMISSION') {
      return {
        success: false,
        error: `Action is in state "${action.state}", not AWAITING_PERMISSION.`,
      };
    }

    // Grant session permission so same capability doesn't ask again
    this.permissionManager.grantSession(action.intent.capability);

    return this.proceedExecution(action);
  }

  /**
   * Deny/cancel a pending action.
   */
  denyAction(actionId: string): void {
    const action = this.actions.get(actionId);
    if (!action) return;

    this.transition(action, 'CANCELLED');
    action.error = 'User denied the action.';
    this.notifyListeners(action);
  }

  /**
   * Cancel any non-terminal action.
   */
  cancelAction(actionId: string): void {
    const action = this.actions.get(actionId);
    if (!action) return;

    const terminalStates: ActionState[] = ['COMPLETED', 'FAILED', 'CANCELLED'];
    if (terminalStates.includes(action.state)) return;

    this.transition(action, 'CANCELLED');
    action.error = 'Action was cancelled.';
    this.notifyListeners(action);
  }

  // ---------------------------------------------------------------------------
  // Multi-step plan execution
  // ---------------------------------------------------------------------------

  /**
   * Execute an entire ActionPlan sequentially.
   * Stops on first failure.
   */
  async executePlan(
    intents: ActionIntent[]
  ): Promise<{ results: ActionResult[]; allSucceeded: boolean }> {
    const results: ActionResult[] = [];

    for (const intent of intents) {
      const action = this.planAction(intent);
      const result = await this.executeAction(action.id);

      results.push(result);

      // If action is awaiting permission, stop the plan here
      if (result.data?.awaitingConfirmation) {
        return { results, allSucceeded: false };
      }

      if (!result.success) {
        return { results, allSucceeded: false };
      }

      // Small delay between steps to let the system settle
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return { results, allSucceeded: true };
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  /** Get an action by ID. */
  getAction(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }

  /** Get all actions. */
  getAllActions(): Action[] {
    return Array.from(this.actions.values());
  }

  /** Get recent actions (most recent first). */
  getRecentActions(limit = 10): Action[] {
    return Array.from(this.actions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /** Get the currently pending action (if any). */
  getPendingAction(): Action | undefined {
    return Array.from(this.actions.values()).find(
      (a) => a.state === 'AWAITING_PERMISSION'
    );
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  /** Subscribe to action state changes. */
  onStateChange(callback: ActionStateCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async proceedExecution(action: Action): Promise<ActionResult> {
    // AWAITING_PERMISSION → EXECUTING
    this.transition(action, 'EXECUTING');

    try {
      const result = await this.executor.execute(action.intent);

      // EXECUTING → VERIFYING
      this.transition(action, 'VERIFYING');

      const verification = await this.verifier.verify(action.intent, result);

      // VERIFYING → COMPLETED or FAILED
      action.result = {
        ...result,
        verifiedAt: Date.now(),
      };

      if (verification.verified) {
        this.transition(action, 'COMPLETED');
      } else {
        this.transition(action, 'FAILED');
        action.error = verification.details;
      }

      this.notifyListeners(action);
      return action.result;
    } catch (error) {
      this.transition(action, 'FAILED');
      action.error =
        error instanceof Error ? error.message : 'Unknown execution error';
      action.result = { success: false, error: action.error };
      this.notifyListeners(action);
      return action.result;
    }
  }

  private transition(action: Action, newState: ActionState): void {
    action.state = newState;
    action.updatedAt = Date.now();
  }

  private notifyListeners(action: Action): void {
    for (const listener of this.listeners) {
      try {
        listener({ ...action });
      } catch {
        // Don't let listener errors break the engine
      }
    }
  }
}
