# Test Web Search - Quick Guide

## 🚀 Quick Test (2 minutes)

### 1. Reload App
```
Press 'r' in Metro terminal
```

### 2. Test Query
```
Ask: "Give latest news"
```

### 3. Expected Logs
```
🔍 Query analysis: { needsExternal: true, ... }
🌐 Routing to external: Google Gemini
📅 [Google Gemini] Injecting system date/time: Friday, September 18, 2026
🔍 [Google Gemini] Detected web search query, performing search...
🔎 [Google Gemini] Extracted search query: "news"
🔍 [WebSearch] Searching for: "news"
📊 [WebSearch] Options: { maxResults: 5, searchType: "news" }
🌐 [WebSearch] Calling DDG Instant API...
✅ [WebSearch] Found 5 instant results
✅ [Google Gemini] Web search successful: 5 results found
```

### 4. Expected Response
```
AI should respond with:
- Real current news articles (not "I can't access...")
- Titles and summaries
- Source attributions (reuters.com, bbc.com, etc.)
- URLs or links
```

## ✅ Success Checklist

- [ ] AI responds with actual news (not limitation message)
- [ ] Multiple news stories provided (3-5 items)
- [ ] Sources are cited (website names)
- [ ] Logs show "✅ Web search successful"
- [ ] No errors in console

## 🧪 More Test Queries

### News
```
"Give latest news"
"What's happening today?"
"Current news"
"Breaking news"
```

### Search
```
"Search for quantum computing"
"Google SpaceX latest"
"Find information about React hooks"
"Look up climate change"
```

### Trending
```
"What's trending?"
"Trending topics today"
```

## ❌ Troubleshooting

### Issue: Still says "I can't access real-time data"
**Cause**: Web search detection didn't trigger  
**Fix**: Use explicit keywords like "latest", "search", "google"  
**Try**: "search for news" instead of "tell me news"

### Issue: No search results found
**Cause**: DuckDuckGo returned empty results  
**Fix**: Try a different query or more specific keywords  
**Try**: "latest AI news" instead of just "news"

### Issue: Network error
**Cause**: Internet connection or DuckDuckGo down  
**Fix**: Check internet connection, try again  
**Fallback**: AI will show limitation notice

### Issue: Logs don't show web search
**Cause**: Keywords not detected  
**Check**: Make sure query includes "search", "latest", "current", "google", etc.  
**Fix**: Use explicit search language

## 📊 What to Look For

### Successful Search
```
✅ [WebSearch] Found X instant results
✅ Web search successful: X results found
Response includes: Real articles with sources
```

### Failed Search
```
⚠️ [WebSearch] No results found
⚠️ Query requires live web data - limitation notice added
Response includes: "I can't access real-time data..."
```

## 🎯 Expected Behavior

| Query | Behavior | Result |
|-------|----------|--------|
| "Give latest news" | Web search | Real news ✅ |
| "Search for AI" | Web search | Search results ✅ |
| "What's happening" | Web search | Current events ✅ |
| "Hello" | No search | Local response ✅ |
| "What is AI?" | No search | Knowledge Q&A ✅ |

## ⏱️ Performance

- **Search**: 0.5-2 seconds
- **AI response**: 3-6 seconds total
- **Results**: 5 per query
- **Quality**: High (diverse sources)

## 🎉 Success!

If you see real news articles with sources, **web search is working!** 🌐✨

---

**Now go test it!** 🚀
