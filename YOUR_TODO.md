# Your To-Do: Enable Web Search (2 Minutes)

## ✅ Quick Checklist

You only need to do this **once**. After that, all users get web search automatically!

### Step 1: Create Search Engine (90 seconds)

1. **Go to**: https://programmablesearchengine.google.com/

2. **Click**: "Add" or "Get Started"

3. **Fill in**:
   - Name: `Saturday AI Web Search`
   - What to search: Select **"Search the entire web"**

4. **Click**: "Create"

5. **Copy** the Search Engine ID
   - Format: `e4d8e8a5f11a44b29` (example)
   - Will be shown after creation

### Step 2: Update Config (30 seconds)

1. **Open**: `src/config/searchConfig.ts`

2. **Replace** this line:
   ```typescript
   searchEngineId: 'e4d8e8a5f11a44b29', // ← REPLACE WITH YOUR ID
   ```

3. **Save** the file

### Step 3: Test (30 seconds)

1. **Reload** app: Press `r` in Metro

2. **Try** query: "new tesla roadster"

3. **Check** logs for:
   ```
   ✅ Configured Google Search with Gemini API key
   🌐 Using Google Custom Search (primary)...
   ✅ Found 5 results
   ```

4. **Verify** response mentions "2028" ✅

### Step 4: Commit (30 seconds)

1. **Commit** the config file:
   ```bash
   git add src/config/searchConfig.ts
   git commit -m "Add shared Google Search Engine ID"
   git push
   ```

2. **Done!** ✅

---

## 🎯 That's It!

After these 2 minutes:
- ✅ All users get web search automatically
- ✅ No per-user setup required
- ✅ Just works when they connect Gemini
- ✅ Zero friction for users

---

## 📝 Notes

### Search Engine ID Is Not Secret
- It's just a configuration pointer
- Safe to commit to git
- Users bring their own API keys
- Each user has separate billing/quota

### If You Get Stuck
- See: `DEVELOPER_SETUP_SEARCH_ENGINE.md`
- Or use DuckDuckGo fallback (already works)

---

**Time**: 2 minutes  
**Difficulty**: Easy  
**Result**: All users get Gemini-quality search! 🎉
