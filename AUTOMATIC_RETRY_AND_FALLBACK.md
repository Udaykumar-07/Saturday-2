# Automatic Retry and Model Fallback

## Feature Added
Automatic retry with exponential backoff and fallback to alternative models when encountering 503 (high demand) or 429 (rate limit) errors.

## How It Works

### 1. Retry Strategy
When a model returns 503 or 429:
- **Retry 1**: Wait 2 seconds, try again
- **Retry 2**: Wait 4 seconds, try again
- **Retry 3**: Give up on this model, try fallback

### 2. Fallback Models
If primary model fails after retries, automatically tries:
1. **gemini-2.5-flash** (newer, stable)
2. **gemini-flash-lite-latest** (faster, lighter)
3. **gemini-3.6-flash** (newer version)

### 3. Smart Error Detection
- **503 (High Demand)**: Retry with backoff → Fallback models
- **429 (Rate Limit)**: Retry with backoff → Fallback models
- **401/403 (Auth Error)**: Fail immediately (no retry)
- **400 (Bad Request)**: Fail immediately (no retry)
- **Network Error**: Retry → Fallback models

## Example Flow

### Scenario: User asks "Search web on elon"

```
🤖 [Gemini] Using model: gemini-3.5-flash
📤 [Gemini] Sending request...
📥 [Gemini] Response status: 503
⚠️ [Gemini] Google Gemini API server error (503 - high demand), will retry...

⏳ [Gemini] Retry 1/2 after 2000ms delay...
📤 [Gemini] Sending request...
📥 [Gemini] Response status: 503
⚠️ [Gemini] Google Gemini API server error (503 - high demand), will retry...

⏳ [Gemini] Retry 2/2 after 4000ms delay...
📤 [Gemini] Sending request...
📥 [Gemini] Response status: 503
⚠️ [Gemini] Max retries reached for gemini-3.5-flash, trying next model...

🔄 [Gemini] Trying fallback model: gemini-2.5-flash
📤 [Gemini] Sending request...
📥 [Gemini] Response status: 200
✅ [Gemini] Generated response length: 2377 chars
✅ Success!
```

## Benefits

1. **Automatic Recovery**: No user intervention needed
2. **Better Success Rate**: 4-5 attempts across multiple models
3. **Smart Delays**: Exponential backoff prevents hammering the API
4. **Transparent**: User doesn't see retries, just gets response
5. **Fast When Available**: No delay for successful first attempt

## User Experience

**Before (without retry):**
```
User: "Search web on elon"
Bot: "I'm having trouble processing that right now."
(User has to manually retry)
```

**After (with retry & fallback):**
```
User: "Search web on elon"
(System tries gemini-3.5-flash → 503)
(System retries after 2s → 503)
(System retries after 4s → 503)
(System tries gemini-2.5-flash → 200 ✅)
Bot: "Here is a summary of the latest developments regarding Elon Musk..."
(User gets response automatically!)
```

## Configuration

### Retry Settings
```typescript
const maxRetries = 2;  // Number of retries per model
// Delays: 2s, 4s (exponential: 2^attempt * 1000ms)
```

### Fallback Models (in order)
```typescript
const fallbackModels = [
  'gemini-2.5-flash',        // Newer, usually more available
  'gemini-flash-lite-latest', // Faster, lighter load
  'gemini-3.6-flash',        // Newer version
];
```

### Total Attempts
- Primary model: 3 attempts (initial + 2 retries)
- Fallback 1: 3 attempts
- Fallback 2: 3 attempts
- Fallback 3: 3 attempts
- **Total: Up to 12 attempts** before giving up

## When It Gives Up

If all models and retries fail:
```
❌ [Gemini] All models and retries exhausted
Returns fallback response: "I'm having trouble processing that right now."
```

This is extremely rare - would require all 4 models to be unavailable simultaneously.

## Testing

**Reload the app:**
```powershell
# Press 'r' in Metro terminal
```

**Try the same query that failed:**
```
User: "Search web on elon"
```

You should now see:
- Automatic retries if 503 occurs
- Fallback to alternative models
- Eventually get a successful response

## Performance Impact

**Best case** (model available immediately):
- No delay
- Same as before

**Worst case** (all retries + fallbacks):
- 2s + 4s + 2s + 4s + 2s + 4s = ~18s total
- Still faster than user manually retrying

**Typical case** (1-2 retries):
- 2-6 seconds extra
- User gets response instead of error

## Customization

### Change Retry Count
```typescript
const maxRetries = 3;  // Try 4 times total per model
```

### Change Delay
```typescript
const delay = Math.pow(2, attempt) * 500;  // Faster: 1s, 2s, 4s
const delay = Math.pow(2, attempt) * 2000; // Slower: 4s, 8s, 16s
```

### Change Fallback Models
```typescript
const fallbackModels = [
  'gemini-2.5-pro',          // More powerful
  'gemini-flash-lite-latest', // Lighter
];
```

### Disable Fallback (Retry Only)
```typescript
const fallbackModels = [];  // Only retry primary model
```

## Monitoring

Watch the logs to see retry behavior:
```
⏳ [Gemini] Retry 1/2 after 2000ms delay...
🔄 [Gemini] Trying fallback model: gemini-2.5-flash
✅ [Gemini] Generated response length: 2377 chars
```

## Future Enhancements

1. **Circuit Breaker**: Stop trying model for 5 min after multiple failures
2. **Health Tracking**: Remember which models are currently unavailable
3. **User Notification**: Show "Retrying..." message in UI
4. **Metrics**: Track retry success rates per model
5. **Smart Fallback Order**: Prioritize models with best recent success rate
