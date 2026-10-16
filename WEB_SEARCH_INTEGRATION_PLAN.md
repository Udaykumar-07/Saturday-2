# Web Search Integration Plan

## Current Issue

User asks: "Give latest news"
- ✅ Router correctly identifies: `needsExternal: true`
- ✅ Routes to Gemini (correct decision)
- ❌ Gemini says: "I don't have access to real-time internet feeds"

**Problem**: Gemini API itself can't browse the web or fetch live information.

## Understanding LLM Limitations

### What Gemini CAN Do:
- ✅ Generate text based on training data
- ✅ Answer questions about events up to training cutoff
- ✅ Reasoning and analysis
- ✅ Creative writing

### What Gemini CANNOT Do:
- ❌ Browse the web in real-time
- ❌ Fetch current news
- ❌ Access live data (stocks, weather, etc.)
- ❌ Search Google/internet

## Solutions

### Option 1: Web Search Tool Integration (Recommended)

Add a web search capability that the AI can use:

```
User: "Give latest news"
  ↓
System: Detect search intent
  ↓
Tool: Call web search API (Google, Brave, SerpAPI)
  ↓
Result: Get top news articles
  ↓
AI: Summarize news for user
```

**Pros**:
- ✅ Actually provides real-time information
- ✅ Works for news, stocks, weather, etc.
- ✅ Powerful user experience

**Cons**:
- ⚠️ Requires additional API (Google Search API, etc.)
- ⚠️ May have costs
- ⚠️ More complex implementation

### Option 2: Clarify Capabilities (Quick Fix)

Update system prompt to clarify what AI can/cannot do:

```typescript
systemContext += `
NOTE: I cannot browse the web or access real-time information.
For current news, weather, or live data, please use a web browser.
I can help with questions about known information, coding, analysis, etc.
`;
```

**Pros**:
- ✅ Quick to implement
- ✅ Sets correct expectations
- ✅ No additional APIs needed

**Cons**:
- ❌ Doesn't actually solve the problem
- ❌ User still can't get news

### Option 3: Hybrid Approach (Best UX)

Detect queries that need live data and:
1. Show disclaimer: "I'll search the web for you..."
2. Call web search API
3. Pass results to AI for summarization
4. Return formatted response

## Recommended Implementation: Web Search Tool

### Step 1: Choose Search API

**Option A: Google Custom Search API**
- Free tier: 100 queries/day
- Paid: $5 per 1000 queries
- Best results quality
- https://developers.google.com/custom-search

**Option B: Brave Search API**
- Free tier: 2000 queries/month
- Privacy-focused
- Good quality
- https://brave.com/search/api/

**Option C: SerpAPI**
- Pay per query
- Easy integration
- Structured results
- https://serpapi.com/

**Option D: DuckDuckGo Instant Answer API**
- Free
- No API key needed
- Limited results
- Privacy-focused

### Step 2: Create Search Tool

```typescript
// src/core/tools/WebSearchTool.ts

export class WebSearchTool {
  async search(query: string, options?: {
    maxResults?: number;
    searchType?: 'news' | 'general' | 'images';
  }): Promise<SearchResult[]> {
    // Call chosen search API
    // Return structured results
  }
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  publishedDate?: string;
  source?: string;
}
```

### Step 3: Integrate with AI Flow

```typescript
// Detect search intent
if (needsWebSearch(userInput)) {
  // Call search tool
  const results = await webSearchTool.search(query);
  
  // Format results for AI
  const searchContext = formatSearchResults(results);
  
  // Add to prompt
  systemContext += `\n\nWEB SEARCH RESULTS:\n${searchContext}`;
  
  // Send to AI for summarization
  const response = await ai.generate(prompt + searchContext);
}
```

### Step 4: Update System Prompt

```typescript
systemContext += `
You have access to web search results when available.
When search results are provided, use them to answer the user's question.
Cite sources when using search results.
`;
```

## Quick Fix for Now

While we implement proper web search, let's add a helpful disclaimer:

### Update ExternalProviderAdapter

```typescript
// Detect queries that need live data but can't be fulfilled
const needsLiveData = /latest news|current news|breaking news|today's news/.test(userInput.toLowerCase());

if (needsLiveData) {
  systemContext += `\n\nNOTE: You do not have real-time web access. If the user is asking for current/live information you cannot provide, politely explain this limitation and suggest they use a web browser for real-time news.`;
}
```

This sets correct expectations until web search is implemented.

## Implementation Priority

### Phase 1: Quick Fix (5 minutes)
- ✅ Add disclaimer to system context
- ✅ Set correct user expectations
- ✅ Prevents confusion

### Phase 2: Basic Web Search (1-2 hours)
- Choose free API (DuckDuckGo or Brave)
- Implement basic search tool
- Integrate with AI flow
- Test with news queries

### Phase 3: Advanced Features (Future)
- Multiple search providers
- Image search
- News-specific search
- Caching results
- Source credibility scoring

## Example User Experience

### With Quick Fix (Phase 1):
```
User: "Give latest news"
AI: "I don't have real-time web access to fetch current news. 
     For the latest breaking news, I recommend visiting:
     - news.google.com
     - reuters.com
     - your preferred news website
     
     I can help with other tasks like coding, analysis, or 
     questions about known information!"
```

### With Web Search (Phase 2):
```
User: "Give latest news"
AI: "Here are today's top news stories:

     1. **[Headline 1]** - [Source]
        [Brief summary]
        
     2. **[Headline 2]** - [Source]
        [Brief summary]
        
     3. **[Headline 3]** - [Source]
        [Brief summary]
        
     Would you like more details on any of these stories?"
```

## Cost Analysis

### Free Options:
- DuckDuckGo: Free, unlimited (basic)
- Brave Search: 2000 queries/month free
- Google Custom Search: 100 queries/day free

### For 1000 users with ~5 searches/day:
- Total: 5,000 searches/day = 150,000/month
- Brave: $0 (within free tier)
- Google: ~$750/month
- SerpAPI: ~$1,500/month

**Recommendation**: Start with Brave Search API (free tier covers most usage).

## Decision Required

**Which approach do you want?**

1. **Quick Fix**: Add disclaimer (5 minutes) ⏱️
2. **Basic Search**: Implement Brave Search API (1-2 hours) 🔍
3. **Both**: Quick fix now, web search later 📅

Let me know and I'll implement it!

---

## Status

**Current**: Routing works, but Gemini can't actually fetch news  
**Issue**: LLM APIs don't have real-time web access  
**Solutions**: Web search tool OR expectation setting  
**Recommendation**: Phase 1 quick fix + Phase 2 web search
