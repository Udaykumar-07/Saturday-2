/**
 * Agent Client for communicating with external agents.
 *
 * Protocol-agnostic client supporting HTTPS, MCP, or local simulation handlers.
 * Sends structured tasks and receives structured responses with evidence.
 */

import { AgentTask, AgentResponse } from '../../types/external';
import { AgentCommunicationError } from '../../types/errors';

export interface AgentProtocolHandler {
  sendTask(agentId: string, task: AgentTask): Promise<AgentResponse>;
  getTaskStatus?(agentId: string, taskId: string): Promise<AgentResponse>;
  cancelTask?(agentId: string, taskId: string): Promise<void>;
}

export class AgentClient {
  private handlers: Map<string, AgentProtocolHandler> = new Map();
  private defaultHandler?: AgentProtocolHandler;

  /**
   * Register a protocol handler for a specific agent or protocol.
   */
  registerHandler(agentIdOrProtocol: string, handler: AgentProtocolHandler): void {
    this.handlers.set(agentIdOrProtocol, handler);
  }

  /**
   * Set a fallback default protocol handler.
   */
  setDefaultHandler(handler: AgentProtocolHandler): void {
    this.defaultHandler = handler;
  }

  /**
   * Send a structured task to an agent.
   */
  async sendTask(agentId: string, task: AgentTask): Promise<AgentResponse> {
    const handler = this.handlers.get(agentId) ?? this.defaultHandler;

    if (!handler) {
      throw new AgentCommunicationError(
        `No protocol handler available for agent "${agentId}".`,
        agentId
      );
    }

    try {
      return await handler.sendTask(agentId, task);
    } catch (error) {
      if (error instanceof AgentCommunicationError) throw error;
      throw new AgentCommunicationError(
        `Failed to send task to agent "${agentId}": ${error instanceof Error ? error.message : String(error)}`,
        agentId
      );
    }
  }

  /**
   * Query current task status from an agent.
   */
  async getTaskStatus(agentId: string, taskId: string): Promise<AgentResponse> {
    const handler = this.handlers.get(agentId) ?? this.defaultHandler;
    if (!handler?.getTaskStatus) {
      throw new AgentCommunicationError(
        `Status polling not supported for agent "${agentId}".`,
        agentId
      );
    }
    return handler.getTaskStatus(agentId, taskId);
  }

  /**
   * Cancel an in-flight agent task.
   */
  async cancelTask(agentId: string, taskId: string): Promise<void> {
    const handler = this.handlers.get(agentId) ?? this.defaultHandler;
    if (handler?.cancelTask) {
      await handler.cancelTask(agentId, taskId);
    }
  }
}
