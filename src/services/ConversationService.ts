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
import { TaskUnderstandingService } from '../core/routing/TaskUnderstandingService';
import { ActionService } from './ActionService';
import { ExternalService } from './ExternalService';
import { MemoryService } from './MemoryService';
import { MemoryExtractionService, MemoryRetrievalService } from '../core/memory';
import { ModelIdentityService, QwenOrchestrator, NetworkGuard } from '../core/ai/qwen';

export class ConversationService {
  private memoryExtraction: MemoryExtractionService = new MemoryExtractionService();
  private memoryRetrieval?: MemoryRetrievalService;
  private modelIdentity: ModelIdentityService;
  private qwenOrchestrator?: QwenOrchestrator;

  constructor(
    private repository: ConversationRepository,
    private registry: AIProviderRegistry,
    private router: AIRouter,
    private contextService: ContextService,
    private personalityService: PersonalityService,
    private taskUnderstanding?: TaskUnderstandingService,
    private actionService?: ActionService,
    private externalService?: ExternalService,
    private memoryService?: MemoryService
  ) {
    if (this.memoryService) {
      this.memoryRetrieval = new MemoryRetrievalService(
        this.memoryService,
        this.personalityService
      );
    }
    const localProvider = this.registry.getProvider('local') as any;
    const qwenRuntime = localProvider?.getQwenProvider ? localProvider.getQwenProvider().getRuntime() : undefined;
    this.modelIdentity = new ModelIdentityService(qwenRuntime);
    if (qwenRuntime) {
      this.qwenOrchestrator = new QwenOrchestrator(
        qwenRuntime,
        this.memoryService,
        this.personalityService,
        this.actionService,
        this.externalService
      );
    }
  }

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

    // 2. Classify intent via TaskUnderstandingService (if available)
    const intent = this.taskUnderstanding?.classify(content);

    // ── 2.1 MEMORY DELETE ──
    // e.g. "Forget my name", "Delete my name"
    if (intent?.type === 'MEMORY_DELETE' && this.memoryService) {
      await this.memoryService.deleteByKey('user.name');
      if (this.personalityService) {
        await this.personalityService.updateProfile({ userName: undefined });
      }
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'assistant',
        content: "I've forgotten your name.",
        timestamp: Date.now(),
        metadata: { providerId: 'local-memory', operation: 'delete' },
      };
      conversation = await this.repository.appendMessage(conversationId, assistantMessage);
      return { userMessage, assistantMessage };
    }

    // ── 2.2 MEMORY QUERY / LIST ──
    // e.g. "What is my name?", "What do you remember about me?"
    if (
      (intent?.type === 'MEMORY_QUERY' ||
        intent?.type === 'MEMORY_LIST' ||
        (this.memoryRetrieval && this.memoryRetrieval.isMemoryQuery(content))) &&
      this.memoryRetrieval
    ) {
      const result = await this.memoryRetrieval.answerQuery(content);
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'assistant',
        content: result.answer,
        timestamp: Date.now(),
        metadata: {
          providerId: 'local-memory',
          operation: 'query',
          found: result.found,
          memoryKey: result.memoryKey,
          memoryValue: result.memoryValue,
        },
      };
      conversation = await this.repository.appendMessage(conversationId, assistantMessage);
      return { userMessage, assistantMessage };
    }

    // ── 2.25 MODEL IDENTITY QUERY ──
    // e.g. "Which model are you?", "What model is this?"
    if (this.modelIdentity.isModelIdentityQuery(content)) {
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'assistant',
        content: this.modelIdentity.getIdentityResponse(),
        timestamp: Date.now(),
        metadata: {
          providerId: 'qwen-local',
          operation: 'model_identity',
        },
      };
      conversation = await this.repository.appendMessage(conversationId, assistantMessage);
      return { userMessage, assistantMessage };
    }

    // ── 2.26 OFFLINE AIRPLANE MODE CHECK FOR LIVE / NETWORK TASKS ──
    // Section 59 & Section 65: If offline, explain truthfully that internet connectivity is required.
    if (
      NetworkGuard.isAirplaneMode() &&
      (content.toLowerCase().includes('latest ai news') ||
        content.toLowerCase().includes('today\'s news') ||
        content.toLowerCase().includes('current news') ||
        content.toLowerCase().includes('latest news'))
    ) {
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: 'assistant',
        content:
          "I need an internet connection to fetch the latest AI news. Currently, network connectivity is unavailable in offline mode. Your local on-device AI features remain fully available.",
        timestamp: Date.now(),
        metadata: {
          providerId: 'qwen-local',
          operation: 'offline_network_guard',
        },
      };
      conversation = await this.repository.appendMessage(conversationId, assistantMessage);
      return { userMessage, assistantMessage };
    }

    // ── 2.3 MEMORY EXTRACTION & PERSISTENCE BEFORE RESPONSE ──
    // Extracts durable personal facts before response generation (e.g. "Hey my name is uk")
    let memorySavedAcknowledgment = '';
    if (this.memoryService) {
      const candidates = this.memoryExtraction.extract(content);
      for (const candidate of candidates) {
        await this.memoryService.setKey(
          candidate.key,
          candidate.value,
          candidate.category,
          candidate.type,
          candidate.confidence,
          candidate.source
        );

        if (candidate.key === 'user.name' && this.personalityService) {
          await this.personalityService.updateProfile({ userName: candidate.value });
          memorySavedAcknowledgment = `Nice to meet you, ${candidate.value}! I'll remember that.`;
        } else if (candidate.type === 'PREFERENCE') {
          memorySavedAcknowledgment = `Got it, I'll remember your preference for ${candidate.value}.`;
        } else if (candidate.type === 'USER_INSTRUCTION') {
          memorySavedAcknowledgment = `Got it, I've noted that.`;
        }
      }

      if (
        memorySavedAcknowledgment &&
        (intent?.type === 'MEMORY_STORE' ||
          intent?.type === 'MEMORY_UPDATE' ||
          /^(?:(?:hey|hi|hello)\s*,?\s*)?(?:my\s+name(?:'s|\s+is)|call\s+me|you\s+can\s+call\s+me|i\s+am|i'm)\s+[a-zA-Z0-9_\-\s]+(?:[\.!\?,]|$)/i.test(
            content.trim()
          ) ||
          /^(?:remember\s+(?:that\s+)?)?i\s+(?:like|love|enjoy|prefer)\s+[a-zA-Z0-9_\-\s]+(?:[\.!\?,]|$)/i.test(
            content.trim()
          ))
      ) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: 'assistant',
          content: memorySavedAcknowledgment,
          timestamp: Date.now(),
          metadata: { providerId: 'local-memory', operation: 'store' },
        };
        conversation = await this.repository.appendMessage(conversationId, assistantMessage);
        return { userMessage, assistantMessage };
      }
    }

    // 2.4 Build context (reflects newly stored memories / updated profile)
    const context = await this.buildRequestContext();

    // 2.5 Check for actionable intent (Phase 2)
    if (this.actionService) {
      const plan = this.actionService.planFromInput(content);
      if (plan && plan.steps.length > 0) {
        const { results, allSucceeded } = await this.actionService.handlePlan(plan);
          const actionSummary = allSucceeded
            ? `✓ ${plan.description}`
            : `Action failed: ${results.find((r) => !r.success)?.error || 'Unknown error'}`;

          const assistantMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: 'assistant',
            content: actionSummary,
            timestamp: Date.now(),
            metadata: { providerId: 'action-engine', actionResults: results },
          };

          conversation = await this.repository.appendMessage(conversationId, assistantMessage);
          if (!conversation.title && conversation.messages.length <= 2) {
            conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
            await this.repository.save(conversation);
          }
          return { userMessage, assistantMessage };
        }
      }

    // 2.6 Check for External / API / Agent / Multi-Step Task (Phase 3)
    if (this.taskUnderstanding && this.externalService) {
      const intent = this.taskUnderstanding.classify(content);
      const isExternalIntent =
        intent.type === 'API_TASK' ||
        intent.type === 'EXTERNAL_API' ||
        intent.type === 'AGENT_TASK' ||
        intent.type === 'EXTERNAL_AI' ||
        (intent.type === 'MULTI_STEP_TASK' &&
          (content.toLowerCase().includes('email') ||
            content.toLowerCase().includes('meeting')));

      if (isExternalIntent) {
        // Handle multi-step task like "Find meeting details from email and open in Maps"
        if (
          content.toLowerCase().includes('meeting') &&
          content.toLowerCase().includes('map')
        ) {
          const multiResult = await this.externalService.handleMultiStepTask(content);
          const assistantMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: 'assistant',
            content: multiResult.summary,
            timestamp: Date.now(),
            metadata: { providerId: 'multi-step-orchestrator', multiResult },
          };
          conversation = await this.repository.appendMessage(conversationId, assistantMessage);
          if (!conversation.title && conversation.messages.length <= 2) {
            conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
            await this.repository.save(conversation);
          }
          return { userMessage, assistantMessage };
        }

        // Standard external task (e.g. "Show my latest emails")
        const { decision, response } = await this.externalService.handleExternalTask(
          content,
          intent
        );

        let replyContent = '';
        let metadata: Record<string, unknown> = {
          providerId: response.providerId,
          decision,
        };

        if (response.status === 'requires_authentication') {
          replyContent =
            "Gmail isn't connected yet.\n\nConnect Gmail so Saturday can retrieve your messages.";
          metadata = {
            ...metadata,
            requiresAuth: true,
            serviceId: (response.metadata?.serviceId as string) || 'gmail',
            prompt: response.metadata?.prompt,
          };
        } else if (response.status === 'completed') {
          const res = response.result as Record<string, unknown>;
          if (res?.messages && Array.isArray(res.messages)) {
            const msgs = res.messages as Array<{
              from: string;
              subject: string;
              snippet: string;
            }>;
            if (msgs.length === 0) {
              replyContent = 'Your inbox has no new messages.';
            } else {
              replyContent =
                `You have ${msgs.length} recent email${msgs.length > 1 ? 's' : ''}:\n\n` +
                msgs
                  .map(
                    (m, idx) =>
                      `${idx + 1}. **${m.subject}**\n   From: ${m.from}\n   ${m.snippet}`
                  )
                  .join('\n\n');
            }
          } else if (typeof response.result === 'string') {
            replyContent = response.result;
          } else {
            replyContent = `Task completed successfully: ${JSON.stringify(response.result)}`;
          }
        } else {
          replyContent = `Unable to complete request: ${response.error || 'Unknown external error'}`;
        }

        const assistantMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: 'assistant',
          content: replyContent,
          timestamp: Date.now(),
          metadata,
        };

        conversation = await this.repository.appendMessage(conversationId, assistantMessage);
        if (!conversation.title && conversation.messages.length <= 2) {
          conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          await this.repository.save(conversation);
        }
        return { userMessage, assistantMessage };
      }
    }

    // 3. Route to provider
    let assistantContent: string;
    let providerId = 'unknown';

    try {
      if (!(await this.registry.hasAvailableProvider())) {
        throw new AIProviderUnavailableError();
      }

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
