/**
 * WebSearchTool - Provides real-time web search capabilities
 * 
 * Uses DuckDuckGo (free, unlimited, searches entire web)
 * - Instant Answer API for quick facts
 * - HTML search fallback for general queries
 * 
 * Note: Google Custom Search deprecated free "search entire web" feature.
 * Now only supports searching specific domains (max 50), not useful for general AI.
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  publishedDate?: string;
  source?: string;
}

export interface SearchOptions {
  maxResults?: number;
  searchType?: 'news' | 'general' | 'recent';
  region?: string;
}

export class WebSearchTool {
  private readonly DDG_API = 'https://api.duckduckgo.com/';
  private readonly DDG_HTML = 'https://html.duckduckgo.com/html/';
  
  /**
   * Perform web search using DuckDuckGo.
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { maxResults = 5 } = options;
    
    console.log(`🔍 [WebSearch] Searching for: "${query}"`);
    
    try {
      // Try DuckDuckGo Instant Answer API first (fast, structured)
      const instantResults = await this.searchDuckDuckGoInstant(query);
      if (instantResults.length > 0) {
        console.log(`✅ [WebSearch] DuckDuckGo found ${instantResults.length} instant results`);
        return instantResults.slice(0, maxResults);
      }
      
      // Fallback to HTML scraping for general search
      console.log(`🔄 [WebSearch] Trying DuckDuckGo HTML search...`);
      const htmlResults = await this.searchDuckDuckGoHTML(query, maxResults);
      
      if (htmlResults.length > 0) {
        console.log(`✅ [WebSearch] Found ${htmlResults.length} HTML results`);
        return htmlResults;
      }
      
      console.warn(`⚠️ [WebSearch] No results found for query: "${query}"`);
      return [];
      
    } catch (error) {
      console.error(`❌ [WebSearch] Search failed:`, error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Search using DuckDuckGo Instant Answer API
   */
  private async searchDuckDuckGoInstant(query: string): Promise<SearchResult[]> {
    try {
      const url = `${this.DDG_API}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      console.log(`🌐 [WebSearch] Calling DDG Instant API...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Saturday-AI/1.0',
        },
      });
      
      if (!response.ok) {
        console.warn(`⚠️ [WebSearch] DDG API returned status ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      const results: SearchResult[] = [];
      
      // Extract Abstract (main result)
      if (data.Abstract && data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || data.AbstractSource || '',
          source: data.AbstractSource || 'DuckDuckGo',
        });
      }
      
      // Extract Related Topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
              snippet: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo',
            });
          }
        }
      }
      
      return results;
      
    } catch (error) {
      console.warn(`⚠️ [WebSearch] DDG Instant API failed:`, error);
      return [];
    }
  }
  
  /**
   * Search using DuckDuckGo HTML (scraping fallback)
   */
  private async searchDuckDuckGoHTML(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      // Use DuckDuckGo HTML search with POST request
      const formData = new URLSearchParams({
        q: query,
        b: '',
        kl: 'wt-wt',
      });
      
      console.log(`🌐 [WebSearch] Calling DDG HTML search...`);
      
      const response = await fetch(this.DDG_HTML, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: formData.toString(),
      });
      
      if (!response.ok) {
        console.warn(`⚠️ [WebSearch] DDG HTML returned status ${response.status}`);
        return [];
      }
      
      const html = await response.text();
      return this.parseHTMLResults(html, maxResults);
      
    } catch (error) {
      console.warn(`⚠️ [WebSearch] DDG HTML search failed:`, error);
      return [];
    }
  }
  
  /**
   * Parse HTML search results
   */
  private parseHTMLResults(html: string, maxResults: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      // Extract result blocks using regex (simple parsing)
      // Look for result divs with class "result"
      const resultPattern = /<div class="result[^"]*"[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      
      let match;
      while ((match = resultPattern.exec(html)) !== null && results.length < maxResults) {
        const url = this.decodeHTMLEntities(match[1]);
        const title = this.stripHTML(match[2]);
        const snippet = this.stripHTML(match[3]);
        
        if (url && title && snippet) {
          results.push({
            title: title.substring(0, 200),
            snippet: snippet.substring(0, 300),
            url,
            source: new URL(url).hostname,
          });
        }
      }
      
      console.log(`📄 [WebSearch] Parsed ${results.length} results from HTML`);
      
    } catch (error) {
      console.error(`❌ [WebSearch] HTML parsing failed:`, error);
    }
    
    return Promise.resolve(results);
  }
  
  /**
   * Strip HTML tags from text
   */
  private stripHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Decode HTML entities
   */
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  
  /**
   * Format search results as text for AI consumption
   */
  formatResultsForAI(results: SearchResult[], query: string): string {
    if (results.length === 0) {
      return `No web search results found for: "${query}"`;
    }
    
    let formatted = `WEB SEARCH RESULTS for "${query}":\n`;
    formatted += `Found ${results.length} results:\n\n`;
    
    results.forEach((result, index) => {
      formatted += `[${index + 1}] ${result.title}\n`;
      formatted += `    ${result.snippet}\n`;
      formatted += `    Source: ${result.source || result.url}\n`;
      formatted += `    URL: ${result.url}\n\n`;
    });
    
    formatted += `\nPlease summarize these search results for the user. Include relevant information and cite sources when appropriate.`;
    
    return formatted;
  }
}
