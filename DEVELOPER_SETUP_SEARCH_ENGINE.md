# Developer Setup: Create Shared Search Engine (One-Time)

## 🎯 Goal

Create **one Search Engine ID** that all Saturday AI users can share.  
You do this once, users never need to.

---

## ⏱️ Time Required

**2-3 minutes** (one-time setup)

---

## 📋 Step-by-Step

### Step 1: Go to Programmable Search Engine

**URL**: https://programmablesearchengine.google.com/

- Sign in with your Google account (developer account)

### Step 2: Create New Search Engine

1. Click **"Add"** or **"Get Started"**

2. Fill in the form:
   ```
   Name: Saturday AI Web Search
   
   What to search:
   ○ Search the entire web
   
   (Or if that option not visible, enter: *)
   ```

3. Click **"Create"**

### Step 3: Configure Search Engine

After creation, you'll see the control panel:

1. Go to **"Setup"** → **"Basics"**

2. Ensure these settings:
   ```
   ✅ Search the entire web: ON
   ✅ Image search: ON (optional)
   ✅ SafeSearch: OFF (or your preference)
   ```

3. Click **"Update"**

### Step 4: Get Search Engine ID

1. In the control panel, look for **"Search engine ID"**

2. It looks like: `e4d8e8a5f11a44b29` (example format)

3. **Copy this ID**

### Step 5: Update Code

1. Open: `src/config/searchConfig.ts`

2. Replace the Search Engine ID:
   ```typescript
   export const searchConfig = {
     google: {
       searchEngineId: 'YOUR_REAL_ID_HERE', // ← Paste here
       freeQuota: 100,
       enabled: true,
     },
   };
   ```

3. **Save the file**

4. **Commit to repository**

### Step 6: Verify

1. Reload your app

2. Check logs:
   ```
   ✅ [ExternalProviderAdapter] Configured Google Search with Gemini API key
   🌐 [WebSearch] Using Google Custom Search (primary)...
   ```

3. Test query: "test search"

4. Should work! ✅

---

## 🔒 Security Notes

### Is It Safe to Commit Search Engine ID?

**Yes!** ✅

- Search Engine ID is **not a secret**
- It's just a configuration pointer
- Similar to a public API endpoint
- Users' API keys remain private

### What's Private?
- ❌ Search Engine ID (public, shareable)
- ✅ User's Gemini API key (private, never committed)

### Analogy
```
Search Engine ID = Restaurant address (public)
User API Key = Credit card (private)

Everyone knows the restaurant address ✅
But each person pays with their own card ✅
```

---

## 📊 How This Scales

### One Search Engine for All Users

```
You (Developer):
  ├─ Create Search Engine (one-time)
  ├─ Get Search Engine ID: abc123
  └─ Commit to code

User A:
  ├─ Enters their Gemini API key: KEY_A
  ├─ Search uses: KEY_A + abc123
  └─ Charges to User A's quota

User B:
  ├─ Enters their Gemini API key: KEY_B
  ├─ Search uses: KEY_B + abc123
  └─ Charges to User B's quota

User C, D, E, ... ∞
  ├─ All use the same Search Engine ID
  └─ Each has separate API key & quota
```

### No Shared Bottleneck
- Each user: 100 searches/day
- Total capacity: Unlimited (scales per user)
- No single point of failure

---

## 💰 Cost

### For You (Developer)
```
Creating Search Engine: FREE
Maintaining it: FREE
No ongoing costs ✅
```

### For Users
```
Each user: 100 free searches/day
Over 100: $5 per 1000 additional
Most users stay in free tier ✅
```

---

## 🎯 Alternative Approaches

### Option 1: Shared Search Engine (Recommended) ✅
- **Setup**: Once by you (2 minutes)
- **User setup**: Zero
- **Scalability**: Unlimited
- **User experience**: Seamless

### Option 2: Per-User Search Engines
- **Setup**: Every user must do it
- **User setup**: 2-5 minutes each
- **Scalability**: Unlimited but friction
- **User experience**: Extra setup step

### Option 3: Server-Side Proxy
- **Setup**: Complex backend required
- **User setup**: Zero
- **Scalability**: Your server handles it
- **User experience**: Seamless but you pay costs

**Chosen**: Option 1 (best balance)

---

## 🔧 Maintenance

### Do You Need to Update It?

**No!** Once created, it works indefinitely.

### When Would You Update?

Only if:
- You want to change search settings
- Google deprecates the ID (very rare)
- You want multiple Search Engines for A/B testing

### Monitoring

Check in Google Programmable Search Engine dashboard:
- https://programmablesearchengine.google.com/

You'll see:
- Total queries (all users combined)
- Popular search terms
- Performance metrics

---

## ✅ Checklist

Developer one-time setup:

- [ ] Go to https://programmablesearchengine.google.com/
- [ ] Create Search Engine "Saturday AI Web Search"
- [ ] Enable "Search the entire web"
- [ ] Copy Search Engine ID
- [ ] Paste in `src/config/searchConfig.ts`
- [ ] Save and commit
- [ ] Test with your own Gemini API key
- [ ] Verify searches work

User setup (after your setup):
- [ ] User connects Gemini
- [ ] Search automatically works ✅

---

## 🆘 Troubleshooting

### Can't Create Search Engine

**Try**:
1. Use a different Google account
2. Clear browser cache
3. Try incognito mode
4. Use this direct link: https://programmablesearchengine.google.com/controlpanel/create

### "Invalid Search Engine" Error

**Check**:
1. Search Engine ID format (no spaces, correct length)
2. Copy the full ID including colons
3. Format: `xxxxxxxx:yyy` or similar

### Users Getting 403 Errors

**Solution**: Add helpful error message:
```typescript
if (error.status === 403) {
  return `To enable web search, visit:
  https://console.cloud.google.com/apis/library/customsearch.googleapis.com
  and click 'Enable' (one-time, takes 1 minute)`;
}
```

---

## 📚 Resources

- **Create Search Engine**: https://programmablesearchengine.google.com/
- **API Documentation**: https://developers.google.com/custom-search
- **Enable API**: https://console.cloud.google.com/apis/library/customsearch.googleapis.com

---

## 🎉 Summary

### Your One-Time Setup (2 minutes)
1. Create Search Engine
2. Copy ID
3. Paste in code
4. Commit

### Users' Setup (0 minutes)
1. Connect Gemini
2. Search works! ✅

**Total user friction**: Zero! 🎉

---

**Ready?** Create your Search Engine now and paste the ID in `searchConfig.ts`!
