/**
 * AI Router — decides which provider handles a request.
 * 
 * Routing Strategy:
 * 1. Check user privacy preferences (strictLocalOnly, allowExternalAI)
 * 2. Analyze query to determine if local model can handle it
 * 3. Use local for: casual chat, basic Q&A, simple tasks, coding help
 * 4. Use external for: web search, current events, complex analysis, creative writing
 * 5. Fall back gracefully when preferred provider unavailable
 */

import { AIRoutingDecision } from '../types/ai';
import { AIProviderRegistry } from '../ai/AIProviderRegistry';
import { AIProviderUnavailableError, RoutingError } from '../types/errors';

export interface RouterOptions {
  preferExternal?: boolean;      // Prefer external provider over local
  requireLocal?: boolean;         // Only use local provider
  taskComplexity?: 'simple' | 'moderate' | 'complex'; // Hint for routing
  userInput?: string;             // The actual user query for smart analysis
}

export class AIRouter {
  constructor(
    private registry: AIProviderRegistry,
    private allowExternalAI: boolean = true,      // From privacy settings
    private strictLocalOnly: boolean = false      // From privacy settings
  ) {}

  /**
   * Update privacy preferences that affect routing
   */
  updatePrivacySettings(allowExternalAI: boolean, strictLocalOnly: boolean): void {
    this.allowExternalAI = allowExternalAI;
    this.strictLocalOnly = strictLocalOnly;
  }

  /**
   * Decide which provider to use based on:
   * - Privacy settings
   * - Query analysis (what user is asking)
   * - Available providers
   * - Task complexity
   */
  async route(options?: RouterOptions): Promise<AIRoutingDecision> {
    const userInput = options?.userInput?.toLowerCase() || '';
    
    // Priority 1: Respect strictLocalOnly policy
    if (this.strictLocalOnly || options?.requireLocal) {
      return this.routeToLocal('Privacy policy requires local-only inference.');
    }

    // Priority 2: Analyze query to determine best provider
    const localAvailable = await this.isLocalAvailable();
    const externalProviders = this.allowExternalAI ? await this.getConfiguredExternalProviders() : [];
    
    // Determine if this query NEEDS external provider
    const needsExternal = this.queryNeedsExternal(userInput);
    const prefersLocal = this.queryPrefersLocal(userInput);
    
    console.log(`🔍 Query analysis:`, {
      needsExternal,
      prefersLocal,
      localAvailable,
      externalCount: externalProviders.length,
      queryPreview: userInput.substring(0, 50)
    });

    // Priority 3: Route based on query analysis
    
    // HIGHEST PRIORITY: If query NEEDS external (web search, current events, real-time data)
    // This takes precedence even if query also has local keywords
    if (needsExternal && externalProviders.length > 0) {
      const selected = externalProviders[0];
      console.log(`🌐 Routing to external: ${selected.name} (query needs internet/current info)`);
      return {
        providerId: selected.id,
        reason: `Using ${selected.name} for web search or current information.`,
        confidence: 0.95,
      };
    }
    
    // If query prefers local AND local is available AND doesn't need external
    if (prefersLocal && localAvailable && !needsExternal) {
      return this.routeToLocal('Query best handled by fast local model.');
    }
    
    // If local is available and can handle it, use local
    if (localAvailable && !needsExternal) {
      return this.routeToLocal('Query can be handled by local model efficiently.');
    }
    
    // If external is available for general queries
    if (externalProviders.length > 0 && this.allowExternalAI) {
      const selected = externalProviders[0];
      console.log(`🌐 Routing to external: ${selected.name} (general query, no local available)`);
      return {
        providerId: selected.id,
        reason: `Using ${selected.name} for response.`,
        confidence: 0.8,
      };
    }

    // Priority 4: Fall back to any available provider
    const availableProviders = await this.registry.getAvailableProviders();
    if (availableProviders.length > 0) {
      const selected = availableProviders[0];
      return {
        providerId: selected.id,
        reason: `Using ${selected.name} — no other providers available.`,
        confidence: 0.7,
      };
    }

    // No providers available at all
    throw new RoutingError(
      'No AI provider is currently available. Please configure a local model or connect an external provider.'
    );
  }

  /**
   * Determine if query NEEDS external provider (web search, current events, etc.)
   */
  private queryNeedsExternal(query: string): boolean {
    // Simple date/time queries should stay local (AI can read system context)
    const simpleDateTimeQuery = /^(what'?s?|tell me|give me)?\s*(today'?s?|current|the)?\s*(date|time|day)(\s+(today|now))?$/i.test(query.trim());
    if (simpleDateTimeQuery) {
      console.log(`📅 Simple date/time query detected, keeping local`);
      return false; // Local model can handle with system date injection
    }
    
    const externalKeywords = [
      // Web search indicators
      'search', 'google', 'find on web', 'look up', 'browse', 'search for',
      
      // News and current events (need web search)
      'latest news', 'current news', 'breaking news', 'recent news',
      'what\'s new', 'update on', 'trending', 'what\'s happening',
      
      // Real-time data (need web search)
      'weather', 'stock price', 'live score',
      
      // Specific web content
      'youtube', 'wikipedia', 'reddit', 'twitter',
    ];
    
    // Check if query is about a specific product/brand that likely needs current info
    const productQuery = /^(new|latest)?\s*(tesla|iphone|samsung|google|apple|spacex|microsoft|amazon|meta|nvidia|amd|intel)\s+\w+$/i.test(query);
    
    return externalKeywords.some(keyword => query.includes(keyword)) || productQuery;
  }

  /**
   * Determine if query PREFERS local provider (privacy, speed, offline capability)
   */
  private queryPrefersLocal(query: string): boolean {
    const localKeywords = [
      // Conversational/casual
      'hello', 'hi', 'hey', 'thanks', 'thank you',
      
      // Basic questions (no internet needed)
      'what is', 'how do', 'explain', 'define', 'tell me about',
      'can you', 'help me', 'i need',
      
      // Date/time queries (system can provide)
      'date', 'time', 'day', 'today', 'now', 'current date', 'current time',
      
      // Coding/technical (knowledge-based)
      'code', 'function', 'debug', 'error', 'syntax',
      'programming', 'write a', 'create a', 'build',
      
      // Math/logic (deterministic)
      'calculate', 'solve', 'math', 'equation',
      
      // Simple tasks
      'summarize', 'translate', 'rewrite', 'improve',
      
      // Privacy-sensitive
      'personal', 'private', 'my data', 'my information',
    ];
    
    // If query is very short (likely casual), prefer local
    if (query.length < 20 && query.split(' ').length < 5) {
      return true;
    }
    
    return localKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Helper: Route to local provider
   */
  private async routeToLocal(reason: string): Promise<AIRoutingDecision> {
    const localProvider = this.registry.getProvider('local');
    if (localProvider) {
      const available = await localProvider.isAvailable();
      if (available) {
        return {
          providerId: 'local',
          reason,
          confidence: 1.0,
        };
      }
    }
    
    throw new RoutingError('Local provider required but not available.');
  }

  /**
   * Helper: Check if local provider is available
   */
  private async isLocalAvailable(): Promise<boolean> {
    const localProvider = this.registry.getProvider('local');
    if (!localProvider) return false;
    return await localProvider.isAvailable();
  }

  /**
   * Helper: Get configured external providers (OpenAI, Anthropic, Gemini)
   */
  private async getConfiguredExternalProviders() {
    const externalProviderIds = ['openai_provider', 'anthropic_provider', 'google_gemini_provider'];
    const configured = [];
    
    for (const id of externalProviderIds) {
      const provider = this.registry.getProvider(id);
      if (provider) {
        const available = await provider.isAvailable();
        if (available) {
          configured.push(provider);
          console.log(`✅ External provider available: ${provider.name} (${id})`);
        } else {
          console.log(`❌ External provider not available: ${id}`);
        }
      }
    }
    
    return configured;
  }
}