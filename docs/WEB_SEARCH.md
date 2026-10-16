# Web Search Feature

## Overview
Saturday AI can perform real-time web searches to answer current questions and provide up-to-date information.

## How It Works

**Automatic Detection** - Web search activates automatically when you ask about:
- Latest news or current events
- New product releases ("new Tesla roadster", "latest iPhone")
- Recent developments or trends
- Questions starting with "search", "google", "find on web"

**Search Providers (Hybrid MVP Approach):**

*Primary: Google Custom Search (if configured)*
- ✅ Higher quality, more current results
- ✅ Reuses Gemini API key (no extra setup for users)
- ⚠️ Shared 100 queries/day limit (MVP only)

*Fallback: DuckDuckGo (always available)*
- ✅ Free and unlimited
- ✅ No API keys or setup required
- ⚠️ Sometimes outdated results

## Examples

**Product Queries:**
```
User: new tesla roadster
→ Routes to Gemini with web search
→ Returns latest roadster specs and release date
```

**News Queries:**
```
User: latest news about AI
→ Performs web search
→ Summarizes recent articles
```

**Context-Aware Search:**
```
User: tell me about tesla roadster
Assistant: [responds about roadster]
User: search it
→ Extracts "tesla roadster" from conversation
→ Performs web search with context
```

## Smart Routing

The AI Router automatically decides when to use web search:

**External + Web Search:**
- Current events / latest news
- Product releases (Tesla, iPhone, Samsung, etc.)
- Explicit search requests ("google...", "search...")

**Local Model (No Search):**
- Coding questions
- Math calculations
- General knowledge
- Creative writing

## Technical Details

**Search Process:**
1. Detect web search need (regex patterns)
2. Extract search query from user input
3. Try DuckDuckGo Instant Answer API (fast)
4. Fallback to HTML search if needed
5. Format results for AI consumption
6. AI summarizes and responds

**Result Format:**
```typescript
{
  title: string;
  snippet: string;
  url: string;
  source: string;
}
```

## Future Improvements

**Potential Enhancements:**
- Google Custom Search as optional upgrade (requires per-user setup)
- Search result caching to reduce redundant queries
- Source citation in AI responses
- Image search results
- News-specific search filters

## Why DuckDuckGo Only?

**Google deprecated free web search:**
- Google Custom Search free tier no longer supports "Search the entire web"
- Now only searches specific domains (max 50) - not useful for general AI
- Paid tier ($5/1000 queries) still supports web-wide search

**DuckDuckGo is better for MVP:**
- Actually searches the entire web
- Unlimited queries (no quotas)
- Zero cost forever
- No setup friction
- Trade-off: Occasionally older results (acceptable)

## Setup (None Required!)

Your app works out of the box with DuckDuckGo web search.

**Why no Google Search?**
Google deprecated the free "Search the entire web" feature. The free tier now only searches specific domains (max 50), not useful for a general AI assistant.

**DuckDuckGo advantages:**
- Truly searches the entire web
- Unlimited queries forever
- Zero setup or API keys
- No quotas or rate limits

## Files

- `src/core/tools/WebSearchTool.ts` - Hybrid search orchestration
- `src/core/tools/GoogleSearchTool.ts` - Google Custom Search client
- `src/core/ai/ExternalProviderAdapter.ts` - Auto-detection and integration
- `src/core/routing/AIRouter.ts` - Smart routing logic
- `src/config/searchConfig.ts` - Search Engine ID configuration
