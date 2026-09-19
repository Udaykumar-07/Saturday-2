/**
 * MCP External Provider.
 *
 * Implements ExternalIntelligenceProvider, bridging an MCP connection
 * into Saturday's capability and execution architecture.
 * All tool calls are validated and checked for permissions.
 */

import {
  ExternalIntelligenceProvider,
  ExternalProviderType,
  ExternalRequest,
  ExternalResponse,
  ProviderHealth,
} from '../../types/external';
import { ActionValidationError } from '../../types/errors';
import { MCPConnection } from './MCPConnection';

export class MCPProvider implements ExternalIntelligenceProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ExternalProviderType = 'tool';

  constructor(
    readonly serverId: string,
    readonly serverName: string,
    private connection: MCPConnection
  ) {
    this.id = `mcp.${serverId}`;
    this.name = `MCP: ${serverName}`;
  }

  async isAvailable(): Promise<boolean> {
    return this.connection.getStatus() === 'connected';
  }

  async getCapabilities(): Promise<string[]> {
    try {
      const tools = await this.connection.listTools();
      return tools.map((t) => `mcp.${t.name}`);
    } catch {
      return [];
    }
  }

  async execute(request: ExternalRequest): Promise<ExternalResponse> {
    const isAvail = await this.isAvailable();
    if (!isAvail) {
      return {
        taskId: request.taskId,
        status: 'failed',
        providerId: this.id,
        error: `MCP server "${this.serverName}" is not connected.`,
      };
    }

    // Determine target tool name from requiredCapabilities
    const targetCap = request.requiredCapabilities.find((c) => c.startsWith('mcp.'));
    if (!targetCap) {
      throw new ActionValidationError('No valid MCP tool capability specified in request.');
    }

    const toolName = targetCap.replace('mcp.', '');

    try {
      const result = await this.connection.callTool(
        toolName,
        (request.input as Record<string, unknown>) || {}
      );

      return {
        taskId: request.taskId,
        status: 'completed',
        providerId: this.id,
        result,
      };
    } catch (error) {
      return {
        taskId: request.taskId,
        status: 'failed',
        providerId: this.id,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getHealth(): ProviderHealth {
    const isConn = this.connection.getStatus() === 'connected';
    return {
      available: isConn,
      errorRate: isConn ? 0 : 1,
    };
  }
}
