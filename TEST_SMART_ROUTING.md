# Testing Smart Routing

## Quick Test Plan

### Setup
1. Reload app in Metro: Press `r` in terminal or shake device → "Reload"
2. Ensure Gemini is connected in Settings → External AI Providers
3. Verify local model is available (check Settings → AI Models)

### Test Cases

#### ✅ Test 1: Local Model - Casual Greeting
**Input:** `"Hello!"`  
**Expected:** Local model  
**Log to look for:** `🏠 Routing to local: Query can be handled by local model efficiently`

---

#### ✅ Test 2: Local Model - Basic Question
**Input:** `"What is machine learning?"`  
**Expected:** Local model  
**Log to look for:** `prefersLocal: true`

---

#### ✅ Test 3: Local Model - Code Request
**Input:** `"Write a function to calculate factorial"`  
**Expected:** Local model  
**Log to look for:** `🏠 Routing to local`

---

#### ✅ Test 4: External Model - Web Search
**Input:** `"Search web on Elon Musk"`  
**Expected:** Gemini  
**Log to look for:** `🌐 Routing to external: Google Gemini (query needs internet/current info)`

---

#### ✅ Test 5: External Model - Current Events
**Input:** `"What's the latest AI news?"`  
**Expected:** Gemini  
**Log to look for:** `needsExternal: true`

---

#### ✅ Test 6: External Model - Real-time Data
**Input:** `"Current weather in New York"`  
**Expected:** Gemini  
**Log to look for:** `🌐 Routing to external`

---

#### ✅ Test 7: Local Model - Math
**Input:** `"Calculate 25 * 16"`  
**Expected:** Local model  
**Log to look for:** `prefersLocal: true`

---

#### ✅ Test 8: Local Model - Explanation
**Input:** `"Explain how recursion works"`  
**Expected:** Local model  
**Log to look for:** `🏠 Routing to local`

---

## What to Look For in Logs

### Query Analysis Log
```
🔍 Query analysis: {
  needsExternal: false,    // <-- Should be true for web search/current info
  prefersLocal: true,      // <-- Should be true for basic Q&A/coding
  localAvailable: true,    // <-- Is local model ready?
  externalCount: 1,        // <-- Number of external providers connected
  queryPreview: 'hello'    // <-- First 50 chars of query
}
```

### Routing Decision Log
```
// Local routing:
🏠 Routing to local: Query can be handled by local model efficiently.
🎯 Routing decision: local

// External routing:
🌐 Routing to external: Google Gemini (query needs internet/current info)
🎯 Routing decision: google_gemini_provider
```

### Provider Usage Log
```
// Using local model:
🤖 [Local] Processing request with Qwen model

// Using Gemini:
🔑 [Gemini] API key found (length: XX)
🤖 [Gemini] Using model: gemini-3.5-flash
```

## Expected Results

### Before Smart Routing (Old Behavior)
❌ Every query went to Gemini once connected  
❌ "Hello" → Gemini (wasteful)  
❌ "What is AI?" → Gemini (unnecessary)  
❌ "Write code" → Gemini (slower)

### After Smart Routing (New Behavior)
✅ Casual chat → Local (fast)  
✅ Basic Q&A → Local (efficient)  
✅ Coding help → Local (private)  
✅ Web search → Gemini (capable)  
✅ Current events → Gemini (accurate)

## Success Criteria

1. **Local queries stay local** - At least 70% of basic queries use local model
2. **External when needed** - Web search always uses external
3. **No false negatives** - Current info requests never go to local
4. **Fast response** - Local queries respond in <1 second
5. **Cost savings** - Significant reduction in API calls

## Troubleshooting

### Issue: All queries go to Gemini
**Fix:** Check if local model is loaded
```
Settings → AI Models → Verify model is "Ready"
```

### Issue: Web search uses local model
**Fix:** Keywords might not be detected, try:
- "Search for X" (instead of just "find X")
- "Latest news" (instead of "news")
- "Google X" (explicit search intent)

### Issue: Routing logs not showing
**Fix:** Check console logging is enabled
```
Metro bundler should show all logs
If not visible, try: adb logcat | grep -E "(Gemini|Local|Routing)"
```

## Verification Checklist

- [ ] Greeted bot → Used local model
- [ ] Asked basic question → Used local model  
- [ ] Requested code → Used local model
- [ ] Asked for web search → Used Gemini
- [ ] Asked for current news → Used Gemini
- [ ] Asked for weather → Used Gemini
- [ ] Logs show query analysis
- [ ] Routing decisions make sense
- [ ] Response quality is good
- [ ] No unnecessary API calls

## Performance Comparison

### Measure These Metrics:

1. **Response Time**
   - Local queries: Should be <1 second
   - External queries: 2-5 seconds acceptable

2. **API Usage**
   - Before: 100% of queries hit API
   - After: ~30% of queries hit API (70% reduction)

3. **User Experience**
   - Casual chat feels instant (local)
   - Web search is accurate (external)
   - No wrong routing decisions

---

**Status**: Ready to test  
**Time needed**: 5-10 minutes  
**Difficulty**: Easy - just chat normally and watch logs
