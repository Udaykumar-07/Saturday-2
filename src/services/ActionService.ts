/**
 * Action Service — high-level orchestrator connecting the action engine
 * to the conversation flow. This is the main entry point for action execution.
 */

import { ActionEngine } from '../core/actions/ActionEngine';
import { ActionIntent, Action, ActionResult, ActionPlan } from '../core/types/action';

export class ActionService {
  constructor(private engine: ActionEngine) {}

  /**
   * Handle a single action intent through the full lifecycle.
   */
  async handleIntent(intent: ActionIntent): Promise<ActionResult> {
    const action = this.engine.planAction(intent);
    return this.engine.executeAction(action.id);
  }

  /**
   * Handle a multi-step action plan.
   */
  async handlePlan(plan: ActionPlan): Promise<{ results: ActionResult[]; allSucceeded: boolean }> {
    return this.engine.executePlan(plan.steps);
  }

  /**
   * Try to plan actions from a user input string.
   * Returns null if the input doesn't match any action patterns.
   */
  planFromInput(input: string): ActionPlan | null {
    return this.engine.planner.plan(input);
  }

  /**
   * Confirm a pending action (user approved).
   */
  async confirmAction(actionId: string): Promise<ActionResult> {
    return this.engine.confirmAction(actionId);
  }

  /**
   * Deny a pending action.
   */
  denyAction(actionId: string): void {
    this.engine.denyAction(actionId);
  }

  /**
   * Cancel any non-terminal action.
   */
  cancelAction(actionId: string): void {
    this.engine.cancelAction(actionId);
  }

  /**
   * Get the action currently awaiting user permission.
   */
  getPendingAction(): Action | undefined {
    return this.engine.getPendingAction();
  }

  /**
   * Get recent action history.
   */
  getRecentActions(limit = 10): Action[] {
    return this.engine.getRecentActions(limit);
  }

  /**
   * Subscribe to action state changes.
   */
  onStateChange(callback: (action: Action) => void): () => void {
    return this.engine.onStateChange(callback);
  }

  /**
   * Get the underlying engine (for advanced use).
   */
  getEngine(): ActionEngine {
    return this.engine;
  }
}
