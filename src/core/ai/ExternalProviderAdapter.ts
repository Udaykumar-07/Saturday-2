/**
 * ExternalProviderAdapter - Adapts external providers to AIProvider interface
 * 
 * External providers (OpenAI, Anthropic, Gemini) use execute(ExternalRequest)
 * AIProvider interface expects generate(AIRequest)
 * 
 * This adapter bridges the two interfaces so external providers can be
 * registered with AIProviderRegistry and used by AIRouter.
 */

import { AIProvider, AIRequest, AIResponse, IntelligenceCapability } from '../types/ai';
import { BaseExternalProvider } from '../external/providers/ExternalProvider';
import { ExternalRequest } from '../types/external';
import { WebSearchTool } from '../tools/WebSearchTool';

export class ExternalProviderAdapter implements AIProvider {
  readonly id: string;
  readonly name: string;
  readonly type = 'cloud_model' as const;
  private webSearchTool: WebSearchTool;

  constructor(private externalProvider: BaseExternalProvider) {
    this.id = externalProvider.id;
    this.name = externalProvider.name;
    // Initialize WebSearchTool (DuckDuckGo - free, unlimited, no config)
    this.webSearchTool = new WebSearchTool();
  }

  async isAvailable(): Promise<boolean> {
    return this.externalProvider.isAvailable();
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    console.log(`🌐 [${this.name}] Generating response...`);
    console.log(`📝 Messages: ${request.messages.length}`);

    
    // Convert AIRequest to ExternalRequest format
    const lastMessage = request.messages[request.messages.length - 1];
    const userInput = lastMessage?.content || '';
    
    // Build context from previous messages
    let conversationContext = '';
    if (request.messages.length > 1) {
      const previousMessages = request.messages.slice(0, -1);
      conversationContext = previousMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');
    }
    
    // Inject system context (current date/time) at the beginning
    let systemContext = '';
    if (request.context?.currentTime) {
      const date = new Date(request.context.currentTime);
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
      systemContext = `SYSTEM CONTEXT:\nCurrent Date: ${dateStr}\nCurrent Time: ${timeStr}\n\n`;
      console.log(`📅 [${this.name}] Injecting system date/time: ${dateStr} ${timeStr}`);
    }
    
    // Add capability limitations notice for queries requiring real-time web access
    const needsLiveWebData = /latest news|current news|breaking news|today'?s? news|recent news|news update|what'?s? happening|trending now|live (score|update|data)|current (weather|stock|price)/i.test(userInput);
    
    // Detect if query needs web search
    const needsWebSearch = /search (for|about|on|web)?|google|find (on web|online|information about)|look up|latest news|current news|recent (news|events|developments)|what'?s? happening|trending/i.test(userInput) 
      || /^(new|latest)?\s*(tesla|iphone|samsung|google|apple|spacex|microsoft|amazon|meta|nvidia|amd|intel)\s+\w+$/i.test(userInput.trim());
    
    // Perform web search if needed
    let searchResults = '';
    if (needsWebSearch) {
      try {
        console.log(`🔍 [${this.name}] Detected web search query, performing search...`);
        
        // Extract search query (remove "search", "google", "find" etc.)
        let searchQuery = userInput
          .replace(/^(search|google|find|look up|what'?s?)\s+(for|about|on|web|online|information about)?\s*/i, '')
          .replace(/latest news about\s*/i, '')
          .replace(/current news on\s*/i, '')
          .trim();
        
        // Handle context-dependent queries like "search it", "when will it release"
        // If query is very short/vague, try to extract context from recent conversation
        if (searchQuery.length < 10 || /^(it|this|that|release|date)$/i.test(searchQuery)) {
          // Look for subject in recent messages
          const recentMessages = request.messages.slice(-5); // Last 5 messages
          for (let i = recentMessages.length - 1; i >= 0; i--) {
            const msg = recentMessages[i];
            if (msg.role === 'user' && msg.content.length > 10) {
              // Found a substantive user message, extract topic
              const previousQuery = msg.content.toLowerCase();
              
              // Extract brand/product mentions
              const productMatch = previousQuery.match(/\b(tesla\s+\w+|iphone\s+\w+|samsung\s+\w+|spacex\s+\w+|nvidia\s+\w+|apple\s+\w+)\b/i);
              if (productMatch) {
                searchQuery = productMatch[1] + ' ' + userInput.replace(/^(search|it|this|that)\s*/i, '');
                console.log(`🔎 [${this.name}] Found context from conversation: "${productMatch[1]}"`);
                break;
              }
            }
          }
        }
        
        console.log(`🔎 [${this.name}] Extracted search query: "${searchQuery}"`);
        
        const results = await this.webSearchTool.search(searchQuery, {
          maxResults: 5,
          searchType: needsLiveWebData ? 'news' : 'general',
        });
        
        if (results.length > 0) {
          searchResults = '\n\n' + this.webSearchTool.formatResultsForAI(results, searchQuery) + '\n';
          console.log(`✅ [${this.name}] Web search successful: ${results.length} results found`);
          
          // Remove the limitation notice since we have real search results
          systemContext = systemContext.replace(/IMPORTANT LIMITATION:[\s\S]*?directly\.\n\n/g, '');
        } else {
          console.warn(`⚠️ [${this.name}] Web search returned no results`);
        }
      } catch (error) {
        console.error(`❌ [${this.name}] Web search failed:`, error);
        // Keep the limitation notice if search fails
      }
    }
    
    if (needsLiveWebData && !searchResults) {
      systemContext += `IMPORTANT LIMITATION: You do not have real-time internet access or web browsing capabilities. You cannot fetch live news, current events, or real-time data (weather, stocks, scores, etc.). If asked for such information, politely explain that you cannot access real-time web data and suggest the user check relevant websites or news sources directly.\n\n`;
      console.log(`⚠️ [${this.name}] Query requires live web data - limitation notice added`);
    }
    
    const fullInput = conversationContext 
      ? `${systemContext}${conversationContext}\n\nuser: ${userInput}${searchResults}`
      : `${systemContext}user: ${userInput}${searchResults}`;

    const externalRequest: ExternalRequest = {
      taskId: `task_${Date.now()}`,
      type: 'API_TASK',
      input: fullInput,
      requiresAuth: false,
      privacyLevel: 'standard',
      metadata: {
        context: request.context,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      },
    };

    try {
      const startTime = Date.now();
      
      // Call the external provider
      const response = await this.externalProvider.execute(externalRequest);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [${this.name}] Response received: ${elapsed}ms`);

      // Handle different response statuses
      if (response.status === 'requires_authentication') {
        console.error(`❌ [${this.name}] Authentication required`);
        throw new Error(`${this.name} requires authentication. Please configure API key in settings.`);
      }

      if (response.status === 'failed') {
        console.error(`❌ [${this.name}] Request failed:`, response.error);
        console.error(`❌ [${this.name}] Full response:`, JSON.stringify(response, null, 2));
        throw new Error(response.error || `${this.name} request failed`);
      }

      // Extract result text
      const resultText = typeof response.result === 'string' 
        ? response.result 
        : String(response.result || '');

      console.log(`📊 [${this.name}] Response length: ${resultText.length} chars`);
      console.log(`📄 [${this.name}] Preview: ${resultText.substring(0, 100)}...`);

      // Convert ExternalResponse to AIResponse
      return {
        content: resultText,
        providerId: this.id,
        modelId: response.metadata?.model as string | undefined,
        usage: {
          inputTokens: response.metadata?.tokensUsed as number | undefined,
          outputTokens: response.metadata?.tokensGenerated as number | undefined,
        },
        metadata: {
          status: response.status,
          latency: elapsed,
          ...response.metadata,
        },
      };
    } catch (error) {
      console.error(`❌ [${this.name}] Generation error:`, error);
      // Log full error details for debugging
      if (error instanceof Error) {
        console.error(`❌ [${this.name}] Error name: ${error.name}`);
        console.error(`❌ [${this.name}] Error message: ${error.message}`);
        console.error(`❌ [${this.name}] Error stack:`, error.stack);
      }
      throw error;
    }
  }

  getCapabilities(): IntelligenceCapability[] {
    const capabilities = this.externalProvider.getCapabilities();
    return capabilities.map(cap => ({
      id: cap.toLowerCase(),
      category: 'ai_generation',
      score: 0.9,
    }));
  }
}
