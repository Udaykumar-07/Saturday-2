# Google Custom Search API Setup Guide

## 🎯 Why Google Custom Search?

**Current (DuckDuckGo):**
- ❌ Returns outdated information (Tesla Roadster 2026)
- ❌ Less comprehensive results
- ❌ No structured data

**With Google Custom Search:**
- ✅ Accurate, current information (Tesla Roadster 2028)
- ✅ Same quality as Gemini app
- ✅ Structured data with dates
- ✅ **100 searches/day FREE!**

---

## 📋 Setup Steps (15 minutes)

### Step 1: Get Google Cloud API Key (5 minutes)

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **Sign in** with your Google account

3. **Create a new project** (if you don't have one):
   - Click the project dropdown at the top
   - Click "New Project"
   - Name: "Saturday AI"
   - Click "Create"

4. **Enable Custom Search API:**
   ```
   https://console.cloud.google.com/apis/library/customsearch.googleapis.com
   ```
   - Click "Enable"

5. **Create API Key:**
   - Go back to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "API Key"
   - Copy the API key (looks like: `AIzaSyD...`)
   - **Save this key** - you'll need it in Step 3

6. **Optional: Restrict API Key** (recommended for security):
   - Click on your API key name
   - Under "API restrictions", select "Restrict key"
   - Choose "Custom Search API"
   - Click "Save"

### Step 2: Create Custom Search Engine (5 minutes)

1. **Go to Programmable Search Engine:**
   ```
   https://programmablesearchengine.google.com/
   ```

2. **Click "Add"** or "Get Started"

3. **Create your search engine:**
   - **Name**: "Saturday AI Search"
   - **Sites to search**: Enter `*` (this searches the entire web)
   - **Language**: English (or your preference)
   - **Search engine name**: "saturday-ai-search"

4. **Click "Create"**

5. **Get your Search Engine ID:**
   - After creation, you'll see "Your search engine has been created"
   - Click "Customize" or "Control Panel"
   - Look for "Search engine ID" (looks like: `0123456789abcdef:ghi`)
   - **Copy this ID** - you'll need it in Step 3

6. **Enable "Search the entire web":**
   - In the control panel, go to "Setup" → "Basics"
   - Enable "Search the entire web"
   - Click "Update"

### Step 3: Configure in Saturday AI (5 minutes)

#### Option A: Via Code (Permanent)

1. **Open the config file:**
   ```
   src/config/searchConfig.ts
   ```

2. **Add your credentials:**
   ```typescript
   export const searchConfig = {
     google: {
       apiKey: 'AIzaSyD...YOUR_API_KEY_HERE...',
       searchEngineId: '0123456789abcdef:ghi', // Your Search Engine ID
       freeQuota: 100,
       enabled: true,
     },
     // ...
   };
   ```

3. **Save the file**

4. **Reload the app:**
   ```
   Press 'r' in Metro terminal
   ```

#### Option B: Via Environment Variables (Recommended for Security)

1. **Create `.env` file** in project root:
   ```bash
   GOOGLE_SEARCH_API_KEY=AIzaSyD...YOUR_API_KEY_HERE...
   GOOGLE_SEARCH_ENGINE_ID=0123456789abcdef:ghi
   ```

2. **Add to `.gitignore`** (important!):
   ```bash
   echo ".env" >> .gitignore
   ```

3. **Install react-native-config** (if not already):
   ```bash
   npm install react-native-config
   ```

4. **Reload the app:**
   ```bash
   Press 'r' in Metro terminal
   ```

---

## ✅ Verification

### Test That It's Working

1. **Reload app**: Press `r` in Metro terminal

2. **Check logs for:**
   ```
   ✅ [ExternalProviderAdapter] Google Custom Search configured and ready
   ```

3. **Try a search:**
   ```
   User: "new tesla roadster"
   ```

4. **Check logs for:**
   ```
   🌐 [WebSearch] Using Google Custom Search (primary)...
   🔍 [GoogleSearch] Searching for: "new tesla roadster"
   ✅ [GoogleSearch] Found 5 results
   📄 [GoogleSearch] Top result: "Tesla Roadster" from tesla.com
   ```

5. **Verify response quality:**
   - Should mention **2028** (not 2026)
   - Should have accurate, current information
   - Should cite quality sources (tesla.com, motortrend.com, etc.)

### If Not Working

**Check logs for:**
```
ℹ️ [WebSearch] Google Custom Search not configured, using DuckDuckGo
```

**This means:**
- API key or Search Engine ID not set correctly
- Check `src/config/searchConfig.ts`
- Make sure both values are filled in
- Reload app after changes

**Common Issues:**

1. **"403 Forbidden"**
   - API key is invalid
   - Custom Search API not enabled
   - Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
   - Click "Enable"

2. **"API key not authorized"**
   - API restrictions too strict
   - Go to API key settings
   - Under "API restrictions", select "Custom Search API"

3. **"Search engine ID invalid"**
   - Wrong Search Engine ID copied
   - Go to: https://programmablesearchengine.google.com/
   - Click your search engine
   - Copy the correct ID (format: `xxxxxxx:yyy`)

---

## 📊 Usage Limits

### Free Tier
- **100 queries per day**
- **No credit card required**
- **Resets daily**

### Monitoring Usage

Check your usage:
```
https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas
```

### If You Exceed Free Tier

**Symptoms:**
- Logs show: "Google Search API rate limit exceeded"
- Automatic fallback to DuckDuckGo

**Solutions:**

1. **Wait until tomorrow** (quota resets daily)

2. **Upgrade to paid tier:**
   - $5 per 1000 additional queries
   - Go to: https://console.cloud.google.com/billing
   - Enable billing for your project

3. **Optimize usage:**
   - Only use for queries that truly need web search
   - Use local model for follow-up questions
   - Add caching (future feature)

---

## 🔒 Security Best Practices

### Protect Your API Key

1. **Never commit API keys to git:**
   ```bash
   # Add to .gitignore
   .env
   src/config/searchConfig.ts
   ```

2. **Use environment variables:**
   - Store keys in `.env` file
   - Use `react-native-config` to load them

3. **Restrict API key:**
   - In Google Cloud Console
   - Add API restrictions (Custom Search API only)
   - Add application restrictions (optional)

4. **Rotate keys regularly:**
   - Create new key every 3-6 months
   - Delete old keys

---

## 🎉 Benefits You'll See

### Before (DuckDuckGo)
```
Query: "new tesla roadster"
Result: "Expected release: October 2026" ❌
Sources: Outdated articles
Quality: Medium
```

### After (Google Custom Search)
```
Query: "new tesla roadster"  
Result: "Expected release: Late 2028 or early 2029" ✅
Sources: Tesla.com, Electrek, Motor Trend
Quality: Excellent - Same as Gemini app!
```

### Other Improvements
- ✅ More accurate dates
- ✅ Better source quality
- ✅ Structured data (publish dates)
- ✅ Recent articles prioritized
- ✅ Knowledge Graph integration

---

## 📱 Testing Checklist

After setup, test these queries:

- [ ] "new tesla roadster" → Should say 2028
- [ ] "latest iphone" → Should show iPhone 16 or current model
- [ ] "when is next spacex launch" → Should show current schedule
- [ ] "nvidia rtx 5090 specs" → Should show latest GPU info
- [ ] "search it" → Should work with context

**All queries should return current, accurate information!**

---

## 🆘 Need Help?

### Resources
- **Google Custom Search Docs**: https://developers.google.com/custom-search
- **API Console**: https://console.cloud.google.com/
- **Search Engine Manager**: https://programmablesearchengine.google.com/

### Common Questions

**Q: Is this really free?**
A: Yes! 100 queries/day is free forever. No credit card required.

**Q: Can I use my existing Google account?**
A: Yes! Any Google account works.

**Q: Will this slow down my app?**
A: No! Google Custom Search is actually faster than DuckDuckGo (~500ms vs ~2000ms).

**Q: What if I exceed 100 queries/day?**
A: App automatically falls back to DuckDuckGo. No errors or crashes.

**Q: Is my search data private?**
A: Google logs queries (per their privacy policy). For privacy, use DuckDuckGo by setting `enabled: false` in config.

---

## 🚀 You're Ready!

Once you've completed these steps:
1. ✅ Google Custom Search configured
2. ✅ App reloaded
3. ✅ Verified in logs

**Test it now:**
```
"new tesla roadster"
```

**You should get accurate 2028 information!** 🎉
