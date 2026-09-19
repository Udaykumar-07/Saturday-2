/**
 * External Task Executor for Saturday.
 *
 * Implements the deterministic execution lifecycle for all external work:
 * Task
 *   ↓
 * Requirements Analysis
 *   ↓
 * Provider/Agent Selection
 *   ↓
 * Authentication Check
 *   ↓
 * Permission Check
 *   ↓
 * Data Minimization (Data Boundary)
 *   ↓
 * Execute
 *   ↓
 * Verify Result
 *   ↓
 * Record Provider Health
 *   ↓
 * Return Result
 */

import {
  ExternalRequest,
  ExternalResponse,
  TaskRequirements,
} from '../../types/external';
import {
  DataBoundaryError,
  SaturdayError,
} from '../../types/errors';
import { ExternalProviderRegistry } from '../providers/ExternalProviderRegistry';
import { AgentCommunicationLayer } from '../agents/AgentCommunicationLayer';
import { AuthenticationManager } from '../authentication/AuthenticationManager';
import { DataBoundaryManager } from './DataBoundaryManager';
import { ExternalResultVerifier } from './ExternalResultVerifier';
import { ProviderHealthTracker } from '../health/ProviderHealthTracker';

export class ExternalTaskExecutor {
  constructor(
    private providerRegistry: ExternalProviderRegistry,
    private agentLayer: AgentCommunicationLayer,
    private authManager: AuthenticationManager,
    private dataBoundary: DataBoundaryManager,
    private verifier: ExternalResultVerifier,
    private healthTracker?: ProviderHealthTracker
  ) {}

  /**
   * Execute an external task following the secure lifecycle.
   */
  async execute(
    request: ExternalRequest,
    requirements: TaskRequirements
  ): Promise<ExternalResponse> {
    const startTime = Date.now();
    const primaryCap = request.requiredCapabilities[0] || 'general';

    // 1. Data Boundary Check: Ensure privacy policy allows this transfer
    const boundaryCheck = this.dataBoundary.checkBoundary(
      requirements.toolUseRequired ? 'api' : 'cloud_model',
      request.constraints?.privacy
    );

    if (!boundaryCheck.allowed) {
      throw new DataBoundaryError(boundaryCheck.reason || 'Data transfer denied by privacy policy.');
    }

    // 2. Data Minimization: Strip sensitive tokens & minimize payload
    const minimizedInput = this.dataBoundary.minimizeData(request.input);
    const sanitizedRequest: ExternalRequest = {
      ...request,
      input: minimizedInput,
    };

    // 3. Provider / Agent Selection
    // If agent task, delegate through AgentCommunicationLayer
    if (requirements.reasoningLevel === 'deep' && requirements.multiStep) {
      try {
        const agentResponse = await this.agentLayer.delegateTask(
          {
            id: request.taskId,
            objective: request.objective,
            inputs: (sanitizedRequest.input as Record<string, unknown>) || {},
            requiredCapabilities: request.requiredCapabilities,
          },
          requirements
        );

        return {
          taskId: request.taskId,
          status: agentResponse.status === 'completed' ? 'completed' : 'failed',
          result: agentResponse.result,
          providerId: 'agent',
          error: agentResponse.error,
        };
      } catch (error) {
        return {
          taskId: request.taskId,
          status: 'failed',
          providerId: 'agent',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Find capable provider from registry
    const capableProviders = await this.providerRegistry.findByCapability(primaryCap);
    if (capableProviders.length === 0) {
      return {
        taskId: request.taskId,
        status: 'failed',
        providerId: 'none',
        error: `No external provider found supporting capability "${primaryCap}".`,
      };
    }

    const provider = capableProviders[0];

    // 4. Authentication Check
    // If provider requires auth (e.g. Gmail API), verify session first
    if (primaryCap.startsWith('gmail.')) {
      const isAuthed = await this.authManager.isAuthenticated('gmail');
      if (!isAuthed) {
        return {
          taskId: request.taskId,
          status: 'requires_authentication',
          providerId: provider.id,
          metadata: { serviceId: 'gmail', prompt: 'Connect Gmail to continue' },
        };
      }
    }

    // 5. Execute Provider
    let response: ExternalResponse;
    try {
      response = await provider.execute(sanitizedRequest);
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.healthTracker?.recordFailure(provider.id, latencyMs);
      return {
        taskId: request.taskId,
        status: 'failed',
        providerId: provider.id,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const latencyMs = Date.now() - startTime;

    // 6. Verification
    const verification = this.verifier.verify(response, primaryCap);
    if (!verification.verified) {
      this.healthTracker?.recordFailure(provider.id, latencyMs);
      throw new SaturdayError(
        `External result verification failed for ${provider.id}: ${verification.details}`,
        'EXTERNAL_VERIFICATION_FAILED',
        true
      );
    }

    // 7. Track Health
    if (response.status === 'completed') {
      this.healthTracker?.recordSuccess(provider.id, latencyMs);
    } else if (response.status === 'failed') {
      this.healthTracker?.recordFailure(provider.id, latencyMs);
    }

    return response;
  }
}
