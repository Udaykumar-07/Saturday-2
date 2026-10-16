# Quick Start: Google Custom Search (2 minutes!)

## 🎉 You Already Have What You Need!

Your **Gemini API key works for Google Search too!**  
You only need to create a Search Engine ID (2 minutes).

---

## ✅ Super Quick Setup

### Step 1: Create Search Engine (2 minutes)
- [ ] Go to: https://programmablesearchengine.google.com/
- [ ] Click "Add" or "Get Started"
- [ ] Name: "Saturday AI Search"
- [ ] Sites to search: Select "Search the entire web" or enter `*`
- [ ] Click "Create"
- [ ] Copy Search Engine ID: `0123456789abcdef:ghi`
- [ ] Enable "Search the entire web" in settings (if not already)

### Step 2: Configure App (30 seconds)
- [ ] Open: `src/config/searchConfig.ts`
- [ ] Paste Search Engine ID in `searchEngineId: ''`
- [ ] Save file
- [ ] Reload app: Press `r` in Metro terminal

### Step 3: Verify (30 seconds)
- [ ] Check logs for: `✅ Configured Google Search with Gemini API key`
- [ ] Try query: "new tesla roadster"
- [ ] Verify response mentions "2028" (not 2026)
- [ ] Check logs for: `🌐 Using Google Custom Search (primary)`

---

## 🎯 One-Liner Setup

```typescript
// Edit: src/config/searchConfig.ts

export const searchConfig = {
  google: {
    // Your Gemini API key is used automatically! No separate key needed ✅
    searchEngineId: 'PASTE_YOUR_SEARCH_ENGINE_ID_HERE', // Only this needed!
    freeQuota: 100,
    enabled: true,
  },
};
```

Then press `r` in Metro terminal!

---

## 💡 Why So Simple?

**Gemini API Key = Google Cloud API Key**

Your existing Gemini API key works for:
- ✅ Gemini AI (what you use now)
- ✅ Google Custom Search (what we're adding)
- ✅ One key, many Google services!

---

## ✨ Expected Result

### Before
```
Query: "new tesla roadster"
Result: "Expected October 2026" ❌ (DuckDuckGo - outdated)
```

### After  
```
Query: "new tesla roadster"
Result: "Expected late 2028 or 2029" ✅ (Google - current!)
```

---

## 📱 Test Queries

Try these to verify quality:
- "new tesla roadster" → Should say 2028 ✅
- "latest iphone" → Should show current model ✅
- "nvidia rtx 5090" → Should show latest specs ✅
- "spacex starship" → Should show recent updates ✅

All should return accurate, current information!

---

## 🆘 Troubleshooting

**Still using DuckDuckGo?**
- Check Search Engine ID is filled in `searchConfig.ts`
- Reload app: Press `r`
- Verify Gemini is connected with API key

**403 Error?**
- Enable Custom Search API: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
- Click "Enable" (one-time)
- Wait 1-2 minutes

**Invalid Search Engine ID?**
- Check format: `xxxxxxxx:yyy`
- No extra spaces when copying
- Copy from: https://programmablesearchengine.google.com/

---

## 💰 Free Tier

- **100 searches per day**
- **No extra API key needed** (uses your Gemini key!)
- **No credit card needed**
- **Resets daily**
- **Automatic fallback to DuckDuckGo if exceeded**

---

## 🎯 What You Need

- ✅ Gemini API key ← You already have this!
- ✅ Search Engine ID ← Create in 2 minutes

## What You DON'T Need

- ❌ Separate Google Cloud API key
- ❌ Credit card
- ❌ Complex setup
- ❌ Code changes (just config)

---

**Total time: 2.5 minutes**  
**Cost: FREE**  
**Result: Gemini app-quality search!** 🎉
