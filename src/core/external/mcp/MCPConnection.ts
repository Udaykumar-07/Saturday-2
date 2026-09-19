/**
 * Model Context Protocol (MCP) Connection.
 *
 * Establishes and manages connections to remote or local MCP servers.
 * Provides tool and resource discovery following the MCP standard.
 */

import {
  MCPTool,
  MCPResource,
  MCPConnectionStatus,
} from '../../types/external';
import { SaturdayError } from '../../types/errors';

export class MCPConnection {
  private status: MCPConnectionStatus = 'disconnected';
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];

  constructor(readonly serverUri: string) {}

  /**
   * Current connection status.
   */
  getStatus(): MCPConnectionStatus {
    return this.status;
  }

  /**
   * Connect to the MCP server.
   */
  async connect(): Promise<void> {
    this.status = 'connecting';
    try {
      // In Phase 3 foundation: simulate or establish connection
      this.status = 'connected';
    } catch (error) {
      this.status = 'error';
      throw new SaturdayError(
        `Failed to connect to MCP server at ${this.serverUri}: ${error instanceof Error ? error.message : String(error)}`,
        'MCP_CONNECTION_ERROR',
        true
      );
    }
  }

  /**
   * Disconnect from the MCP server.
   */
  async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.tools = [];
    this.resources = [];
  }

  /**
   * Register or discover tools from the MCP server.
   */
  registerTools(tools: MCPTool[]): void {
    this.tools = tools;
  }

  /**
   * Register or discover resources from the MCP server.
   */
  registerResources(resources: MCPResource[]): void {
    this.resources = resources;
  }

  /**
   * List available tools.
   */
  async listTools(): Promise<MCPTool[]> {
    if (this.status !== 'connected') {
      throw new SaturdayError(
        `Cannot list tools: MCP connection is ${this.status}.`,
        'MCP_NOT_CONNECTED',
        true
      );
    }
    return [...this.tools];
  }

  /**
   * List available resources.
   */
  async listResources(): Promise<MCPResource[]> {
    if (this.status !== 'connected') {
      throw new SaturdayError(
        `Cannot list resources: MCP connection is ${this.status}.`,
        'MCP_NOT_CONNECTED',
        true
      );
    }
    return [...this.resources];
  }

  /**
   * Call a tool on the MCP server.
   */
  async callTool(name: string, _args: Record<string, unknown>): Promise<unknown> {
    if (this.status !== 'connected') {
      throw new SaturdayError(
        `Cannot call tool "${name}": MCP connection is ${this.status}.`,
        'MCP_NOT_CONNECTED',
        true
      );
    }

    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      throw new SaturdayError(
        `Tool "${name}" not found on MCP server ${this.serverUri}.`,
        'MCP_TOOL_NOT_FOUND',
        true
      );
    }

    // Phase 3 foundation: tool execution simulation or hook
    return { executed: name, timestamp: Date.now() };
  }
}
