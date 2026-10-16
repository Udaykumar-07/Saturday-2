# Testing Automatic Retry and Fallback System

## Current Status
✅ Retry logic implemented in GoogleGeminiProvider.ts
✅ Metro bundler running on port 8081
✅ Fallback models configured: gemini-2.5-flash, gemini-flash-lite-latest, gemini-3.6-flash

## Testing Steps

### 1. Reload the App
In your Expo Go or emulator:
- **Android**: Shake device → "Reload"
- **iOS**: Cmd+R (simulator) or shake device → "Reload"
- **Metro terminal**: Press `r`

### 2. Navigate to Gemini Connection
1. Open Saturday AI app
2. Go to Settings → External AI Providers
3. Verify Google Gemini shows "Connected" with your API key

### 3. Test Query
Try one of these queries that previously failed with 503:
- "Search web on elon"
- "Tell me about quantum computing"
- "Explain machine learning"

### 4. Watch the Logs
In your Metro bundler terminal, look for these log patterns:

#### Success Case (no retries needed):
```
🤖 [Gemini] Using model: gemini-3.5-flash
📝 [Gemini] Input length: 42 chars
✅ [Gemini] Found 1 text chunks in response
✅ [Gemini] Generated response length: 2377 chars
```

#### Retry Case (503 error):
```
🤖 [Gemini] Using model: gemini-3.5-flash
📝 [Gemini] Input length: 42 chars
⚠️ [Gemini] Request failed (attempt 1/2): Response status: 503
⏳ [Gemini] Retry 1/2 after 2000ms delay...
⚠️ [Gemini] Request failed (attempt 2/2): Response status: 503
⏳ [Gemini] Retry 2/2 after 4000ms delay...
🔄 [Gemini] Trying fallback model: gemini-2.5-flash
✅ [Gemini] Generated response length: 1842 chars
```

#### All Models Failed:
```
❌ [Gemini] All models failed after 12 attempts
```

## What to Verify

### ✅ Expected Behaviors:
1. **Automatic retry** - No user intervention needed when 503 occurs
2. **Exponential backoff** - 2s, 4s delays between retries
3. **Model fallback** - Tries alternative models if primary fails
4. **Success recovery** - Eventually gets a response from one of the 4 models
5. **No duplicate errors** - Each failure logged only once per attempt

### ❌ Issues to Report:
1. **Immediate failure** - Error shown without retries
2. **Infinite retries** - Logs keep retrying beyond 12 attempts
3. **No fallback** - Doesn't try alternative models after primary fails
4. **Crashes** - App crashes during retry process

## Next Steps Based on Results

### If Working Perfectly:
- ✅ Feature complete!
- Optional: Add UI toast showing "Retrying..." during attempts
- Optional: Show which model successfully responded

### If Still Getting 503 Errors:
- Increase retry count from 2 to 3
- Add longer delays (4s, 8s, 16s)
- Add more fallback models

### If Takes Too Long:
- Reduce retry count from 2 to 1
- Shorten delays (1s, 2s instead of 2s, 4s)

## Testing Checklist
- [ ] Reload app in Metro bundler
- [ ] Navigate to chat/conversation
- [ ] Try query that previously failed
- [ ] Observe logs for retry behavior
- [ ] Verify response is eventually received
- [ ] Test model switching in Settings
- [ ] Try different queries to test consistency

## Quick Metro Commands
```bash
# In Metro terminal:
r  - Reload app
d  - Open developer menu
i  - Run on iOS simulator
a  - Run on Android emulator
```

---

**Last Updated**: After implementing automatic retry with exponential backoff
**Feature Status**: ✅ Ready for testing
