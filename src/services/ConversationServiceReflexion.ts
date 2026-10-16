/**
 * ConversationServiceReflexion - Enhanced with Reflexion framework
 * SUPER FAST implementation with:
 * - Deterministic tools (bypass LLM for math/time/memory)
 * - Background reflection generation (doesn't block user)
 * - Parallel evaluation checks
 * - Smart caching
 * 
 * Speed targets:
 * - Deterministic queries: <10ms
 * - LLM queries: <2s (with streaming)
 * - Evaluation: <5ms
 * - Reflection generation: Background (0ms blocking)
 */

import { Conversation, Message } from '../core/types/conversation';
import { ConversationRepository } from '../storage/ConversationRepository';
import { AIProviderRegistry } from '../core/ai/AIProviderRegistry';
import { AIRouter } from '../core/routing/AIRouter';
import { AIRequest } from '../core/types/ai';
import { ContextService } from '../core/context/ContextService';
import { PersonalityService } from './PersonalityService';
import { MemoryService } from './MemoryService';

// Reflexion components
import { ResponseEvaluator, EvaluationContext } from '../core/validation/ResponseEvaluator';
import { ReflectionGenerator } from '../core/reflection/ReflectionGenerator';
import { EpisodicMemoryStore } from '../core/memory/EpisodicMemoryStore';
import { ToolRegistry } from '../core/tools/ToolRegistry';

export class ConversationServiceReflexion {
  // Reflexion components
  private evaluator: ResponseEvaluator;
  private reflectionGenerator: ReflectionGenerator;
  private episodicMemory: EpisodicMemoryStore;
  private toolRegistry: ToolRegistry;

  private messageIdCounter: number = 0;
  private maxReflexionTrials = 2; // Max retries with reflection
  private providerConfigCallback: ((decision: any) => Promise<void>) | null = null;

  constructor(
    private repository: ConversationRepository,
    private registry: AIProviderRegistry,
    private router: AIRouter,
    private contextService: ContextService,
    private personalityService: PersonalityService,
    private memoryService?: MemoryService
  ) {
    // Initialize Reflexion components
    this.evaluator = new ResponseEvaluator();
    this.reflectionGenerator = new ReflectionGenerator();
    this.episodicMemory = new EpisodicMemoryStore();
    this.toolRegistry = new ToolRegistry();

    console.log('🚀 ConversationServiceReflexion initialized with fast-path tools');
  }

  /**
   * FAST: Send message with Reflexion loop
   * Priority: Deterministic tools > LLM with reflection > External API
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    const startTime = Date.now();
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📥 User: "${content}"`);

    // 1. Pre-validation (instant)
    const preValidation = this.evaluator.preValidate(content);
    if (preValidation) {
      return this.createErrorResponse(conversationId, content, preValidation);
    }

    // 2. Create user message
    const userMessage: Message = {
      id: this.generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    await this.repository.appendMessage(conversationId, userMessage);

    // 3. FAST PATH: Try deterministic tools first (< 10ms)
    const toolResult = await this.tryDeterministicTools(content, conversationId);
    if (toolResult) {
      const elapsed = Date.now() - startTime;
      console.log(`⚡ FAST PATH: ${toolResult.toolName} (${elapsed}ms total)`);
      
      const assistantMessage = await this.createAndSaveMessage(
        conversationId,
        toolResult.result,
        'assistant'
      );

      return { userMessage, assistantMessage };
    }

    // 4. REFLEXION LOOP: LLM with evaluation and retry
    const response = await this.reflexionLoop(content, conversationId);
    
    const assistantMessage = await this.createAndSaveMessage(
      conversationId,
      response,
      'assistant'
    );

    const totalElapsed = Date.now() - startTime;
    console.log(`✅ Total response time: ${totalElapsed}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return { userMessage, assistantMessage };
  }

  /**
   * ULTRA FAST: Try deterministic tools (< 10ms)
   * Math, datetime, memory retrieval bypass LLM completely
   */
  private async tryDeterministicTools(
    userInput: string,
    conversationId: string
  ): Promise<{ result: string; toolName: string } | null> {
    // Get memories for context (use search or listAll)
    let memories: any[] = [];
    if (this.memoryService) {
      try {
        // Try search method if available, otherwise use listAll
        if (typeof (this.memoryService as any).search === 'function') {
          memories = await (this.memoryService as any).search(userInput, 5);
        } else {
          const allMemories = await this.memoryService.listAll();
          memories = allMemories.slice(0, 5);
        }
      } catch (err) {
        console.log('Memory service error, continuing without memories:', err);
        memories = [];
      }
    }

    const toolResult = await this.toolRegistry.tryExecute(userInput, { memories });
    
    if (toolResult && toolResult.evaluation.passed) {
      return {
        result: toolResult.result,
        toolName: toolResult.toolName,
      };
    }

    return null;
  }

  /**
   * REFLEXION LOOP: Actor → Evaluator → Self-Reflection
   * From Reflexion paper: iterate until evaluation passes or max trials
   */
  private async reflexionLoop(
    userInput: string,
    conversationId: string
  ): Promise<string> {
    let response = '';
    let trialCount = 0;
    
    // Classify query for pattern matching
    const queryPattern = this.classifyQueryPattern(userInput);
    
    // Retrieve past reflections for similar queries
    const pastReflections = await this.episodicMemory.retrieveRelevantReflections(
      userInput,
      queryPattern
    );

    console.log(`🔍 Query pattern: ${queryPattern}`);
    if (pastReflections.length > 0) {
      console.log(`📚 Found ${pastReflections.length} past reflection(s)`);
    }

    // Build context with reflections
    const baseContext = await this.buildContext(conversationId, userInput);
    
    while (trialCount < this.maxReflexionTrials) {
      console.log(`\n🔄 Trial ${trialCount + 1}/${this.maxReflexionTrials}`);
      
      // ACTOR: Generate response with reflection context
      const contextWithReflections = {
        ...baseContext,
        reflections: pastReflections.map(r => r.verbalReflection),
        hints: pastReflections.flatMap(r => r.actionableHints),
      };

      response = await this.generateResponse(userInput, contextWithReflections);
      const preview = response ? response.substring(0, 100) : 'empty';
      console.log(`💭 Response: "${preview}${response && response.length > 100 ? '...' : ''}"`);

      // EVALUATOR: Check response quality (< 5ms)
      const evaluationContext: EvaluationContext = {
        memories: baseContext.memories,
        expectedType: this.detectExpectedType(userInput),
        userInput,
      };

      const evaluation = await this.evaluator.evaluate(response, evaluationContext);
      console.log(`📊 Evaluation: ${evaluation.passed ? '✅ PASS' : '❌ FAIL'} (score: ${evaluation.score.toFixed(2)})`);

      if (evaluation.passed) {
        console.log(`✅ Trial ${trialCount + 1} succeeded`);
        return response;
      }

      // SELF-REFLECTION: Generate feedback (background, non-blocking)
      console.log(`🤔 Generating reflection...`);
      const reflection = this.reflectionGenerator.generateReflection({
        userInput,
        response,
        evaluation,
        attemptNumber: trialCount + 1,
      });

      // Store reflection (background - doesn't block)
      this.episodicMemory.storeReflection(reflection).catch(err => {
        console.error('Failed to store reflection:', err);
      });

      console.log(`💡 Reflection: ${reflection.verbalReflection ? reflection.verbalReflection.substring(0, 150) : 'empty'}...`);
      
      // Add current reflection to context for next trial
      pastReflections.push(reflection);
      
      trialCount++;
    }

    // Max trials exceeded - return best attempt with warning
    console.warn(`⚠️ Max trials (${this.maxReflexionTrials}) exceeded`);
    return response;
  }

  /**
   * FAST: Generate response using local or external AI
   */
  private async generateResponse(
    userInput: string,
    context: any
  ): Promise<string> {
    try {
      const startTime = Date.now();
      
      console.log('🤖 Generating AI response...');
      
      // Check if there's an available provider
      if (!(await this.registry.hasAvailableProvider())) {
        console.error('❌ No AI provider available');
        return "No AI provider is currently available.";
      }
      
      // Get conversation history for context
      const messages: Message[] = context.conversationHistory || [];
      
      // Add user's current message
      const allMessages: Message[] = [
        ...messages,
        {
          id: 'temp',
          role: 'user',
          content: userInput,
          timestamp: Date.now(),
        },
      ];

      // Step 1: Get routing decision (pass user input for smart routing)
      const routingDecision = await this.router.route({ userInput });
      const providerId = routingDecision.providerId;
      
      console.log(`🎯 Routing decision: ${providerId}`);
      
      // Step 2: Get the provider
      const provider = this.registry.getProvider(providerId);
      if (!provider) {
        console.error(`❌ Provider ${providerId} not found`);
        return "The selected AI provider is not available.";
      }

      // Step 3: Build AI request with context
      const aiRequest: AIRequest = {
        messages: allMessages,
        context: {
          ...context,
          currentTime: new Date().toISOString(),
        },
      };

      // Step 4: Generate response
      const response = await provider.generate(aiRequest);
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️  AI generation: ${elapsed}ms`);
      console.log(`📝 Response length: ${response?.content?.length || 0} chars`);
      console.log(`📄 Response preview: ${response?.content?.substring(0, 100) || 'empty'}`);

      return response?.content || "I'm having trouble responding right now.";
    } catch (error) {
      console.error('❌ AI generation error:', error);
      return "I'm having trouble processing that right now. Could you try rephrasing?";
    }
  }

  /**
   * FAST: Build system prompt with reflections
   */
  private buildSystemPrompt(context: any): string {
    let prompt = 'You are Saturday, a personal AI assistant.';

    // Add reflection hints if available
    if (context.hints && context.hints.length > 0) {
      prompt += '\n\nImportant guidance from past mistakes:';
      for (const hint of context.hints.slice(0, 3)) {
        prompt += `\n- ${hint}`;
      }
    }

    // Add memories
    if (context.memories && context.memories.length > 0) {
      prompt += '\n\nUser Context:';
      for (const memory of context.memories.slice(0, 5)) {
        prompt += `\n- ${memory.key}: ${memory.value}`;
      }
    }

    return prompt;
  }

  /**
   * INSTANT: Classify query pattern for reflection matching
   */
  private classifyQueryPattern(userInput: string): string {
    const lower = userInput.toLowerCase().trim();

    if (/\d+\s*[\+\-\*\/x]\s*\d+/.test(lower)) return 'math_expression';
    if (/what('?s| is) my/.test(lower)) return 'memory_recall';
    if (/^(who is|who was|who are)/.test(lower)) return 'who_is_query';
    if (/^(what is|what are|what was)/.test(lower)) return 'what_is_query';
    if (/what time|current time/.test(lower)) return 'time_query';
    if (/^(hi|hello|hey)/.test(lower)) return 'greeting';

    return 'general_query';
  }

  /**
   * INSTANT: Detect expected response type for evaluation
   */
  private detectExpectedType(userInput: string): 'math' | 'factual' | 'conversational' | 'memory' {
    const lower = userInput.toLowerCase();

    if (/\d+\s*[\+\-\*\/x]/.test(lower)) return 'math';
    if (/what('?s| is) my|remember|forget/.test(lower)) return 'memory';
    if (/who is|what is|when did|where is/.test(lower)) return 'factual';
    
    return 'conversational';
  }

  /**
   * FAST: Build AI context from conversation history and memories
   */
  private async buildContext(conversationId: string, userInput: string): Promise<any> {
    const conversation = await this.repository.load(conversationId);
    
    // Get memories - use search or listAll
    let memories: any[] = [];
    if (this.memoryService) {
      try {
        if (typeof (this.memoryService as any).search === 'function') {
          memories = await (this.memoryService as any).search(userInput, 5);
        } else {
          const allMemories = await this.memoryService.listAll();
          memories = allMemories.slice(0, 5);
        }
      } catch (err) {
        console.log('Memory service error:', err);
      }
    }

    return {
      conversationHistory: conversation?.messages.slice(-4) || [], // Last 4 messages
      memories,
      currentTime: new Date().toISOString(),
    };
  }

  /**
   * INSTANT: Create and save assistant message
   */
  private async createAndSaveMessage(
    conversationId: string,
    content: string,
    role: 'user' | 'assistant'
  ): Promise<Message> {
    const message: Message = {
      id: this.generateMessageId(),
      role,
      content,
      timestamp: Date.now(),
    };

    await this.repository.appendMessage(conversationId, message);
    return message;
  }

  /**
   * INSTANT: Create error response
   */
  private async createErrorResponse(
    conversationId: string,
    userContent: string,
    errorMessage: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    const userMessage: Message = {
      id: this.generateMessageId(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    };

    const assistantMessage: Message = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: errorMessage,
      timestamp: Date.now(),
    };

    await this.repository.appendMessage(conversationId, userMessage);
    await this.repository.appendMessage(conversationId, assistantMessage);

    return { userMessage, assistantMessage };
  }

  /**
   * Set a callback to handle provider configuration requests.
   */
  setProviderConfigCallback(cb: (decision: any) => Promise<void>): void {
    this.providerConfigCallback = cb;
  }

  /**
   * INSTANT: Generate unique message ID
   */
  private generateMessageId(): string {
    this.messageIdCounter++;
    return `msg_${Date.now()}_${this.messageIdCounter}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  STANDARD CONVERSATION METHODS
  // ═══════════════════════════════════════════════════════════════

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

  async load(id: string): Promise<Conversation | null> {
    return this.repository.load(id);
  }

  async listAll() {
    return this.repository.listAll();
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * Get Reflexion statistics
   */
  getReflexionStats() {
    return {
      episodicMemory: this.episodicMemory.getStats(),
      tools: this.toolRegistry.getAllTools().map(t => t.name),
    };
  }
}
