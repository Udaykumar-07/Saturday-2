/**
 * Conversation service — the central orchestrator for chat.
 * The UI interacts with this service, never directly with storage or AI.
 */

import { Conversation, Message } from '../core/types/conversation';
import { AIRequest, AIResponse } from '../core/types/ai';
import { AIContext } from '../core/types/context';
import { ConversationRepository } from '../storage/ConversationRepository';
import { AIProviderRegistry } from '../core/ai/AIProviderRegistry';
import { AIRouter } from '../core/routing/AIRouter';
import { ContextService } from '../core/context/ContextService';
import { PersonalityService } from './PersonalityService';
import { AIProviderError, AIProviderUnavailableError, MalformedResponseError, RoutingError, SaturdayError } from '../core/types/errors';

export class ConversationService {
  constructor(
    private repository: ConversationRepository,
    private registry: AIProviderRegistry,
    private router: AIRouter,
    private contextService: ContextService,
    private personalityService: PersonalityService
  ) {}

  /** Create a new conversation. */
  async create(title?: string): Promise<Conversation> {
    const now = Date.now();
    const conversation: Conversation = {
      id: `conv_${now}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.save(conversation);
    return conversation;
  }

  /** Load a conversation by ID. */
  async load(id: string): Promise<Conversation | null> {
    return this.repository.load(id);
  }

  /** List all conversations (metadata only). */
  async listAll() {
    return this.repository.listAll();
  }

  /** Delete a conversation. */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * Send a user message and get an AI response.
   * This is the main interaction point.
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    // 1. Create and persist user message
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    let conversation = await this.repository.appendMessage(
      conversationId,
      userMessage
    );

    // 2. Build context
    const context = await this.buildRequestContext();

    // 3. Route to provider
    let assistantContent: string;
    let providerId = 'unknown';

    try {
      const routingDecision = await this.router.route();
      providerId = routingDecision.providerId;

      const provider = this.registry.getProvider(routingDecision.providerId);
      if (!provider) {
        throw new AIProviderUnavailableError();
      }

      // 4. Build request
      const request: AIRequest = {
        messages: conversation.messages,
        context,
      };

      // 5. Generate response
      const response: AIResponse = await provider.generate(request);

      if (!response.content || typeof response.content !== 'string') {
        throw new MalformedResponseError();
      }

      assistantContent = response.content;
      providerId = response.providerId;
    } catch (error) {
      if (error instanceof SaturdayError) {
        assistantContent = this.getErrorMessage(error);
      } else {
        assistantContent =
          'Something went wrong. Please try again.';
      }
    }

    // 6. Create and persist assistant message
    const assistantMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now(),
      metadata: { providerId },
    };

    conversation = await this.repository.appendMessage(
      conversationId,
      assistantMessage
    );

    // Update title from first user message if not set
    if (!conversation.title && conversation.messages.length <= 2) {
      conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await this.repository.save(conversation);
    }

    return { userMessage, assistantMessage };
  }

  private async buildRequestContext(): Promise<AIContext> {
    const context = await this.contextService.buildContext();
    const systemPrompt = await this.personalityService.generateSystemPrompt();
    return { ...context, systemPrompt };
  }

  private getErrorMessage(error: SaturdayError): string {
    switch (error.code) {
      case 'AI_PROVIDER_UNAVAILABLE':
        return "I don't have an AI model available right now. Please configure a local model or another provider in settings.";
      case 'MODEL_UNAVAILABLE':
        return 'The selected AI model is not available. Please try a different model.';
      case 'ROUTING_ERROR':
        return "I couldn't determine how to process your request. Please try again.";
      case 'MALFORMED_RESPONSE':
        return 'I received an unexpected response. Please try again.';
      case 'TIMEOUT':
        return 'The request took too long. Please try again.';
      default:
        return error.recoverable
          ? `Something went wrong: ${error.message}`
          : 'An unexpected error occurred. Please try again.';
    }
  }
}
