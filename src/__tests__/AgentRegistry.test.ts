/**
 * Tests for AgentRegistry and AgentCommunicationLayer.
 */

import { AgentRegistry } from '../core/external/agents/AgentRegistry';
import { AgentClient, AgentProtocolHandler } from '../core/external/agents/AgentClient';
import { AgentCommunicationLayer } from '../core/external/agents/AgentCommunicationLayer';
import { AgentDefinition, AgentTask, AgentResponse } from '../core/types/external';

function createMockAgent(
  id: string,
  capabilities: string[],
  available = true,
  requiresAuth = false
): AgentDefinition {
  return {
    id,
    name: `Agent ${id}`,
    description: `Test Agent ${id}`,
    capabilities,
    supportedProtocols: ['https', 'mcp'],
    requiresAuth,
    isAvailable: jest.fn().mockResolvedValue(available),
  };
}

describe('AgentRegistry & AgentCommunicationLayer', () => {
  let registry: AgentRegistry;
  let client: AgentClient;
  let acl: AgentCommunicationLayer;

  beforeEach(() => {
    registry = new AgentRegistry();
    client = new AgentClient();
    acl = new AgentCommunicationLayer(registry, client);
  });

  test('registers and queries agents by capability', () => {
    const agent = createMockAgent('research_agent', ['web.search', 'source_collection']);
    registry.register(agent);

    expect(registry.get('research_agent')).toBe(agent);
    expect(registry.findByCapability('web.search')).toHaveLength(1);
    expect(registry.findByCapability('coding')).toHaveLength(0);
  });

  test('delegates task when agent has granted capability permissions', async () => {
    const agent = createMockAgent('research_agent', ['web.search']);
    registry.register(agent);

    // Explicitly grant capability to agent
    acl.grantPermission({
      agentId: 'research_agent',
      capability: 'web.search',
      scope: 'session',
    });

    const mockHandler: AgentProtocolHandler = {
      sendTask: jest.fn().mockResolvedValue({
        taskId: 't1',
        status: 'completed',
        result: { summary: 'Research report' },
        evidence: ['https://source1.org'],
      } as AgentResponse),
    };

    client.registerHandler('research_agent', mockHandler);

    const task: AgentTask = {
      id: 't1',
      objective: 'Research quantum computing',
      requiredCapabilities: ['web.search'],
    };

    const response = await acl.delegateTask(task);
    expect(response.status).toBe('completed');
    expect(response.result).toBeDefined();
    expect(mockHandler.sendTask).toHaveBeenCalled();
  });

  test('denies task delegation when agent lacks granted capability permission', async () => {
    const agent = createMockAgent('research_agent', ['web.search', 'gmail.send']);
    registry.register(agent);

    // Only grant web.search, but NOT gmail.send
    acl.grantPermission({
      agentId: 'research_agent',
      capability: 'web.search',
      scope: 'session',
    });

    const task: AgentTask = {
      id: 't2',
      objective: 'Send emails via agent',
      requiredCapabilities: ['gmail.send'],
    };

    await expect(acl.delegateTask(task)).rejects.toThrow(/lacks granted permission/);
  });

  test('throws error if agent claims completion without result or evidence', async () => {
    const agent = createMockAgent('bad_agent', ['web.search']);
    registry.register(agent);

    acl.grantPermission({
      agentId: 'bad_agent',
      capability: 'web.search',
      scope: 'session',
    });

    client.registerHandler('bad_agent', {
      sendTask: jest.fn().mockResolvedValue({
        taskId: 't3',
        status: 'completed',
        // Missing result and evidence
      } as AgentResponse),
    });

    const task: AgentTask = {
      id: 't3',
      objective: 'Do research',
      requiredCapabilities: ['web.search'],
    };

    await expect(acl.delegateTask(task)).rejects.toThrow(/returned no result or evidence/);
  });
});
