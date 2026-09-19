/**
 * Gmail Capability adapters for Saturday's CapabilityRegistry.
 *
 * Exposes Gmail actions (`gmail.read_latest`, `gmail.search`) as first-class
 * capabilities that can be executed alongside Android capabilities.
 */

import {
  Capability,
  CapabilityDefinition,
  ActionResult,
} from '../../../types/action';
import { GmailProvider } from './GmailProvider';

export class GmailReadLatestCapability implements Capability {
  readonly definition: CapabilityDefinition = {
    id: 'gmail.read_latest',
    name: 'Read Latest Emails',
    category: 'communication',
    riskLevel: 'medium',
    requiredPermissions: [],
    platform: 'any',
  };

  constructor(private gmailProvider: GmailProvider) {}

  async isAvailable(): Promise<boolean> {
    return this.gmailProvider.isAvailable();
  }

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const maxResults = typeof params.maxResults === 'number' ? params.maxResults : 5;
    const response = await this.gmailProvider.execute({
      taskId: `task_${Date.now()}`,
      objective: 'Read latest emails',
      requiredCapabilities: ['gmail.read_latest'],
      input: { maxResults },
    });

    if (response.status === 'requires_authentication') {
      return {
        success: false,
        error: 'Gmail is not connected. User authentication required.',
        data: { requiresAuth: true, serviceId: 'gmail' },
      };
    }

    if (response.status === 'completed') {
      return {
        success: true,
        data: (response.result as Record<string, unknown>) || {},
        verifiedAt: Date.now(),
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to read emails.',
    };
  }
}

export class GmailSearchCapability implements Capability {
  readonly definition: CapabilityDefinition = {
    id: 'gmail.search',
    name: 'Search Emails',
    category: 'communication',
    riskLevel: 'medium',
    requiredPermissions: [],
    platform: 'any',
  };

  constructor(private gmailProvider: GmailProvider) {}

  async isAvailable(): Promise<boolean> {
    return this.gmailProvider.isAvailable();
  }

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const query = typeof params.query === 'string' ? params.query : '';
    const response = await this.gmailProvider.execute({
      taskId: `task_${Date.now()}`,
      objective: `Search emails for "${query}"`,
      requiredCapabilities: ['gmail.search'],
      input: { query },
    });

    if (response.status === 'requires_authentication') {
      return {
        success: false,
        error: 'Gmail is not connected. User authentication required.',
        data: { requiresAuth: true, serviceId: 'gmail' },
      };
    }

    if (response.status === 'completed') {
      return {
        success: true,
        data: (response.result as Record<string, unknown>) || {},
        verifiedAt: Date.now(),
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to search emails.',
    };
  }
}
