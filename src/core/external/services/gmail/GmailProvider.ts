/**
 * Gmail External Intelligence Provider.
 *
 * Implements ExternalIntelligenceProvider for Google Gmail API.
 * Capabilities:
 * - gmail.is_connected: Check connection status
 * - gmail.read_latest: Retrieve latest minimized email summaries
 * - gmail.search: Search relevant emails by query
 *
 * Enforces data minimization:
 * - Never returns entire mailbox
 * - Extracts only { id, from, subject, date, snippet }
 */

import {
  ExternalIntelligenceProvider,
  ExternalProviderType,
  ExternalRequest,
  ExternalResponse,
  ProviderHealth,
} from '../../../types/external';
import { AuthenticationManager } from '../../authentication/AuthenticationManager';

export interface MinimizedEmailMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export class GmailProvider implements ExternalIntelligenceProvider {
  readonly id = 'gmail_provider';
  readonly name = 'Google Gmail Service';
  readonly type: ExternalProviderType = 'api';

  constructor(private authManager: AuthenticationManager) {}

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCapabilities(): string[] {
    return ['gmail.is_connected', 'gmail.read_latest', 'gmail.search'];
  }

  async execute(request: ExternalRequest): Promise<ExternalResponse> {
    const isAuthed = await this.authManager.isAuthenticated('gmail');
    const cap = request.requiredCapabilities[0] || 'gmail.read_latest';

    if (cap === 'gmail.is_connected') {
      return {
        taskId: request.taskId,
        status: 'completed',
        providerId: this.id,
        result: { connected: isAuthed },
      };
    }

    if (!isAuthed) {
      return {
        taskId: request.taskId,
        status: 'requires_authentication',
        providerId: this.id,
        metadata: {
          serviceId: 'gmail',
          prompt: 'Saturday needs Gmail access to retrieve your messages.',
        },
      };
    }

    const session = await this.authManager.getSession('gmail');
    const token = session?.accessToken || '';

    try {
      if (cap === 'gmail.search') {
        const query = ((request.input as Record<string, unknown>)?.query as string) || '';
        const messages = await this.searchMessages(token, query);
        return {
          taskId: request.taskId,
          status: 'completed',
          providerId: this.id,
          result: { messages, query },
        };
      }

      // Default: read_latest
      const maxResults = ((request.input as Record<string, unknown>)?.maxResults as number) || 5;
      const messages = await this.fetchLatestMessages(token, maxResults);

      return {
        taskId: request.taskId,
        status: 'completed',
        providerId: this.id,
        result: { messages },
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
    return {
      available: true,
      errorRate: 0,
    };
  }

  /**
   * Fetch latest emails, with mock fallback for dev/test environments.
   */
  private async fetchLatestMessages(
    token: string,
    maxResults = 5
  ): Promise<MinimizedEmailMessage[]> {
    if (token.startsWith('gmail_mock_') || !token) {
      return [
        {
          id: 'msg_001',
          from: 'Rahul Sharma <rahul@company.com>',
          subject: 'Project Saturday Status Update',
          date: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          snippet: 'Hey team, the sprint deliverables are looking great for the Saturday release.',
        },
        {
          id: 'msg_002',
          from: 'Calendar <calendar-notification@google.com>',
          subject: 'Meeting Invitation: Architecture Review @ 3 PM',
          date: new Date(Date.now() - 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          snippet: 'Location: 100 Innovation Way, Building B. Please review the attached plan.',
        },
        {
          id: 'msg_003',
          from: 'GitHub <notifications@github.com>',
          subject: 'New release published: saturday-v2',
          date: new Date(Date.now() - 86400000).toLocaleDateString(),
          snippet: 'Release v2.0.0 is now live with Phase 2 Android actions capability.',
        },
      ].slice(0, maxResults);
    }

    // Real Gmail API call when valid token is available
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Gmail API returned status ${response.status}`);
    }

    const data = await response.json();
    const list: MinimizedEmailMessage[] = [];

    if (Array.isArray(data.messages)) {
      for (const item of data.messages.slice(0, maxResults)) {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const headers = detail.payload?.headers || [];
          const from = headers.find((h: { name: string }) => h.name === 'From')?.value || 'Unknown';
          const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || '(No Subject)';
          const date = headers.find((h: { name: string }) => h.name === 'Date')?.value || '';
          list.push({
            id: detail.id,
            from,
            subject,
            date,
            snippet: detail.snippet || '',
          });
        }
      }
    }

    return list;
  }

  /**
   * Search messages matching a query.
   */
  private async searchMessages(token: string, query: string): Promise<MinimizedEmailMessage[]> {
    const all = await this.fetchLatestMessages(token, 10);
    const qLower = query.toLowerCase();
    return all.filter(
      (m) =>
        m.subject.toLowerCase().includes(qLower) ||
        m.from.toLowerCase().includes(qLower) ||
        m.snippet.toLowerCase().includes(qLower)
    );
  }
}
