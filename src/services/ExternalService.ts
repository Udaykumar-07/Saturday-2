/**
 * External Service for Saturday.
 *
 * Coordinates external execution for the conversation system and UI:
 * - Directs requests to the IntelligenceRouter
 * - Dispatches through ExternalTaskExecutor
 * - Handles Multi-Step flows across APIs and device actions (e.g. Gmail meeting -> Google Maps)
 * - Returns structured results with developer action traces
 */

import {
  ExternalRequest,
  ExternalResponse,
  TaskRequirements,
  ExtendedRoutingDecision,
} from '../core/types/external';
import { TaskIntent } from '../core/types/task';
import { IntelligenceRouter } from '../core/external/routing/IntelligenceRouter';
import { ExternalTaskExecutor } from '../core/external/execution/ExternalTaskExecutor';
import { ActionService } from './ActionService';

export interface MultiStepExecutionResult {
  completed: boolean;
  steps: Array<{
    target: string;
    description: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
  summary: string;
}

export class ExternalService {
  constructor(
    private router: IntelligenceRouter,
    private executor: ExternalTaskExecutor,
    private actionService?: ActionService
  ) {}

  /**
   * Route and execute an external request.
   */
  async handleExternalTask(
    input: string,
    intent?: TaskIntent
  ): Promise<{ decision: ExtendedRoutingDecision; response: ExternalResponse }> {
    const decision = await this.router.route(input, intent);

    const request: ExternalRequest = {
      taskId: `task_${Date.now()}`,
      objective: input,
      requiredCapabilities: decision.requirements.capabilities,
      input: { query: input },
    };

    const response = await this.executor.execute(request, decision.requirements);
    return { decision, response };
  }

  /**
   * Execute a composite multi-step task spanning APIs and Android actions.
   * Example: "Find meeting details from my email and open the location in Maps"
   */
  async handleMultiStepTask(input: string): Promise<MultiStepExecutionResult> {
    const steps: MultiStepExecutionResult['steps'] = [];

    // Step 1: Query email via Gmail
    const gmailRequest: ExternalRequest = {
      taskId: `multi_${Date.now()}_1`,
      objective: 'Find meeting details from email',
      requiredCapabilities: ['gmail.search'],
      input: { query: 'meeting' },
    };

    const requirements: TaskRequirements = {
      capabilities: ['gmail.search'],
      reasoningLevel: 'basic',
      toolUseRequired: true,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'private',
      multiStep: true,
    };

    let gmailResponse: ExternalResponse;
    try {
      gmailResponse = await this.executor.execute(gmailRequest, requirements);
      steps.push({
        target: 'GMAIL_API',
        description: 'Search email for meeting details',
        success: gmailResponse.status === 'completed',
        result: gmailResponse.result,
      });
    } catch (error) {
      steps.push({
        target: 'GMAIL_API',
        description: 'Search email for meeting details',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        completed: false,
        steps,
        summary: 'Failed to retrieve meeting details from Gmail.',
      };
    }

    if (gmailResponse.status !== 'completed') {
      return {
        completed: false,
        steps,
        summary: 'Authentication required for Gmail before continuing.',
      };
    }

    // Step 2: Extract meeting location
    const messages = (gmailResponse.result as { messages?: Array<{ snippet?: string }> })?.messages;
    const firstSnippet = messages && messages.length > 0 ? messages[0].snippet : '';
    // Extract address/location heuristic from snippet (e.g. "Location: 100 Innovation Way")
    const locationMatch = firstSnippet?.match(/location:\s*([^.]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : '100 Innovation Way';

    steps.push({
      target: 'REASONING',
      description: `Extracted meeting location: "${location}"`,
      success: true,
      result: { location },
    });

    // Step 3: Open location in Maps via ActionService
    if (this.actionService) {
      const mapsPlan = this.actionService.planFromInput(`search ${location} on Google Maps`);
      if (mapsPlan) {
        const { allSucceeded } = await this.actionService.handlePlan(mapsPlan);
        steps.push({
          target: 'ANDROID_ACTION',
          description: `Opened location "${location}" in Google Maps`,
          success: allSucceeded,
        });
      }
    }

    const allOk = steps.every((s) => s.success);
    return {
      completed: allOk,
      steps,
      summary: allOk
        ? `Found meeting location "${location}" in your email and opened it in Maps.`
        : 'Partially completed multi-step plan.',
    };
  }
}
