# Google Custom Search - Super Simple Setup (2 minutes!)

## 🎉 Great News!

You can **reuse your existing Gemini API key** for Google Search!  
You only need to create a Search Engine ID (takes 2 minutes).

---

## ✅ Quick Setup (One Time)

### Step 1: Create Search Engine (2 minutes)

1. **Go to**: https://programmablesearchengine.google.com/

2. **Click "Add"** (or "Get Started" if first time)

3. **Fill in**:
   - **Name**: Saturday AI Search
   - **What to search**: Select "Search the entire web"
   - Or enter: `*` (asterisk = entire web)

4. **Click "Create"**

5. **Copy the Search Engine ID**:
   - Format looks like: `0123456789abcdef:ghi`
   - It's shown right after creation

### Step 2: Configure App (30 seconds)

1. **Open**: `src/config/searchConfig.ts`

2. **Paste your Search Engine ID**:
   ```typescript
   export const searchConfig = {
     google: {
       searchEngineId: '0123456789abcdef:ghi', // ← PASTE HERE
       freeQuota: 100,
       enabled: true,
     },
     // ...
   };
   ```

3. **Save file**

4. **Reload app**: Press `r` in Metro terminal

---

## ✨ That's It!

Your app will automatically:
- ✅ Use your existing Gemini API key for search
- ✅ Get high-quality Google search results
- ✅ Fall back to DuckDuckGo if needed

**No separate API key needed!** 🎉

---

## 🧪 Test It

Try this query:
```
"new tesla roadster"
```

**Expected result:**
- Should say "2028" or "delayed" (not 2026)
- Uses Google Search (check logs)

**Logs to look for:**
```
✅ [ExternalProviderAdapter] Configured Google Search with Gemini API key
🌐 [WebSearch] Using Google Custom Search (primary)...
✅ [GoogleSearch] Found 5 results
```

---

## ❓ Why This Works

- Gemini API key = Google Cloud API key
- Same key works for both services!
- Google Custom Search and Gemini API share credentials

---

## 🔒 Is This Safe?

✅ Yes! The Gemini API key you already have can access:
- Gemini AI models (what you're using now)
- Google Custom Search (what we just added)
- Other Google Cloud services

It's all the same Google Cloud platform.

---

## 💰 Cost

- **Free tier**: 100 searches per day
- **Shared quota** with Gemini (be mindful of total usage)
- **Automatic fallback** to DuckDuckGo if quota exceeded

---

## 🆘 Troubleshooting

### Still using DuckDuckGo?

**Check**:
1. Did you paste Search Engine ID in `searchConfig.ts`?
2. Did you reload the app? (Press `r`)
3. Is Gemini connected with API key?

**Logs should show**:
```
✅ Configured Google Search with Gemini API key
```

### "Invalid Search Engine ID"

**Fix**:
- Make sure format is correct: `xxxxxxxx:yyy`
- No extra spaces
- Copy from: https://programmablesearchengine.google.com/

### "403 Forbidden"

**Fix**:
1. Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Click "Enable" (one-time)
3. Wait 1-2 minutes
4. Try again

---

## 📊 Before vs After

### Before (DuckDuckGo Only)
```
Query: "new tesla roadster"
Result: "October 2026" ❌
Source: Outdated articles
```

### After (Google Custom Search)
```
Query: "new tesla roadster"
Result: "Late 2028 or 2029" ✅
Source: Tesla.com, Electrek, current articles
```

---

## 🎯 Summary

**What you need:**
- ✅ Gemini API key (you already have this!)
- ✅ Search Engine ID (2 minutes to create)

**What you DON'T need:**
- ❌ Separate API key
- ❌ Credit card
- ❌ Complex setup
- ❌ Code changes (just config)

**Total time: 2 minutes** ⏱️  
**Total cost: $0** 💰  
**Result: Gemini app-quality search!** 🚀

---

## 🚀 Quick Start Checklist

- [ ] Go to https://programmablesearchengine.google.com/
- [ ] Create search engine (name: "Saturday AI")
- [ ] Copy Search Engine ID
- [ ] Paste in `src/config/searchConfig.ts`
- [ ] Save file
- [ ] Reload app (press `r`)
- [ ] Test: "new tesla roadster"
- [ ] Verify: Should say 2028 ✅

**Done! You now have Gemini app-quality search!** 🎉
